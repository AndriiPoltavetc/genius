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
          checkersAiEasyPlayed: true,
          checkersAiEasyWins: true,
          checkersAiMediumPlayed: true,
          checkersAiMediumWins: true,
          checkersAiHardPlayed: true,
          checkersAiHardWins: true,
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

    const checkersGamesPlayed = Math.max(0, (user.gamesPlayed) - chessGamesPlayed);
    const checkersWins = Math.max(0, (user.gamesWon) - chessWins);
    const checkersLosses = Math.max(0, (user.gamesLost) - chessLosses);
    const checkersDraws = Math.max(0, (user.gamesDrawn) - chessDraws);

    res.json({
      ...user,
      aiStats,
      chessGamesPlayed,
      chessWins,
      chessLosses,
      chessDraws,
      checkersGamesPlayed,
      checkersWins,
      checkersLosses,
      checkersDraws,
      checkersAiStats: {
        easy: { played: user.checkersAiEasyPlayed, wins: user.checkersAiEasyWins },
        medium: { played: user.checkersAiMediumPlayed, wins: user.checkersAiMediumWins },
        hard: { played: user.checkersAiHardPlayed, wins: user.checkersAiHardWins },
      },
    });
  } catch (err) {
    next(err);
  }
});
