import Redis from 'ioredis';

import { env } from './env';
import { logger } from '../utils/logger';

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error('Redis error', { err }));

// Key namespaces
export const REDIS_KEYS = {
  matchmakingQueue: 'matchmaking:queue',
  activeGame: (gameId: string) => `game:active:${gameId}`,
  gameTimer: (gameId: string) => `game:timer:${gameId}`,
  playerGame: (userId: string) => `player:game:${userId}`,
} as const;
