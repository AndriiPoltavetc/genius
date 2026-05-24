export interface User {
  id: string;
  email: string;
  username: string;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;
  createdAt: string;
}

export interface AiLevelStats {
  played: number;
  wins: number;
}

export interface UserPublic {
  id: string;
  username: string;
  rating: number;
  checkersElo: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;
  createdAt: string;
  aiStats?: {
    easy: AiLevelStats;
    medium: AiLevelStats;
    hard: AiLevelStats;
  };
  chessGamesPlayed?: number;
  chessWins?: number;
  chessLosses?: number;
  chessDraws?: number;
  checkersGamesPlayed?: number;
  checkersWins?: number;
  checkersLosses?: number;
  checkersDraws?: number;
  checkersAiStats?: {
    easy: AiLevelStats;
    medium: AiLevelStats;
    hard: AiLevelStats;
  };
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  user: UserPublic;
  accessToken: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
}
