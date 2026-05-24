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

    const [user, allChessGames] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          rating: true,
          checkersElo: true,
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
          endedAt: { not: null },
        },
        select: { aiLevel: true, result: true, whitePlayerId: true, isAiGame: true },
      }),
    ]);

    if (!user) throw new AppError(404, 'User not found');

    const aiStats = {
      easy: { played: 0, wins: 0 },
      medium: { played: 0, wins: 0 },
      hard: { played: 0, wins: 0 },
    };
    let chessGamesPlayed = 0, chessWins = 0, chessLosses = 0, chessDraws = 0;

    for (const game of allChessGames) {
      const isWhite = game.whitePlayerId === userId;
      chessGamesPlayed++;
      if (game.result === 'DRAW') chessDraws++;
      else if ((isWhite && game.result === 'WHITE_WIN') || (!isWhite && game.result === 'BLACK_WIN')) chessWins++;
      else chessLosses++;

      if (game.isAiGame && game.aiLevel) {
        const lvl = game.aiLevel.toLowerCase() as 'easy' | 'medium' | 'hard';
        aiStats[lvl].played++;
        if ((isWhite && game.result === 'WHITE_WIN') || (!isWhite && game.result === 'BLACK_WIN')) {
          aiStats[lvl].wins++;
        }
      }
    }

    const emptyStats = { played: 0, wins: 0 };
    res.json({
      ...user,
      aiStats,
      chessGamesPlayed,
      chessWins,
      chessLosses,
      chessDraws,
      checkersGamesPlayed: 0,
      checkersWins: 0,
      checkersLosses: 0,
      checkersDraws: 0,
      checkersAiStats: { easy: emptyStats, medium: emptyStats, hard: emptyStats },
    });
  } catch (err) {
    next(err);
  }
});
