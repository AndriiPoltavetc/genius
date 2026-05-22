import { Worker } from 'worker_threads';
import path from 'path';
import { Chess } from 'chess.js';
import type { AiLevel } from '@genius/shared';
import { logger } from '../utils/logger';
import { findBestMove } from './minimax';

const DEPTH_BY_LEVEL: Record<AiLevel, number> = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
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

function getRandomMove(fen: string): string | null {
  const chess = new Chess(fen);
  const moves = chess.moves();
  return moves.length > 0 ? (moves[Math.floor(Math.random() * moves.length)] as string) : null;
}

function findBestMoveAsync(fen: string, depth: number): Promise<{ move: string | null; nodesEvaluated: number }> {
  return new Promise((resolve, reject) => {
    // In compiled output __dirname = dist/ai/, so worker.js is alongside this file
    const workerPath = path.join(__dirname, 'worker.js');
    const worker = new Worker(workerPath, { workerData: { fen, depth } });

    const timer = setTimeout(() => {
      void worker.terminate();
      reject(new Error('Worker timeout after 8s'));
    }, 8000);

    worker.on('message', (result: { move: string | null; nodesEvaluated: number }) => {
      clearTimeout(timer);
      resolve(result);
    });

    worker.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    worker.on('exit', (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
    });
  });
}

export async function getBestMove(fen: string, level: AiLevel): Promise<AiMoveResult> {
  const depth = DEPTH_BY_LEVEL[level];
  const start = Date.now();

  logger.info('AI thinking', { level, depth, fen });

  // Random move for EASY (mimics beginner blunders)
  const randomChance = RANDOM_MOVE_CHANCE[level];
  if (randomChance && Math.random() < randomChance) {
    const move = getRandomMove(fen);
    if (move) {
      logger.info('AI random move (easy)', { move });
      return { move, nodesEvaluated: 1, timeMs: 0 };
    }
  }

  try {
    const result = await findBestMoveAsync(fen, depth);
    const timeMs = Date.now() - start;
    logger.info('AI move computed via worker', { level, depth, timeMs, nodes: result.nodesEvaluated, move: result.move });

    if (!result.move) throw new Error('Worker returned no move');
    return { move: result.move, nodesEvaluated: result.nodesEvaluated, timeMs };
  } catch (err) {
    // Fallback: synchronous minimax (used in development or if worker.js is unavailable)
    logger.warn('Worker unavailable, using synchronous fallback', { err: String(err) });
    const syncResult = findBestMove(fen, depth);
    const timeMs = Date.now() - start;

    if (!syncResult.bestMove) {
      const fallback = getRandomMove(fen);
      if (!fallback) throw new Error('No legal moves available');
      return { move: fallback, nodesEvaluated: 0, timeMs };
    }

    return { move: syncResult.bestMove, nodesEvaluated: syncResult.nodesEvaluated, timeMs };
  }
}
