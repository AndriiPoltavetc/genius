import { Chess } from 'chess.js';
import type { PieceType } from '@genius/shared';
/** Material values in centipawns */
export declare const PIECE_VALUES: Record<PieceType, number>;
/**
 * Static position evaluation function.
 * Returns a score in centipawns from White's perspective:
 *   positive  → White is better
 *   negative  → Black is better
 *   0         → equal
 */
export declare function evaluate(board: Chess): number;
//# sourceMappingURL=evaluation.d.ts.map