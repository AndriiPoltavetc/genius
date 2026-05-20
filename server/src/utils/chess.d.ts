import { Chess } from 'chess.js';
/**
 * Safely parse a FEN string, returning null if invalid.
 */
export declare function parseFen(fen: string): Chess | null;
/** Determine game-over reason from a chess instance. */
export declare function getGameOverReason(chess: Chess): 'CHECKMATE' | 'STALEMATE' | 'INSUFFICIENT_MATERIAL' | 'THREEFOLD_REPETITION' | 'FIFTY_MOVE_RULE' | null;
/** Convert from-to to UCI notation (e.g. "e2e4", "e7e8q"). */
export declare function toUci(from: string, to: string, promotion?: string): string;
//# sourceMappingURL=chess.d.ts.map