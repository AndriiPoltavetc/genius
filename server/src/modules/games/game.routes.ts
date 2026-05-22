import { Router } from 'express';

import { authMiddleware } from '../../middleware/auth.middleware';
import { getGameHandler, getHistoryHandler } from './game.controller';

export const gameRoutes = Router();

gameRoutes.get('/history', authMiddleware, getHistoryHandler);
gameRoutes.get('/:gameId', authMiddleware, getGameHandler);
