import type { Server } from 'socket.io';

import type { ServerToClientEvents, ClientToServerEvents, SocketData } from '@genius/shared';
import { getActiveGame, finalizeGame } from '../modules/games/game.service';
import { logger } from '../utils/logger';

type GeniusServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

const activeTimers = new Map<string, ReturnType<typeof setInterval>>();

export function startGameTimer(io: GeniusServer, gameId: string): void {
  if (activeTimers.has(gameId)) return;

  const interval = setInterval(() => {
    void tickTimer(io, gameId);
  }, 1000);

  activeTimers.set(gameId, interval);
  logger.debug('Game timer started', { gameId });
}

export function stopGameTimer(gameId: string): void {
  const interval = activeTimers.get(gameId);
  if (interval) {
    clearInterval(interval);
    activeTimers.delete(gameId);
    logger.debug('Game timer stopped', { gameId });
  }
}

async function tickTimer(io: GeniusServer, gameId: string): Promise<void> {
  try {
    const state = await getActiveGame(gameId);
    if (!state) {
      stopGameTimer(gameId);
      return;
    }

    // Calculate real remaining time without writing to Redis.
    // applyMove handles the authoritative deduction on each move.
    const elapsed = Date.now() - state.lastMoveAt;
    const whiteTimeMs = state.turn === 'w'
      ? Math.max(0, state.whiteTimeMs - elapsed)
      : state.whiteTimeMs;
    const blackTimeMs = state.turn === 'b'
      ? Math.max(0, state.blackTimeMs - elapsed)
      : state.blackTimeMs;

    io.to(gameId).emit('syncTime', { gameId, whiteTimeMs, blackTimeMs });

    const timedOut =
      (state.turn === 'w' && whiteTimeMs <= 0) ||
      (state.turn === 'b' && blackTimeMs <= 0);

    if (timedOut) {
      stopGameTimer(gameId);
      // The player whose turn it is ran out of time — they lose
      const result: 'WHITE_WIN' | 'BLACK_WIN' =
        state.turn === 'w' ? 'BLACK_WIN' : 'WHITE_WIN';
      io.to(gameId).emit('gameEnd', { gameId, result, resultReason: 'TIMEOUT' });
      await finalizeGame(gameId, result, 'TIMEOUT');
    }
  } catch (err) {
    logger.error('Timer tick error', { err, gameId });
    stopGameTimer(gameId);
  }
}
