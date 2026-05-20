import { Router } from 'express';

import { authRateLimiter } from '../../middleware/rateLimiter';
import { authMiddleware } from '../../middleware/auth.middleware';
import { registerHandler, loginHandler, meHandler } from './auth.controller';

export const authRoutes = Router();

authRoutes.post('/register', authRateLimiter, registerHandler);
authRoutes.post('/login', authRateLimiter, loginHandler);
authRoutes.get('/me', authMiddleware, meHandler);
