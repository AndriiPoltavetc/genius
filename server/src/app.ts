import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { authRoutes } from './modules/auth/auth.routes';
import { gameRoutes } from './modules/games/game.routes';
import { userRoutes } from './modules/users/users.routes';
import { leaderboardRoutes } from './modules/leaderboard/leaderboard.routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  const allowedOrigins =
    env.NODE_ENV === 'production'
      ? [env.CORS_ORIGIN]
      : [env.CORS_ORIGIN, 'http://localhost:5173'];

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(rateLimiter);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/games', gameRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);

  app.use(errorHandler);

  return app;
}
