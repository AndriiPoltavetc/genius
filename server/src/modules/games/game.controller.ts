import { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware';
import * as gameService from './game.service';

export async function getGameHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const game = await gameService.getGameById(req.params['gameId'] as string);
    res.json(game);
  } catch (err) {
    next(err);
  }
}

export async function getHistoryHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.userId as string;
    const page = Number((req as any).query?.['page'] ?? 1);
    const limit = Number((req as any).query?.['limit'] ?? 20);
    const result = await gameService.getGameHistory(userId, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
