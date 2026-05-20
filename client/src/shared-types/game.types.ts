export type Color = 'w' | 'b';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export type Square =
  | 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6' | 'a7' | 'a8'
  | 'b1' | 'b2' | 'b3' | 'b4' | 'b5' | 'b6' | 'b7' | 'b8'
  | 'c1' | 'c2' | 'c3' | 'c4' | 'c5' | 'c6' | 'c7' | 'c8'
  | 'd1' | 'd2' | 'd3' | 'd4' | 'd5' | 'd6' | 'd7' | 'd8'
  | 'e1' | 'e2' | 'e3' | 'e4' | 'e5' | 'e6' | 'e7' | 'e8'
  | 'f1' | 'f2' | 'f3' | 'f4' | 'f5' | 'f6' | 'f7' | 'f8'
  | 'g1' | 'g2' | 'g3' | 'g4' | 'g5' | 'g6' | 'g7' | 'g8'
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'h7' | 'h8';

export type AiLevel = 'EASY' | 'MEDIUM' | 'HARD';

export type GameResult = 'WHITE_WIN' | 'BLACK_WIN' | 'DRAW' | 'ABORTED';

export type ResultReason =
  | 'CHECKMATE'
  | 'TIMEOUT'
  | 'RESIGN'
  | 'STALEMATE'
  | 'DRAW_AGREED'
  | 'INSUFFICIENT_MATERIAL'
  | 'THREEFOLD_REPETITION'
  | 'FIFTY_MOVE_RULE';

export interface Move {
  from: Square;
  to: Square;
  promotion?: PieceType;
  san: string;
  uci: string;
  fenAfter: string;
  moveNumber: number;
  timeSpentMs: number;
}

export interface GameState {
  id: string;
  fen: string;
  pgn: string;
  turn: Color;
  moves: Move[];
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  isGameOver: boolean;
  result?: GameResult;
  resultReason?: ResultReason;
  whiteTimeMs: number;
  blackTimeMs: number;
  isAiGame: boolean;
  aiLevel?: AiLevel;
  whitePlayerId?: string;
  blackPlayerId?: string;
}

export interface GameSummary {
  id: string;
  result: GameResult;
  resultReason: ResultReason;
  whitePlayerId?: string;
  blackPlayerId?: string;
  isAiGame: boolean;
  aiLevel?: AiLevel;
  pgn: string;
  totalMoves: number;
  startedAt: string;
  endedAt: string;
  whiteRatingBefore?: number;
  blackRatingBefore?: number;
  whiteRatingAfter?: number;
  blackRatingAfter?: number;
}

export interface TimeControl {
  initialMs: number;
  incrementMs: number;
}

export const DEFAULT_TIME_CONTROL: TimeControl = {
  initialMs: 10 * 60 * 1000,
  incrementMs: 0,
};
