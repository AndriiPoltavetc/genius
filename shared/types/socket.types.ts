import type { AiLevel, GameState, GameResult, ResultReason, Move } from './game.types';

// Events sent from Client → Server
export interface ClientToServerEvents {
  joinQueue: (payload?: { colorPreference?: 'white' | 'black' | 'any' }) => void;
  leaveQueue: () => void;
  startAiGame: (payload: { level: AiLevel; timeLimitSeconds?: number }) => void;
  gameReady: (payload: { gameId: string }) => void;
  move: (payload: MovePayload) => void;
  resign: () => void;
  drawOffer: () => void;
  drawAccept: () => void;
  drawDecline: () => void;
  chatMessage: (payload: ChatMessagePayload) => void;
}

// Events sent from Server → Client
export interface ServerToClientEvents {
  gameStart: (payload: GameStartPayload) => void;
  move: (payload: MoveBroadcastPayload) => void;
  gameEnd: (payload: GameEndPayload) => void;
  timeout: (payload: TimeoutPayload) => void;
  drawOffer: () => void;
  drawDeclined: () => void;
  chatMessage: (payload: ChatBroadcastPayload) => void;
  opponentDisconnected: () => void;
  opponentReconnected: () => void;
  queueJoined: () => void;
  queueLeft: () => void;
  error: (payload: ErrorPayload) => void;
  syncTime: (payload: SyncTimePayload) => void;
}

// Payloads
export interface MovePayload {
  gameId: string;
  from: string;
  to: string;
  promotion?: string;
}

export interface ChatMessagePayload {
  gameId: string;
  content: string;
}

export interface GameStartPayload {
  gameId: string;
  gameState: GameState;
  playerColor: 'w' | 'b';
  opponent?: {
    id: string;
    username: string;
    rating: number;
  };
}

export interface MoveBroadcastPayload {
  gameId: string;
  move: Move;
  gameState: GameState;
}

export interface GameEndPayload {
  gameId: string;
  result: GameResult;
  resultReason: ResultReason;
  ratingChange?: {
    before: number;
    after: number;
    delta: number;
  };
}

export interface TimeoutPayload {
  gameId: string;
  losingColor: 'w' | 'b';
}

export interface ChatBroadcastPayload {
  gameId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
}

export interface SyncTimePayload {
  gameId: string;
  whiteTimeMs: number;
  blackTimeMs: number;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

// Socket Data (attached to each socket connection after auth)
export interface SocketData {
  userId: string;
  username: string;
  rating: number;
  currentGameId?: string;
}
