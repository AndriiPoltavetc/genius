import { Chess } from 'chess.js';
import type { AiLevel } from '@genius/shared';
import { logger } from '../utils/logger';
import { findBestMove } from './minimax';

const DEPTH_BY_LEVEL: Record<AiLevel, number> = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
};

// HARD gets a 5-second hard cap to prevent the server from blocking
const TIME_LIMIT_MS: Partial<Record<AiLevel, number>> = {
  HARD: 5000,
};

// EASY: 30% chance of a random legal move (simulates beginner mistakes)
const RANDOM_MOVE_CHANCE: Partial<Record<AiLevel, number>> = {
  EASY: 0.3,
};

export interface AiMoveResult {
  move: string;
  nodesEvaluated: number;
  timeMs: number;
}

export function getBestMove(fen: string, level: AiLevel): Promise<AiMoveResult> {
  const depth = DEPTH_BY_LEVEL[level];
  const start = Date.now();

  logger.info('AI thinking', { level, depth, fen });

  try {
    // Random move for EASY (mimics beginner blunders)
    const randomChance = RANDOM_MOVE_CHANCE[level];
    if (randomChance && Math.random() < randomChance) {
      const chess = new Chess(fen);
      const moves = chess.moves();
      if (moves.length > 0) {
        const randomMove = moves[Math.floor(Math.random() * moves.length)] as string;
        logger.info('AI random move (easy)', { move: randomMove });
        return Promise.resolve({ move: randomMove, nodesEvaluated: 1, timeMs: 0 });
      }
    }

    const timeLimitMs = TIME_LIMIT_MS[level];
    const result = findBestMove(fen, depth, timeLimitMs);
    const timeMs = Date.now() - start;

    logger.info('AI move computed', { level, depth, timeMs, nodes: result.nodesEvaluated, move: result.bestMove });

    if (!result.bestMove) {
      return Promise.reject(new Error('AI returned no move — game is likely over'));
    }

    return Promise.resolve({ move: result.bestMove, nodesEvaluated: result.nodesEvaluated, timeMs });
  } catch (err) {
    logger.error('AI computation error', { err });
    return Promise.reject(err instanceof Error ? err : new Error(String(err)));
  }
}
