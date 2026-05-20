import type { Server, Socket } from 'socket.io';
import { Chess } from 'chess.js';

import type { ServerToClientEvents, ClientToServerEvents, SocketData } from '@genius/shared';
import { applyMove, getActiveGame, finalizeGame, createGame } from '../../modules/games/game.service';
import { getBestMove } from '../../ai/aiService';
import { getGameOverReason } from '../../utils/chess';
import { logger } from '../../utils/logger';

type GeniusSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type GeniusServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export function registerGameHandlers(io: GeniusServer, socket: GeniusSocket): void {
  const { userId, username } = socket.data;

  socket.on('startAiGame', async ({ level }) => {
    try {
      const state = await createGame(userId, undefined, true, level);
      await socket.join(state.gameId);
      socket.data.currentGameId = state.gameId;

      const chess = new Chess(state.fen);
      socket.emit('gameStart', {
        gameId: state.gameId,
        playerColor: 'w',
        gameState: {
          id: state.gameId,
          fen: state.fen,
          pgn: state.pgn,
          turn: chess.turn(),
          moves: [],
          isCheck: chess.inCheck(),
          isCheckmate: chess.isCheckmate(),
          isStalemate: chess.isStalemate(),
          isDraw: chess.isDraw(),
          isGameOver: chess.isGameOver(),
          whiteTimeMs: state.whiteTimeMs,
          blackTimeMs: state.blackTimeMs,
          isAiGame: true,
          aiLevel: level,
          whitePlayerId: userId,
        },
      });
    } catch (err) {
      logger.error('startAiGame error', { err });
      socket.emit('error', { code: 'START_GAME_ERROR', message: 'Failed to start game' });
    }
  });

  socket.on('move', async ({ gameId, from, to, promotion }) => {
    try {
      const state = await applyMove(gameId, from, to, promotion);
      const chess = new Chess();
      chess.loadPgn(state.pgn);

      const move = chess.history({ verbose: true }).at(-1);
      if (!move) return;

      const movePayload = {
        from: move.from,
        to: move.to,
        san: move.san,
        uci: `${move.from}${move.to}${move.promotion ?? ''}`,
        fenAfter: chess.fen(),
        moveNumber: chess.history().length,
        timeSpentMs: 0,
      };

      if (chess.isGameOver()) {
        const reason = getGameOverReason(chess);
        const result =
          chess.isCheckmate()
            ? state.turn === 'w' ? 'BLACK_WIN' : 'WHITE_WIN' // current turn = loser after checkmate
            : 'DRAW';

        const resolvedReason = reason ?? 'CHECKMATE';
        io.to(gameId).emit('move', {
          gameId,
          move: movePayload,
          gameState: { ...buildGameState(state.gameId, chess, state), result, resultReason: resolvedReason },
        });
        io.to(gameId).emit('gameEnd', { gameId, result, resultReason: resolvedReason });
        await finalizeGame(gameId, result, resolvedReason);
        return;
      }

      io.to(gameId).emit('move', {
        gameId,
        move: movePayload,
        gameState: buildGameState(state.gameId, chess, state),
      });

      // If AI game and it's AI's turn (Black)
      if (state.isAiGame && state.turn === 'b' && state.aiLevel) {
        const aiResult = await getBestMove(chess.fen(), state.aiLevel);

        const aiFen = new Chess(chess.fen());
        const aiMove = aiFen.move(aiResult.move);
        if (aiMove) {
          const updatedState = await applyMove(gameId, aiMove.from, aiMove.to, aiMove.promotion);
          const updatedChess = new Chess(updatedState.fen);

          const aiMovePayload = {
            from: aiMove.from,
            to: aiMove.to,
            san: aiMove.san,
            uci: `${aiMove.from}${aiMove.to}${aiMove.promotion ?? ''}`,
            fenAfter: updatedChess.fen(),
            moveNumber: updatedChess.history().length,
            timeSpentMs: aiResult.timeMs,
          };

          if (updatedChess.isGameOver()) {
            const reason = getGameOverReason(updatedChess);
            const result = updatedChess.isCheckmate() ? 'BLACK_WIN' : 'DRAW';
            const resolvedReason = reason ?? 'CHECKMATE';
            io.to(gameId).emit('move', {
              gameId,
              move: aiMovePayload,
              gameState: { ...buildGameState(gameId, updatedChess, updatedState), result, resultReason: resolvedReason },
            });
            io.to(gameId).emit('gameEnd', { gameId, result, resultReason: resolvedReason });
            await finalizeGame(gameId, result, resolvedReason);
          } else {
            io.to(gameId).emit('move', {
              gameId,
              move: aiMovePayload,
              gameState: buildGameState(gameId, updatedChess, updatedState),
            });
          }
        }
      }
    } catch (err) {
      logger.error('move error', { err, userId, gameId });
      socket.emit('error', { code: 'MOVE_ERROR', message: 'Invalid or illegal move' });
    }
  });

  socket.on('resign', async () => {
    try {
      const game = await getActiveGame(socket.data.currentGameId ?? '');
      if (!game) return;

      const result = game.whitePlayerId === userId ? 'BLACK_WIN' : 'WHITE_WIN';
      io.to(game.gameId).emit('gameEnd', { gameId: game.gameId, result, resultReason: 'RESIGN' });
      await finalizeGame(game.gameId, result, 'RESIGN');
    } catch (err) {
      logger.error('resign error', { err, userId });
    }
  });

  void username; // used implicitly via socket.data
}

function buildGameState(
  gameId: string,
  chess: Chess,
  state: { whiteTimeMs: number; blackTimeMs: number; isAiGame: boolean; aiLevel?: string; whitePlayerId: string; blackPlayerId?: string },
) {
  return {
    id: gameId,
    fen: chess.fen(),
    pgn: chess.pgn(),
    turn: chess.turn() as 'w' | 'b',
    moves: [] as [],
    isCheck: chess.inCheck(),
    isCheckmate: chess.isCheckmate(),
    isStalemate: chess.isStalemate(),
    isDraw: chess.isDraw(),
    isGameOver: chess.isGameOver(),
    whiteTimeMs: state.whiteTimeMs,
    blackTimeMs: state.blackTimeMs,
    isAiGame: state.isAiGame,
    whitePlayerId: state.whitePlayerId,
    ...(state.blackPlayerId !== undefined ? { blackPlayerId: state.blackPlayerId } : {}),
    ...(state.aiLevel !== undefined ? { aiLevel: state.aiLevel as import('@genius/shared').AiLevel } : {}),
  };
}
