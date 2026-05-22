import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { UserPublic } from '../../shared-types';

interface AuthState {
  user: UserPublic | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

const storedToken = localStorage.getItem('accessToken');
const storedUser = localStorage.getItem('user');

const initialState: AuthState = {
  user: storedUser ? (JSON.parse(storedUser) as UserPublic) : null,
  accessToken: storedToken,
  isAuthenticated: Boolean(storedToken),
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: UserPublic; accessToken: string }>) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      localStorage.setItem('accessToken', action.payload.accessToken);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    updateUser(state, action: PayloadAction<UserPublic>) {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    },
  },
});

export const { setCredentials, updateUser, logout } = authSlice.actions;
export default authSlice.reducer;
