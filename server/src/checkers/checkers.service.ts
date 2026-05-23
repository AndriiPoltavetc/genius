import { Worker } from 'worker_threads';
import path from 'path';

import {
  createInitialBoard,
  getValidMoves,
  applyMove,
  checkGameOver,
  isValidMove,
  boardToString,
} from './checkers.engine';
import { findBestMoveSync } from './checkers.ai';
import type { Board, Color, CheckersMove } from './checkers.engine';
import { logger } from '../utils/logger';

export type CheckersDifficulty = 'easy' | 'medium' | 'hard';

export interface CheckersGameState {
  gameId: string;
  board: Board;
  turn: Color;
  moveCount: number;
  movesSinceCapture: number;
  isOver: boolean;
  winner: Color | 'draw' | null;
  lastMove: CheckersMove | null;
  isAiGame: boolean;
  difficulty?: CheckersDifficulty;
  players: { white: string; black: string | null }; // null = AI
}

const DEPTH_MAP: Record<CheckersDifficulty, number> = {
  easy: 1,
  medium: 3,
  hard: 5,
};

const DELAY_MAP: Record<CheckersDifficulty, number> = {
  easy: 800,
  medium: 400,
  hard: 0,
};

// In-memory store
export const checkersGames = new Map<string, CheckersGameState>();

export function createCheckersGame(
  gameId: string,
  humanPlayerId: string,
  humanColor: Color,
  isAiGame: boolean,
  difficulty?: CheckersDifficulty,
  opponentId?: string,
): CheckersGameState {
  const aiColor: Color = humanColor === 'white' ? 'black' : 'white';
  const state: CheckersGameState = {
    gameId,
    board: createInitialBoard(),
    turn: 'white',
    moveCount: 0,
    movesSinceCapture: 0,
    isOver: false,
    winner: null,
    lastMove: null,
    isAiGame,
    difficulty,
    players: isAiGame
      ? { white: humanColor === 'white' ? humanPlayerId : 'AI', black: humanColor === 'black' ? humanPlayerId : null }
      : { white: humanColor === 'white' ? humanPlayerId : (opponentId ?? ''), black: humanColor === 'black' ? humanPlayerId : (opponentId ?? '') },
  };
  checkersGames.set(gameId, state);
  return state;
}

export function applyCheckersMove(gameId: string, move: CheckersMove): CheckersGameState | null {
  const state = checkersGames.get(gameId);
  if (!state || state.isOver) return null;
  if (!isValidMove(state.board, move, state.turn)) return null;

  state.board = applyMove(state.board, move);
  state.lastMove = move;
  state.moveCount++;
  state.movesSinceCapture = move.captures.length > 0 ? 0 : state.movesSinceCapture + 1;
  state.turn = state.turn === 'white' ? 'black' : 'white';

  const result = checkGameOver(state.board, state.turn, state.movesSinceCapture);
  if (result !== null) {
    state.isOver = true;
    state.winner = result;
  }

  return state;
}

function getAiMoveViaWorker(board: Board, color: Color, depth: number): Promise<CheckersMove | null> {
  return new Promise((resolve) => {
    const workerPath = path.join(__dirname, 'checkers.worker.js');
    const worker = new Worker(workerPath, { workerData: { board, color, depth } });

    const timer = setTimeout(() => {
      void worker.terminate();
      const fallback = findBestMoveSync(board, color, 1);
      resolve(fallback.bestMove);
    }, 8000);

    worker.on('message', (result: { move: CheckersMove | null }) => {
      clearTimeout(timer);
      resolve(result.move);
    });

    worker.on('error', () => {
      clearTimeout(timer);
      const fallback = findBestMoveSync(board, color, 1);
      resolve(fallback.bestMove);
    });

    worker.on('exit', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        const fallback = findBestMoveSync(board, color, 1);
        resolve(fallback.bestMove);
      }
    });
  });
}

export async function computeAiMove(
  gameId: string,
  onMove: (state: CheckersGameState, aiMove: CheckersMove) => void,
): Promise<void> {
  const state = checkersGames.get(gameId);
  if (!state || state.isOver || !state.isAiGame) return;

  const difficulty = state.difficulty ?? 'medium';
  const depth = DEPTH_MAP[difficulty];
  const delay = DELAY_MAP[difficulty];
  const aiColor: Color = state.turn;

  // Random move for easy (30% chance)
  const moves = getValidMoves(state.board, aiColor);
  if (moves.length === 0) return;

  if (delay > 0) await new Promise<void>((r) => setTimeout(r, delay));

  let aiMove: CheckersMove | null = null;

  if (difficulty === 'easy' && Math.random() < 0.3) {
    aiMove = moves[Math.floor(Math.random() * moves.length)] ?? null;
  } else {
    try {
      aiMove = await getAiMoveViaWorker(state.board, aiColor, depth);
    } catch {
      const sync = findBestMoveSync(state.board, aiColor, 1);
      aiMove = sync.bestMove;
    }
  }

  if (!aiMove) {
    aiMove = moves[0] ?? null;
  }

  if (!aiMove) return;

  const updatedState = applyCheckersMove(gameId, aiMove);
  if (updatedState) {
    onMove(updatedState, aiMove);
  }
}

export function serializeBoard(state: CheckersGameState) {
  return {
    gameId: state.gameId,
    board: state.board,
    turn: state.turn,
    moveCount: state.moveCount,
    isOver: state.isOver,
    winner: state.winner,
    lastMove: state.lastMove,
    validMoves: state.isOver ? [] : getValidMoves(state.board, state.turn),
  };
}
