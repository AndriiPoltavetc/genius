import { Router } from 'express';
import { prisma } from '../../config/database';

export const leaderboardRoutes = Router();

leaderboardRoutes.get('/', async (req, res, next) => {
  try {
    const isCheckers = req.query['game'] === 'checkers';

    const [users, allGames] = await Promise.all([
      prisma.user.findMany({
        orderBy: isCheckers ? { checkersElo: 'desc' } : { rating: 'desc' },
        take: 100,
        select: { id: true, username: true, rating: true, checkersElo: true },
      }),
      prisma.game.findMany({
        where: { isAiGame: false, endedAt: { not: null } },
        select: { whitePlayerId: true, blackPlayerId: true, result: true, gameType: true },
      }),
    ]);

    // Aggregate per-user per-gameType stats
    const stats = new Map<string, Record<'CHESS' | 'CHECKERS', { played: number; won: number }>>();
    for (const g of allGames) {
      const type = g.gameType as 'CHESS' | 'CHECKERS';
      for (const [uid, isWhite] of [
        [g.whitePlayerId, true],
        [g.blackPlayerId, false],
      ] as [string | null, boolean][]) {
        if (!uid) continue;
        if (!stats.has(uid)) stats.set(uid, { CHESS: { played: 0, won: 0 }, CHECKERS: { played: 0, won: 0 } });
        const s = stats.get(uid)![type];
        s.played++;
        if ((isWhite && g.result === 'WHITE_WIN') || (!isWhite && g.result === 'BLACK_WIN')) s.won++;
      }
    }

    const entries = users
      .map((u, i) => {
        const chess = stats.get(u.id)?.['CHESS'] ?? { played: 0, won: 0 };
        const checkers = stats.get(u.id)?.['CHECKERS'] ?? { played: 0, won: 0 };
        const active = isCheckers ? checkers : chess;
        return {
          rank: i + 1,
          userId: u.id,
          username: u.username,
          rating: isCheckers ? u.checkersElo : u.rating,
          gamesPlayed: active.played,
          gamesWon: active.won,
          winRate: active.played > 0 ? Math.round((active.won / active.played) * 100) : 0,
          chessGamesPlayed: chess.played,
          chessWinRate: chess.played > 0 ? Math.round((chess.won / chess.played) * 100) : 0,
          checkersGamesPlayed: checkers.played,
          checkersWinRate: checkers.played > 0 ? Math.round((checkers.won / checkers.played) * 100) : 0,
        };
      })
      .filter((e) => (isCheckers ? e.checkersGamesPlayed > 0 || e.rating > 1200 : e.chessGamesPlayed > 0))
      .slice(0, 10);

    res.json(entries);
  } catch (err) {
    next(err);
  }
});
