import { workerData, parentPort } from 'worker_threads';

import { findBestMove } from './minimax';

interface WorkerInput {
  fen: string;
  depth: number;
}

const { fen, depth } = workerData as WorkerInput;

try {
  const result = findBestMove(fen, depth);
  parentPort?.postMessage({ move: result.bestMove, nodesEvaluated: result.nodesEvaluated });
} catch (err) {
  parentPort?.postMessage({ move: null, nodesEvaluated: 0, error: String(err) });
}
