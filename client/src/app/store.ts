import { configureStore } from '@reduxjs/toolkit';

import { authApi } from '../features/auth/authApi';
import authReducer from '../features/auth/authSlice';
import gameReducer from '../features/game/gameSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    game: gameReducer,
    [authApi.reducerPath]: authApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(authApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
