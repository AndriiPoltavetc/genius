export type CheckersDifficulty = 'easy' | 'medium' | 'hard';
export type CheckersPieceColor = 'white' | 'black';
export type CheckersPieceType = 'man' | 'king';

export interface CheckersPiece {
  type: CheckersPieceType;
  color: CheckersPieceColor;
}

export interface CheckersMovePayload {
  from: [number, number];
  to: [number, number];
  captures: [number, number][];
  path?: [number, number][];
}

export interface CheckersBoardState {
  gameId: string;
  board: (CheckersPiece | null)[][];
  turn: CheckersPieceColor;
  moveCount: number;
  isOver: boolean;
  winner: CheckersPieceColor | 'draw' | null;
  lastMove: CheckersMovePayload | null;
  validMoves: CheckersMovePayload[];
}

export interface CheckersStartedPayload {
  gameId: string;
  playerColor: CheckersPieceColor;
  state: CheckersBoardState;
  opponent?: { id: string };
}

export interface CheckersOverPayload {
  winner: CheckersPieceColor | 'draw';
  reason?: string;
}
