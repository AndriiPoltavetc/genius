import type { Board, Color, CheckersMove } from './checkers.engine';
import { getValidMoves, applyMove, countPieces } from './checkers.engine';

function evalBoard(board: Board, color: Color): number {
  const { white, black, whiteKings, blackKings } = countPieces(board);

  let score = 0;
  if (color === 'white') {
    score += white + whiteKings * 2 - black - blackKings * 2;
  } else {
    score += black + blackKings * 2 - white - whiteKings * 2;
  }

  // Position bonus: centrality
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const centerBonus = (3.5 - Math.abs(r - 3.5) + 3.5 - Math.abs(c - 3.5)) * 0.05;
      score += piece.color === color ? centerBonus : -centerBonus;
    }
  }

  return score;
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  color: Color,
  maxColor: Color,
): number {
  if (depth === 0) return evalBoard(board, maxColor);

  const currentColor: Color = isMaximizing ? maxColor : (maxColor === 'white' ? 'black' : 'white');
  const moves = getValidMoves(board, currentColor);

  if (moves.length === 0) {
    return isMaximizing ? -100 : 100;
  }

  if (isMaximizing) {
    let best = -Infinity;
    for (const move of moves) {
      const newBoard = applyMove(board, move);
      const val = minimax(newBoard, depth - 1, alpha, beta, false, color, maxColor);
      best = Math.max(best, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      const newBoard = applyMove(board, move);
      const val = minimax(newBoard, depth - 1, alpha, beta, true, color, maxColor);
      best = Math.min(best, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return best;
  }
}

export function findBestMoveSync(
  board: Board,
  color: Color,
  depth: number,
): { bestMove: CheckersMove | null; nodesEvaluated: number } {
  const moves = getValidMoves(board, color);
  if (moves.length === 0) return { bestMove: null, nodesEvaluated: 0 };

  let bestMove: CheckersMove | null = null;
  let bestVal = -Infinity;
  let nodesEvaluated = 0;

  for (const move of moves) {
    const newBoard = applyMove(board, move);
    const val = minimax(newBoard, depth - 1, -Infinity, Infinity, false, color, color);
    nodesEvaluated++;
    if (val > bestVal) {
      bestVal = val;
      bestMove = move;
    }
  }

  return { bestMove, nodesEvaluated };
}
