import type { Server, Socket } from 'socket.io';

import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@genius/shared';
import { addToQueue, removeFromQueue, findMatch } from '../../modules/matchmaking/matchmaking.service';
import { createGame } from '../../modules/games/game.service';
import { logger } from '../../utils/logger';
import { Chess } from 'chess.js';

type GeniusSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type GeniusServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export function registerMatchmakingHandlers(io: GeniusServer, socket: GeniusSocket): void {
  const { userId, username, rating } = socket.data;

  socket.on('joinQueue', async () => {
    try {
      await addToQueue({ userId, username, rating, joinedAt: Date.now() });
      socket.emit('queueJoined');

      const match = await findMatch();
      if (!match) return;

      const [playerA, playerB] = match;
      // Randomly assign colors
      const [white, black] = Math.random() < 0.5 ? [playerA, playerB] : [playerB, playerA];

      const state = await createGame(white.userId, black.userId, false);
      const chess = new Chess();

      const gameStateBase = {
        id: state.gameId,
        fen: chess.fen(),
        pgn: chess.pgn(),
        turn: 'w' as const,
        moves: [],
        isCheck: false,
        isCheckmate: false,
        isStalemate: false,
        isDraw: false,
        isGameOver: false,
        whiteTimeMs: state.whiteTimeMs,
        blackTimeMs: state.blackTimeMs,
        isAiGame: false,
        whitePlayerId: white.userId,
        blackPlayerId: black.userId,
      };

      const whiteSocket = [...io.sockets.sockets.values()].find(
        (s) => (s.data as SocketData).userId === white.userId,
      );
      const blackSocket = [...io.sockets.sockets.values()].find(
        (s) => (s.data as SocketData).userId === black.userId,
      );

      if (whiteSocket) {
        await whiteSocket.join(state.gameId);
        whiteSocket.data.currentGameId = state.gameId;
        whiteSocket.emit('gameStart', {
          gameId: state.gameId,
          playerColor: 'w',
          gameState: gameStateBase,
          opponent: { id: black.userId, username: black.username, rating: black.rating },
        });
      }

      if (blackSocket) {
        await blackSocket.join(state.gameId);
        blackSocket.data.currentGameId = state.gameId;
        blackSocket.emit('gameStart', {
          gameId: state.gameId,
          playerColor: 'b',
          gameState: gameStateBase,
          opponent: { id: white.userId, username: white.username, rating: white.rating },
        });
      }
    } catch (err) {
      logger.error('joinQueue error', { err, userId });
      socket.emit('error', { code: 'QUEUE_ERROR', message: 'Failed to join queue' });
    }
  });

  socket.on('leaveQueue', async () => {
    try {
      await removeFromQueue(userId);
      socket.emit('queueLeft');
    } catch (err) {
      logger.error('leaveQueue error', { err, userId });
    }
  });
}
