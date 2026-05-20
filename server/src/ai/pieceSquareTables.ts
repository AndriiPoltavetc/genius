import type { PieceType, Color, Square } from '@genius/shared';

/**
 * Piece-square tables (PST) encode positional bonuses/penalties in centipawns.
 * Values are from White's perspective; Black's tables are the mirror image.
 * Source: adapted from classical Simplified Evaluation Function by Tomasz Michniewski.
 */

// prettier-ignore
const PAWN_TABLE: number[] = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];

// prettier-ignore
const KNIGHT_TABLE: number[] = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

// prettier-ignore
const BISHOP_TABLE: number[] = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

// prettier-ignore
const ROOK_TABLE: number[] = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0,
];

// prettier-ignore
const QUEEN_TABLE: number[] = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];

// King safety: prefers castled position during middlegame
// prettier-ignore
const KING_MIDGAME_TABLE: number[] = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20,
];

// King activity: prefers central squares in endgame
// prettier-ignore
const KING_ENDGAME_TABLE: number[] = [
  -50,-40,-30,-20,-20,-30,-40,-50,
  -30,-20,-10,  0,  0,-10,-20,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-30,  0,  0,  0,  0,-30,-30,
  -50,-30,-30,-30,-30,-30,-30,-50,
];

const PST_WHITE: Record<PieceType, { midgame: number[]; endgame: number[] }> = {
  p: { midgame: PAWN_TABLE, endgame: PAWN_TABLE },
  n: { midgame: KNIGHT_TABLE, endgame: KNIGHT_TABLE },
  b: { midgame: BISHOP_TABLE, endgame: BISHOP_TABLE },
  r: { midgame: ROOK_TABLE, endgame: ROOK_TABLE },
  q: { midgame: QUEEN_TABLE, endgame: QUEEN_TABLE },
  k: { midgame: KING_MIDGAME_TABLE, endgame: KING_ENDGAME_TABLE },
};

// Ordered list of all squares (a8..h1) matching the PST array indices
const ALL_SQUARES: Square[] = [
  'a8','b8','c8','d8','e8','f8','g8','h8',
  'a7','b7','c7','d7','e7','f7','g7','h7',
  'a6','b6','c6','d6','e6','f6','g6','h6',
  'a5','b5','c5','d5','e5','f5','g5','h5',
  'a4','b4','c4','d4','e4','f4','g4','h4',
  'a3','b3','c3','d3','e3','f3','g3','h3',
  'a2','b2','c2','d2','e2','f2','g2','h2',
  'a1','b1','c1','d1','e1','f1','g1','h1',
] as Square[];

const SQUARE_INDEX = new Map<Square, number>(
  ALL_SQUARES.map((sq, i) => [sq, i]),
);

/**
 * Returns the PST bonus for a piece on a given square.
 * For Black, the table is mirrored vertically.
 */
export function getPstBonus(
  pieceType: PieceType,
  color: Color,
  square: Square,
  isEndgame: boolean,
): number {
  const table = isEndgame ? PST_WHITE[pieceType].endgame : PST_WHITE[pieceType].midgame;
  const idx = SQUARE_INDEX.get(square) ?? 0;
  // Mirror for Black: row = 7 - row
  const mirroredIdx = color === 'w' ? idx : (7 - Math.floor(idx / 8)) * 8 + (idx % 8);
  return table[mirroredIdx] ?? 0;
}
