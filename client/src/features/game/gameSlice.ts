import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { GameState, GameResult, ResultReason } from '../../shared-types';

interface GameSliceState {
  currentGame: GameState | null;
  playerColor: 'w' | 'b' | null;
  opponentUsername: string | null;
  opponentRating: number | null;
  isSearching: boolean;
  gameEndResult: { result: GameResult; resultReason: ResultReason; ratingDelta?: number } | null;
}

const initialState: GameSliceState = {
  currentGame: null,
  playerColor: null,
  opponentUsername: null,
  opponentRating: null,
  isSearching: false,
  gameEndResult: null,
};

export const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    gameStarted(
      state,
      action: PayloadAction<{
        gameState: GameState;
        playerColor: 'w' | 'b';
        opponentUsername?: string;
        opponentRating?: number;
      }>,
    ) {
      state.currentGame = action.payload.gameState;
      state.playerColor = action.payload.playerColor;
      state.opponentUsername = action.payload.opponentUsername ?? 'AI';
      state.opponentRating = action.payload.opponentRating ?? null;
      state.isSearching = false;
      state.gameEndResult = null;
    },
    moveMade(state, action: PayloadAction<GameState>) {
      state.currentGame = action.payload;
    },
    gameEnded(
      state,
      action: PayloadAction<{ result: GameResult; resultReason: ResultReason; ratingDelta?: number }>,
    ) {
      state.gameEndResult = action.payload;
    },
    searchStarted(state) {
      state.isSearching = true;
    },
    searchCancelled(state) {
      state.isSearching = false;
    },
    gameReset(state) {
      state.currentGame = null;
      state.playerColor = null;
      state.opponentUsername = null;
      state.opponentRating = null;
      state.isSearching = false;
      state.gameEndResult = null;
    },
  },
});

export const { gameStarted, moveMade, gameEnded, searchStarted, searchCancelled, gameReset } =
  gameSlice.actions;
export default gameSlice.reducer;
