/** ELO K-factor — determines how quickly ratings change */
const K_FACTOR = 20;

export interface EloResult {
  whiteRatingAfter: number;
  blackRatingAfter: number;
  whiteDelta: number;
  blackDelta: number;
}

/**
 * Calculate expected score for player A against player B.
 * Returns a probability in [0, 1].
 */
function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculate new ELO ratings after a game.
 *
 * @param whiteRating - White player's rating before the game
 * @param blackRating - Black player's rating before the game
 * @param result      - 'white' | 'black' | 'draw'
 */
export function calculateElo(
  whiteRating: number,
  blackRating: number,
  result: 'white' | 'black' | 'draw',
): EloResult {
  const whiteExpected = expectedScore(whiteRating, blackRating);
  const blackExpected = expectedScore(blackRating, whiteRating);

  const whiteActual = result === 'white' ? 1 : result === 'draw' ? 0.5 : 0;
  const blackActual = result === 'black' ? 1 : result === 'draw' ? 0.5 : 0;

  const whiteDelta = Math.round(K_FACTOR * (whiteActual - whiteExpected));
  const blackDelta = Math.round(K_FACTOR * (blackActual - blackExpected));

  return {
    whiteRatingAfter: Math.max(100, whiteRating + whiteDelta),
    blackRatingAfter: Math.max(100, blackRating + blackDelta),
    whiteDelta,
    blackDelta,
  };
}
