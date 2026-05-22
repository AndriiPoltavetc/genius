import { Router } from 'express';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { authMiddleware, type AuthRequest } from '../../middleware/auth.middleware';

export const userRoutes = Router();

userRoutes.patch('/profile', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { username } = req.body as { username?: string };
    const trimmed = username?.trim() ?? '';
    if (trimmed.length < 2 || trimmed.length > 20) {
      res.status(400).json({ error: 'Нікнейм 2–20 символів' });
      return;
    }
    const userId = req.user!.userId;
    const existing = await prisma.user.findUnique({ where: { username: trimmed } });
    if (existing && existing.id !== userId) {
      res.status(409).json({ error: 'Нікнейм вже зайнятий' });
      return;
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { username: trimmed },
    });
    res.json({ username: updated.username });
  } catch (err) {
    next(err);
  }
});

userRoutes.get('/:userId', async (req, res, next) => {
  try {
    const userId = req.params['userId'] as string;

    const [user, aiGames] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          rating: true,
          gamesPlayed: true,
          gamesWon: true,
          gamesLost: true,
          gamesDrawn: true,
          createdAt: true,
        },
      }),
      prisma.game.findMany({
        where: {
          OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
          isAiGame: true,
          endedAt: { not: null },
        },
        select: { aiLevel: true, result: true, whitePlayerId: true },
      }),
    ]);

    if (!user) throw new AppError(404, 'User not found');

    const aiStats = {
      easy: { played: 0, wins: 0 },
      medium: { played: 0, wins: 0 },
      hard: { played: 0, wins: 0 },
    };
    for (const game of aiGames) {
      if (!game.aiLevel) continue;
      const lvl = game.aiLevel.toLowerCase() as 'easy' | 'medium' | 'hard';
      aiStats[lvl].played++;
      const isWhite = game.whitePlayerId === userId;
      if ((isWhite && game.result === 'WHITE_WIN') || (!isWhite && game.result === 'BLACK_WIN')) {
        aiStats[lvl].wins++;
      }
    }

    res.json({ ...user, aiStats });
  } catch (err) {
    next(err);
  }
});
