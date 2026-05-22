import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import type { AuthResponse, LoginRequest, RegisterRequest, UserPublic } from '../../shared-types';
import type { RootState } from '../../app/store';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env['VITE_API_URL'] as string}/api`,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.accessToken;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['User'],
  endpoints: (builder) => ({
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    me: builder.query<{ user: UserPublic }, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
    getUserById: builder.query<UserPublic, string>({
      query: (userId) => `/users/${userId}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
  }),
});

export const { useRegisterMutation, useLoginMutation, useMeQuery, useGetUserByIdQuery } = authApi;
