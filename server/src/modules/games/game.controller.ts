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
    const userId = req.user!.userId;
    const page = Number(req.query['page'] ?? 1);
    const limit = Number(req.query['limit'] ?? 20);
    const result = await gameService.getGameHistory(userId, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
