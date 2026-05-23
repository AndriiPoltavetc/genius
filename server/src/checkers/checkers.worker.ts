import { workerData, parentPort } from 'worker_threads';

import { findBestMoveSync } from './checkers.ai';
import type { Board, Color } from './checkers.engine';

interface WorkerInput {
  board: Board;
  color: Color;
  depth: number;
}

const { board, color, depth } = workerData as WorkerInput;

try {
  const result = findBestMoveSync(board, color, depth);
  parentPort?.postMessage({ move: result.bestMove, nodesEvaluated: result.nodesEvaluated });
} catch (err) {
  parentPort?.postMessage({ move: null, nodesEvaluated: 0, error: String(err) });
}
