import { Router } from 'express';
import { prisma } from '../../config/database';

export const leaderboardRoutes = Router();

leaderboardRoutes.get('/', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { gamesPlayed: { gte: 1 } },
      orderBy: { rating: 'desc' },
      take: 100,
      select: {
        id: true,
        username: true,
        rating: true,
        gamesPlayed: true,
        gamesWon: true,
        gamesLost: true,
        gamesDrawn: true,
      },
    });

    const entries = users.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      username: u.username,
      rating: u.rating,
      gamesPlayed: u.gamesPlayed,
      gamesWon: u.gamesWon,
      winRate: u.gamesPlayed > 0 ? Math.round((u.gamesWon / u.gamesPlayed) * 100) : 0,
    }));

    res.json(entries);
  } catch (err) {
    next(err);
  }
});
