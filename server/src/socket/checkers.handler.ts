import type { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@genius/shared';
import {
  createCheckersGame,
  applyCheckersMove,
  computeAiMove,
  serializeBoard,
  checkersGames,
  type CheckersDifficulty,
  type CheckersGameState,
} from '../checkers/checkers.service';
import type { Color, CheckersMove } from '../checkers/checkers.engine';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { calculateElo } from '../modules/ratings/elo.service';

type CheckersServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type CheckersSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

const checkersQueue = new Map<string, { socket: CheckersSocket; rating: number; joinedAt: number }>();

function emitState(io: CheckersServer, gameId: string) {
  const state = checkersGames.get(gameId);
  if (!state) return;
  io.to(`checkers:${gameId}`).emit('checkers:state', serializeBoard(state));
}

async function finalizeCheckersGame(
  state: CheckersGameState,
  winner: Color | 'draw',
  endReason: 'resign' | 'disconnect' | 'normal' = 'normal',
): Promise<void> {
  try {
    const dbResult = winner === 'white' ? 'WHITE_WIN' : winner === 'black' ? 'BLACK_WIN' : 'DRAW';
    const dbReason = endReason === 'resign' || endReason === 'disconnect'
      ? 'RESIGN'
      : winner === 'draw'
      ? 'FIFTY_MOVE_RULE'
      : 'CHECKMATE';

    if (state.isAiGame) {
      const humanColor: Color = state.players.white !== 'AI' ? 'white' : 'black';
      const humanId = humanColor === 'white' ? state.players.white : state.players.black;
      if (!humanId || humanId === 'AI') return;
      const difficulty = state.difficulty ?? 'easy';
      const humanWon = winner === humanColor;
      const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
      await Promise.all([
        prisma.user.update({
          where: { id: humanId },
          data: {
            [`checkersAi${cap(difficulty)}Played`]: { increment: 1 },
            ...(humanWon ? { [`checkersAi${cap(difficulty)}Wins`]: { increment: 1 } } : {}),
          },
        }),
        prisma.game.create({
          data: {
            gameType: 'CHECKERS',
            isAiGame: true,
            aiLevel: difficulty.toUpperCase() as 'EASY' | 'MEDIUM' | 'HARD',
            whitePlayerId: humanColor === 'white' ? humanId : null,
            blackPlayerId: humanColor === 'black' ? humanId : null,
            result: dbResult,
            resultReason: dbReason,
            endedAt: new Date(),
          },
        }),
      ]);
      return;
    }

    const whiteId = state.players.white;
    const blackId = state.players.black;
    if (!whiteId || !blackId) return;

    const [whiteUser, blackUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: whiteId }, select: { checkersElo: true } }),
      prisma.user.findUnique({ where: { id: blackId }, select: { checkersElo: true } }),
    ]);
    if (!whiteUser || !blackUser) return;

    const elo = calculateElo(whiteUser.checkersElo, blackUser.checkersElo, winner);
    await Promise.all([
      prisma.user.update({
        where: { id: whiteId },
        data: {
          checkersElo: elo.whiteRatingAfter,
          gamesPlayed: { increment: 1 },
          ...(winner === 'white'
            ? { gamesWon: { increment: 1 } }
            : winner === 'draw'
            ? { gamesDrawn: { increment: 1 } }
            : { gamesLost: { increment: 1 } }),
        },
      }),
      prisma.user.update({
        where: { id: blackId },
        data: {
          checkersElo: elo.blackRatingAfter,
          gamesPlayed: { increment: 1 },
          ...(winner === 'black'
            ? { gamesWon: { increment: 1 } }
            : winner === 'draw'
            ? { gamesDrawn: { increment: 1 } }
            : { gamesLost: { increment: 1 } }),
        },
      }),
      prisma.game.create({
        data: {
          gameType: 'CHECKERS',
          isAiGame: false,
          whitePlayerId: whiteId,
          blackPlayerId: blackId,
          result: dbResult,
          resultReason: dbReason,
          whiteRatingBefore: whiteUser.checkersElo,
          blackRatingBefore: blackUser.checkersElo,
          whiteRatingAfter: elo.whiteRatingAfter,
          blackRatingAfter: elo.blackRatingAfter,
          endedAt: new Date(),
        },
      }),
    ]);
  } catch (err) {
    logger.error('finalizeCheckersGame error', { err, gameId: state.gameId });
  }
}

export function registerCheckersHandlers(io: CheckersServer, socket: CheckersSocket): void {
  const { userId, rating } = socket.data;

  // ── Start AI game ──────────────────────────────────────────────────────
  socket.on('checkers:startAi', async ({ difficulty, color }: { difficulty: CheckersDifficulty; color: Color }) => {
    try {
      const gameId = uuidv4();
      const humanColor: Color = color ?? 'white';
      const state = createCheckersGame(gameId, userId, humanColor, true, difficulty);
      await socket.join(`checkers:${gameId}`);

      socket.emit('checkers:started', {
        gameId,
        playerColor: humanColor,
        state: serializeBoard(state),
      });

      logger.info('Checkers AI game started', { gameId, userId, difficulty, humanColor });

      if (state.turn !== humanColor && !state.isOver) {
        void computeAiMove(gameId, (updatedState) => {
          emitState(io, gameId);
          if (updatedState.isOver) {
            const w = updatedState.winner!;
            io.to(`checkers:${gameId}`).emit('checkers:over', { winner: w });
            void finalizeCheckersGame(updatedState, w);
            checkersGames.delete(gameId);
          }
        });
      }
    } catch (err) {
      logger.error('checkers:startAi error', { err, userId });
    }
  });

  // ── Make a move ────────────────────────────────────────────────────────
  socket.on('checkers:move', async ({ gameId, move }: { gameId: string; move: CheckersMove }) => {
    try {
      const game = checkersGames.get(gameId);
      if (!game || game.isOver) return;

      const isWhite = game.players.white === userId;
      const isBlack = game.players.black === userId;
      if (!isWhite && !isBlack) return;
      if (isWhite && game.turn !== 'white') return;
      if (isBlack && game.turn !== 'black') return;

      const updatedState = applyCheckersMove(gameId, move);
      if (!updatedState) {
        socket.emit('checkers:error', { message: 'Invalid move' });
        return;
      }

      emitState(io, gameId);

      if (updatedState.isOver) {
        const w = updatedState.winner!;
        io.to(`checkers:${gameId}`).emit('checkers:over', { winner: w });
        void finalizeCheckersGame(updatedState, w);
        checkersGames.delete(gameId);
        return;
      }

      if (updatedState.isAiGame) {
        void computeAiMove(gameId, (aiState) => {
          emitState(io, gameId);
          if (aiState.isOver) {
            const w = aiState.winner!;
            io.to(`checkers:${gameId}`).emit('checkers:over', { winner: w });
            void finalizeCheckersGame(aiState, w);
            checkersGames.delete(gameId);
          }
        });
      }
    } catch (err) {
      logger.error('checkers:move error', { err, userId });
    }
  });

  // ── Resign ─────────────────────────────────────────────────────────────
  socket.on('checkers:resign', ({ gameId }: { gameId: string }) => {
    const game = checkersGames.get(gameId);
    if (!game || game.isOver) return;

    const isWhite = game.players.white === userId;
    const isBlack = game.players.black === userId;
    if (!isWhite && !isBlack) return;

    const winner: Color = isWhite ? 'black' : 'white';
    game.isOver = true;
    game.winner = winner;

    io.to(`checkers:${gameId}`).emit('checkers:over', { winner, reason: 'resign' });
    void finalizeCheckersGame(game, winner, 'resign');
    checkersGames.delete(gameId);
  });

  // ── Join online matchmaking ────────────────────────────────────────────
  socket.on('checkers:joinQueue', () => {
    checkersQueue.set(userId, { socket, rating, joinedAt: Date.now() });
    socket.emit('checkers:queueJoined');

    if (checkersQueue.size >= 2) {
      const entries = [...checkersQueue.entries()];
      const [idA, playerA] = entries[0]!;
      const [idB, playerB] = entries[1]!;

      checkersQueue.delete(idA);
      checkersQueue.delete(idB);

      const gameId = uuidv4();
      const colorA: Color = Math.random() < 0.5 ? 'white' : 'black';
      const colorB: Color = colorA === 'white' ? 'black' : 'white';

      const state = createCheckersGame(gameId, idA, colorA, false, undefined, idB);

      const emitStart = (s: CheckersSocket, col: Color, oppId: string) => {
        void s.join(`checkers:${gameId}`);
        s.emit('checkers:started', {
          gameId,
          playerColor: col,
          state: serializeBoard(state),
          opponent: { id: oppId },
        });
      };

      emitStart(playerA.socket, colorA, idB);
      emitStart(playerB.socket, colorB, idA);

      logger.info('Checkers online game started', { gameId, white: idA, black: idB });
    }
  });

  socket.on('checkers:leaveQueue', () => {
    checkersQueue.delete(userId);
    socket.emit('checkers:queueLeft');
  });

  // ── Disconnect cleanup ────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    checkersQueue.delete(userId);

    for (const [gameId, game] of checkersGames.entries()) {
      const isWhite = game.players.white === userId;
      const isBlack = game.players.black === userId;
      if (!isWhite && !isBlack) continue;

      if (game.isOver || game.isAiGame) {
        checkersGames.delete(gameId);
        continue;
      }

      const winner: Color = isWhite ? 'black' : 'white';
      game.isOver = true;
      game.winner = winner;
      io.to(`checkers:${gameId}`).emit('checkers:over', { winner, reason: 'Суперник відключився' });
      void finalizeCheckersGame(game, winner, 'disconnect');
      checkersGames.delete(gameId);
    }
  });
}
