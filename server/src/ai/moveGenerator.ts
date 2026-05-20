import { Chess } from 'chess.js';

/**
 * Returns legal moves sorted heuristically for better Alpha-Beta pruning efficiency.
 * Move ordering: captures first (sorted by MVV-LVA), then quiet moves.
 */
export function getOrderedMoves(board: Chess): string[] {
  const moves = board.moves({ verbose: true });

  const captures = moves.filter((m) => m.captured !== undefined);
  const quietMoves = moves.filter((m) => m.captured === undefined);

  // MVV-LVA: Most Valuable Victim – Least Valuable Attacker
  // Prefer capturing high-value pieces with low-value attackers
  const PIECE_ORDER: Record<string, number> = {
    q: 5, r: 4, b: 3, n: 2, p: 1, k: 0,
  };

  captures.sort((a, b) => {
    const victimDiff =
      (PIECE_ORDER[b.captured ?? 'p'] ?? 0) - (PIECE_ORDER[a.captured ?? 'p'] ?? 0);
    if (victimDiff !== 0) return victimDiff;
    return (PIECE_ORDER[a.piece] ?? 0) - (PIECE_ORDER[b.piece] ?? 0);
  });

  return [...captures, ...quietMoves].map((m) => m.san);
}
