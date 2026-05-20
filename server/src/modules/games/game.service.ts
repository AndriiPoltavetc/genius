import { Chess } from 'chess.js';

import { prisma } from '../../config/database';
import { redis, REDIS_KEYS } from '../../config/redis';
import { AppError } from '../../middleware/errorHandler';
import { calculateElo } from '../ratings/elo.service';
import { getGameOverReason } from '../../utils/chess';
import type { AiLevel, GameResult, ResultReason } from '@genius/shared';

const INITIAL_TIME_MS = 10 * 60 * 1000; // 10 minutes

export interface ActiveGameState {
  gameId: string;
  fen: string;
  pgn: string;
  whitePlayerId: string;
  blackPlayerId?: string;
  isAiGame: boolean;
  aiLevel?: AiLevel;
  whiteTimeMs: number;
  blackTimeMs: number;
  lastMoveAt: number;
  turn: 'w' | 'b';
}

export async function createGame(
  whitePlayerId: string,
  blackPlayerId: string | undefined,
  isAiGame: boolean,
  aiLevel?: AiLevel,
): Promise<ActiveGameState> {
  const chess = new Chess();

  const game = await prisma.game.create({
    data: {
      whitePlayerId,
      blackPlayerId: blackPlayerId ?? null,
      isAiGame,
      aiLevel: aiLevel ?? null,
      pgn: chess.pgn(),
      finalFen: chess.fen(),
      result: 'WHITE_WIN', // placeholder, updated on game end
      resultReason: 'CHECKMATE',
    },
  });

  const state: ActiveGameState = {
    gameId: game.id,
    fen: chess.fen(),
    pgn: chess.pgn(),
    whitePlayerId,
    isAiGame,
    whiteTimeMs: INITIAL_TIME_MS,
    blackTimeMs: INITIAL_TIME_MS,
    lastMoveAt: Date.now(),
    turn: 'w',
    ...(blackPlayerId !== undefined ? { blackPlayerId } : {}),
    ...(aiLevel !== undefined ? { aiLevel } : {}),
  };

  await redis.set(REDIS_KEYS.activeGame(game.id), JSON.stringify(state), 'EX', 7200);
  if (blackPlayerId) {
    await redis.set(REDIS_KEYS.playerGame(blackPlayerId), game.id, 'EX', 7200);
  }
  await redis.set(REDIS_KEYS.playerGame(whitePlayerId), game.id, 'EX', 7200);

  return state;
}

export async function getActiveGame(gameId: string): Promise<ActiveGameState | null> {
  const data = await redis.get(REDIS_KEYS.activeGame(gameId));
  if (!data) return null;
  return JSON.parse(data) as ActiveGameState;
}

export async function applyMove(
  gameId: string,
  from: string,
  to: string,
  promotion?: string,
): Promise<ActiveGameState> {
  const state = await getActiveGame(gameId);
  if (!state) throw new AppError(404, 'Game not found or already finished');

  const chess = new Chess(state.fen);
  chess.loadPgn(state.pgn);

  const now = Date.now();
  const elapsed = now - state.lastMoveAt;

  if (state.turn === 'w') {
    state.whiteTimeMs = Math.max(0, state.whiteTimeMs - elapsed);
  } else {
    state.blackTimeMs = Math.max(0, state.blackTimeMs - elapsed);
  }

  const moveResult = chess.move(promotion ? { from, to, promotion } : { from, to });
  if (!moveResult) throw new AppError(400, `Illegal move: ${from}${to}`);

  state.fen = chess.fen();
  state.pgn = chess.pgn();
  state.turn = chess.turn();
  state.lastMoveAt = now;

  await redis.set(REDIS_KEYS.activeGame(gameId), JSON.stringify(state), 'EX', 7200);

  await prisma.move.create({
    data: {
      gameId,
      moveNumber: chess.history().length,
      san: moveResult.san,
      uci: `${from}${to}${promotion ?? ''}`,
      fenAfter: chess.fen(),
      timeSpentMs: elapsed,
    },
  });

  return state;
}

export async function finalizeGame(
  gameId: string,
  result: GameResult,
  resultReason: ResultReason,
): Promise<void> {
  const state = await getActiveGame(gameId);
  if (!state) return;

  const chess = new Chess(state.fen);

  let whiteRatingAfter: number | undefined;
  let blackRatingAfter: number | undefined;
  let whiteRatingBefore: number | undefined;
  let blackRatingBefore: number | undefined;

  if (!state.isAiGame && state.blackPlayerId) {
    const [white, black] = await Promise.all([
      prisma.user.findUnique({ where: { id: state.whitePlayerId } }),
      prisma.user.findUnique({ where: { id: state.blackPlayerId } }),
    ]);

    if (white && black) {
      whiteRatingBefore = white.rating;
      blackRatingBefore = black.rating;

      const eloResult = calculateElo(
        white.rating,
        black.rating,
        result === 'WHITE_WIN' ? 'white' : result === 'BLACK_WIN' ? 'black' : 'draw',
      );
      whiteRatingAfter = eloResult.whiteRatingAfter;
      blackRatingAfter = eloResult.blackRatingAfter;

      await Promise.all([
        prisma.user.update({
          where: { id: state.whitePlayerId },
          data: {
            rating: whiteRatingAfter,
            gamesPlayed: { increment: 1 },
            ...(result === 'WHITE_WIN' ? { gamesWon: { increment: 1 } } : {}),
            ...(result === 'BLACK_WIN' ? { gamesLost: { increment: 1 } } : {}),
            ...(result === 'DRAW' ? { gamesDrawn: { increment: 1 } } : {}),
          },
        }),
        prisma.user.update({
          where: { id: state.blackPlayerId },
          data: {
            rating: blackRatingAfter,
            gamesPlayed: { increment: 1 },
            ...(result === 'BLACK_WIN' ? { gamesWon: { increment: 1 } } : {}),
            ...(result === 'WHITE_WIN' ? { gamesLost: { increment: 1 } } : {}),
            ...(result === 'DRAW' ? { gamesDrawn: { increment: 1 } } : {}),
          },
        }),
      ]);
    }
  } else if (state.isAiGame) {
    await prisma.user.update({
      where: { id: state.whitePlayerId },
      data: { gamesPlayed: { increment: 1 } },
    });
  }

  await prisma.game.update({
    where: { id: gameId },
    data: {
      pgn: chess.pgn(),
      finalFen: chess.fen(),
      result,
      resultReason,
      whiteRatingBefore: whiteRatingBefore ?? null,
      blackRatingBefore: blackRatingBefore ?? null,
      whiteRatingAfter: whiteRatingAfter ?? null,
      blackRatingAfter: blackRatingAfter ?? null,
      endedAt: new Date(),
    },
  });

  // Clean up Redis
  await redis.del(REDIS_KEYS.activeGame(gameId));
  await redis.del(REDIS_KEYS.playerGame(state.whitePlayerId));
  if (state.blackPlayerId) {
    await redis.del(REDIS_KEYS.playerGame(state.blackPlayerId));
  }
}

export async function getGameHistory(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where: {
        OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
        endedAt: { not: null },
      },
      orderBy: { startedAt: 'desc' },
      skip,
      take: limit,
      include: {
        whitePlayer: { select: { id: true, username: true, rating: true } },
        blackPlayer: { select: { id: true, username: true, rating: true } },
        _count: { select: { moves: true } },
      },
    }),
    prisma.game.count({
      where: {
        OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
        endedAt: { not: null },
      },
    }),
  ]);

  return { games, total, page, limit };
}

export async function getGameById(gameId: string) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      whitePlayer: { select: { id: true, username: true, rating: true } },
      blackPlayer: { select: { id: true, username: true, rating: true } },
      moves: { orderBy: { moveNumber: 'asc' } },
    },
  });

  if (!game) throw new AppError(404, 'Game not found');
  return game;
}
