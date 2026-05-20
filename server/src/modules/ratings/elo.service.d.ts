export interface EloResult {
    whiteRatingAfter: number;
    blackRatingAfter: number;
    whiteDelta: number;
    blackDelta: number;
}
/**
 * Calculate new ELO ratings after a game.
 *
 * @param whiteRating - White player's rating before the game
 * @param blackRating - Black player's rating before the game
 * @param result      - 'white' | 'black' | 'draw'
 */
export declare function calculateElo(whiteRating: number, blackRating: number, result: 'white' | 'black' | 'draw'): EloResult;
//# sourceMappingURL=elo.service.d.ts.map