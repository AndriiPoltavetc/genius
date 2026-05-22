import { Chess } from 'chess.js';

import { evaluate } from './evaluation';
import { getOrderedMoves } from './moveGenerator';

export interface MinimaxResult {
  score: number;
  /** Best move in SAN notation, null only at depth 0 */
  bestMove: string | null;
  /** Total number of nodes evaluated (for benchmarking) */
  nodesEvaluated: number;
}

interface SearchState {
  nodes: number;
  /** Unix timestamp (ms) after which search should stop; null = no limit */
  deadline: number | null;
  timedOut: boolean;
}

/**
 * Minimax algorithm with Alpha-Beta pruning.
 *
 * Complexity without pruning: O(b^d)
 * Complexity with Alpha-Beta (best case): O(b^(d/2))
 *
 * @param board       - current Chess position
 * @param depth       - remaining search depth
 * @param alpha       - best score the maximizing player can guarantee
 * @param beta        - best score the minimizing player can guarantee
 * @param maximizing  - true when it's the maximizing player's turn (White)
 * @param state       - shared mutable state: node counter + time limit
 */
function minimaxInner(
  board: Chess,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  state: SearchState,
): number {
  state.nodes++;

  // Time-limit check: return static eval and mark timeout
  if (state.deadline !== null && state.nodes % 512 === 0 && Date.now() > state.deadline) {
    state.timedOut = true;
    return evaluate(board);
  }

  if (depth === 0 || board.isGameOver()) {
    return evaluate(board);
  }

  const moves = getOrderedMoves(board);

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      if (state.timedOut) break;
      board.move(move);
      const score = minimaxInner(board, depth - 1, alpha, beta, false, state);
      board.undo();
      if (score > maxEval) maxEval = score;
      if (score > alpha) alpha = score;
      if (beta <= alpha) break; // Alpha-Beta cutoff (beta pruning)
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      if (state.timedOut) break;
      board.move(move);
      const score = minimaxInner(board, depth - 1, alpha, beta, true, state);
      board.undo();
      if (score < minEval) minEval = score;
      if (score < beta) beta = score;
      if (beta <= alpha) break; // Alpha-Beta cutoff (alpha pruning)
    }
    return minEval;
  }
}

/**
 * Top-level Minimax call that returns the best move and evaluation metrics.
 *
 * @param fen          - FEN string representing the position
 * @param depth        - search depth
 * @param timeLimitMs  - optional hard time cap in milliseconds
 */
export function findBestMove(fen: string, depth: number, timeLimitMs?: number): MinimaxResult {
  const board = new Chess(fen);

  if (board.isGameOver()) {
    return { score: evaluate(board), bestMove: null, nodesEvaluated: 1 };
  }

  const isWhiteTurn = board.turn() === 'w';
  const moves = getOrderedMoves(board);
  const state: SearchState = {
    nodes: 0,
    deadline: timeLimitMs != null ? Date.now() + timeLimitMs : null,
    timedOut: false,
  };

  let bestMove: string | null = null;
  let bestScore = isWhiteTurn ? -Infinity : Infinity;
  let alpha = -Infinity;
  let beta = Infinity;

  for (const move of moves) {
    if (state.timedOut) break;

    board.move(move);
    const score = minimaxInner(board, depth - 1, alpha, beta, !isWhiteTurn, state);
    board.undo();

    if (isWhiteTurn ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = move;
    }

    if (isWhiteTurn) {
      alpha = Math.max(alpha, bestScore);
    } else {
      beta = Math.min(beta, bestScore);
    }
  }

  // Guarantee we always return some move (first legal move as fallback)
  return { score: bestScore, bestMove: bestMove ?? moves[0] ?? null, nodesEvaluated: state.nodes };
}
