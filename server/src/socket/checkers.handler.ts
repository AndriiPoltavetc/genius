import type { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

import type { SocketData } from '@genius/shared';
import {
  createCheckersGame,
  applyCheckersMove,
  computeAiMove,
  serializeBoard,
  checkersGames,
  type CheckersDifficulty,
} from '../checkers/checkers.service';
import type { Color, CheckersMove } from '../checkers/checkers.engine';
import { getValidMoves } from '../checkers/checkers.engine';
import { logger } from '../utils/logger';
import { redis } from '../config/redis';

type AnyServer = Server<any, any, any, SocketData>;
type AnySocket = Socket<any, any, any, SocketData>;

// Matchmaking queue: userId → { socket, rating, joinedAt }
const checkersQueue = new Map<string, { socket: AnySocket; rating: number; joinedAt: number }>();

function emitState(io: AnyServer, gameId: string) {
  const state = checkersGames.get(gameId);
  if (!state) return;
  io.to(`checkers:${gameId}`).emit('checkers:state', serializeBoard(state));
}

export function registerCheckersHandlers(io: AnyServer, socket: AnySocket): void {
  const { userId, username, rating } = socket.data;

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

      // If AI goes first (human chose black)
      if (state.turn !== humanColor && !state.isOver) {
        void computeAiMove(gameId, (updatedState, aiMove) => {
          emitState(io, gameId);
          if (updatedState.isOver) {
            io.to(`checkers:${gameId}`).emit('checkers:over', { winner: updatedState.winner });
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

      // Verify it's the player's turn
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
        io.to(`checkers:${gameId}`).emit('checkers:over', { winner: updatedState.winner });
        return;
      }

      // AI turn
      if (updatedState.isAiGame) {
        void computeAiMove(gameId, (aiState) => {
          emitState(io, gameId);
          if (aiState.isOver) {
            io.to(`checkers:${gameId}`).emit('checkers:over', { winner: aiState.winner });
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
    const winner: Color = isWhite ? 'black' : 'white';
    game.isOver = true;
    game.winner = winner;

    io.to(`checkers:${gameId}`).emit('checkers:over', { winner, reason: 'resign' });
    checkersGames.delete(gameId);
  });

  // ── Join online matchmaking ────────────────────────────────────────────
  socket.on('checkers:joinQueue', () => {
    checkersQueue.set(userId, { socket, rating, joinedAt: Date.now() });
    socket.emit('checkers:queueJoined');

    // Try to find a match
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

      const emitStart = (s: AnySocket, pid: string, col: Color) => {
        void s.join(`checkers:${gameId}`);
        s.emit('checkers:started', {
          gameId,
          playerColor: col,
          state: serializeBoard(state),
          opponent: { id: colorA === col ? idB : idA },
        });
      };

      emitStart(playerA.socket, idA, colorA);
      emitStart(playerB.socket, idB, colorB);

      logger.info('Checkers online game started', { gameId, white: idA, black: idB });
    }
  });

  socket.on('checkers:leaveQueue', () => {
    checkersQueue.delete(userId);
    socket.emit('checkers:queueLeft');
  });
}
