import { Chess } from 'chess.js';

/**
 * Determine the game result from the current position.
 * Returns null when the game is still in progress.
 *
 * chess.turn() after a move is the side that CANNOT move next — the loser in checkmate.
 */
export function determineResult(chess: Chess): 'WHITE_WIN' | 'BLACK_WIN' | 'DRAW' | null {
  if (!chess.isGameOver()) return null;
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? 'BLACK_WIN' : 'WHITE_WIN';
  }
  // Stalemate, insufficient material, threefold repetition, fifty-move rule
  return 'DRAW';
}

/** Determine game-over reason from a chess instance. */
export function getGameOverReason(
  chess: Chess,
): 'CHECKMATE' | 'STALEMATE' | 'INSUFFICIENT_MATERIAL' | 'THREEFOLD_REPETITION' | 'FIFTY_MOVE_RULE' | null {
  if (!chess.isGameOver()) return null;
  if (chess.isCheckmate()) return 'CHECKMATE';
  if (chess.isStalemate()) return 'STALEMATE';
  if (chess.isInsufficientMaterial()) return 'INSUFFICIENT_MATERIAL';
  if (chess.isThreefoldRepetition()) return 'THREEFOLD_REPETITION';
  if (chess.isDraw()) return 'FIFTY_MOVE_RULE';
  return null;
}

