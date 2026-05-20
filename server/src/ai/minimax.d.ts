export interface MinimaxResult {
    score: number;
    /** Best move in SAN notation, null only at depth 0 */
    bestMove: string | null;
    /** Total number of nodes evaluated (for benchmarking) */
    nodesEvaluated: number;
}
/**
 * Top-level Minimax call that returns the best move and evaluation metrics.
 *
 * @param fen   - FEN string representing the position
 * @param depth - search depth (2=EASY, 3=MEDIUM, 4=HARD)
 */
export declare function findBestMove(fen: string, depth: number): MinimaxResult;
//# sourceMappingURL=minimax.d.ts.map