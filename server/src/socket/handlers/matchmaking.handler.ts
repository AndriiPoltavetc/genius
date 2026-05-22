import type { Server, Socket } from 'socket.io';

import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@genius/shared';
import { addToQueue, removeFromQueue, findMatch } from '../../modules/matchmaking/matchmaking.service';
import { createGame } from '../../modules/games/game.service';
import { logger } from '../../utils/logger';
import { Chess } from 'chess.js';
import { startGameTimer } from '../gameTimerService';
import { pendingGameReady } from '../gameReadyStore';

type GeniusSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type GeniusServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

// Prevents the same pair from being matched twice due to a race condition
const activePairings = new Set<string>();

export function registerMatchmakingHandlers(io: GeniusServer, socket: GeniusSocket): void {
  const { userId, username, rating } = socket.data;

  socket.on('joinQueue', async (payload) => {
    try {
      await addToQueue({ userId, username, rating, joinedAt: Date.now(), colorPreference: payload?.colorPreference ?? 'any' });
      socket.emit('queueJoined');

      const match = await findMatch();
      if (!match) return;

      const [playerA, playerB] = match;

      const pairKey = [playerA.userId, playerB.userId].sort().join(':');
      if (activePairings.has(pairKey)) return;
      activePairings.add(pairKey);
      setTimeout(() => activePairings.delete(pairKey), 5000);

      // Assign colors based on preference; fall back to random on conflict
      const pA = playerA.colorPreference ?? 'any';
      const pB = playerB.colorPreference ?? 'any';
      let white: typeof playerA;
      let black: typeof playerA;
      if (pA === 'white' && pB !== 'white') {
        [white, black] = [playerA, playerB];
      } else if (pB === 'white' && pA !== 'white') {
        [white, black] = [playerB, playerA];
      } else if (pA === 'black' && pB !== 'black') {
        [white, black] = [playerB, playerA];
      } else if (pB === 'black' && pA !== 'black') {
        [white, black] = [playerA, playerB];
      } else {
        [white, black] = Math.random() < 0.5 ? [playerA, playerB] : [playerB, playerA];
      }

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
        const whitePayload = {
          gameId: state.gameId,
          playerColor: 'w' as const,
          gameState: gameStateBase,
          opponent: { id: black.userId, username: black.username, rating: black.rating },
        };
        whiteSocket.emit('gameStart', whitePayload);
        const whiteKey = `${state.gameId}:${white.userId}`;
        const whiteTimer = setTimeout(() => {
          whiteSocket.emit('gameStart', whitePayload);
          pendingGameReady.delete(whiteKey);
        }, 4000);
        pendingGameReady.set(whiteKey, { timer: whiteTimer, emit: () => whiteSocket.emit('gameStart', whitePayload) });
      }

      if (blackSocket) {
        await blackSocket.join(state.gameId);
        blackSocket.data.currentGameId = state.gameId;
        const blackPayload = {
          gameId: state.gameId,
          playerColor: 'b' as const,
          gameState: gameStateBase,
          opponent: { id: white.userId, username: white.username, rating: white.rating },
        };
        blackSocket.emit('gameStart', blackPayload);
        const blackKey = `${state.gameId}:${black.userId}`;
        const blackTimer = setTimeout(() => {
          blackSocket.emit('gameStart', blackPayload);
          pendingGameReady.delete(blackKey);
        }, 4000);
        pendingGameReady.set(blackKey, { timer: blackTimer, emit: () => blackSocket.emit('gameStart', blackPayload) });
      }

      startGameTimer(io, state.gameId);
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
