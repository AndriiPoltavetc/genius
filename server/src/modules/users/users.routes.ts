import { Router } from 'express';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export const userRoutes = Router();

userRoutes.get('/:userId', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params['userId'] },
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
    });
    if (!user) throw new AppError(404, 'User not found');
    res.json(user);
  } catch (err) {
    next(err);
  }
});
