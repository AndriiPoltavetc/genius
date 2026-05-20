import type { AiLevel } from '@genius/shared';
import { logger } from '../utils/logger';
import { findBestMove } from './minimax';

const DEPTH_BY_LEVEL: Record<AiLevel, number> = {
  EASY: 2,
  MEDIUM: 3,
  HARD: 4,
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
    const result = findBestMove(fen, depth);
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
