import { Chess } from 'chess.js';

/**
 * Safely parse a FEN string, returning null if invalid.
 */
export function parseFen(fen: string): Chess | null {
  try {
    const chess = new Chess(fen);
    return chess;
  } catch {
    return null;
  }
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

/** Convert from-to to UCI notation (e.g. "e2e4", "e7e8q"). */
export function toUci(from: string, to: string, promotion?: string): string {
  return `${from}${to}${promotion ?? ''}`;
}
