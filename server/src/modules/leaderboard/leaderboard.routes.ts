import { Router } from 'express';
import { prisma } from '../../config/database';

export const leaderboardRoutes = Router();

leaderboardRoutes.get('/', async (req, res, next) => {
  try {
    const isCheckers = req.query['game'] === 'checkers';

    const users = await prisma.user.findMany({
      where: isCheckers ? {} : { gamesPlayed: { gte: 1 } },
      orderBy: isCheckers ? { checkersElo: 'desc' } : { rating: 'desc' },
      take: 100,
      select: {
        id: true,
        username: true,
        rating: true,
        checkersElo: true,
        gamesPlayed: true,
        gamesWon: true,
      },
    });

    const entries = users.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      username: u.username,
      rating: isCheckers ? u.checkersElo : u.rating,
      gamesPlayed: u.gamesPlayed,
      gamesWon: u.gamesWon,
      winRate: u.gamesPlayed > 0 ? Math.round((u.gamesWon / u.gamesPlayed) * 100) : 0,
    }));

    res.json(entries);
  } catch (err) {
    next(err);
  }
});
