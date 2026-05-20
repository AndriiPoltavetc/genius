import { Chess } from 'chess.js';
/**
 * Returns legal moves sorted heuristically for better Alpha-Beta pruning efficiency.
 * Move ordering: captures first (sorted by MVV-LVA), then quiet moves.
 */
export declare function getOrderedMoves(board: Chess): string[];
//# sourceMappingURL=moveGenerator.d.ts.map