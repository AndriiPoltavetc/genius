import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import type { RegisterDto, LoginDto } from './auth.dto';
import type { AuthResponse, UserPublic } from '@genius/shared';

const SALT_ROUNDS = 10;

function toPublicUser(user: {
  id: string;
  email: string;
  username: string;
  rating: number;
  checkersElo: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;
  createdAt: Date;
}): UserPublic {
  return {
    id: user.id,
    username: user.username,
    rating: user.rating,
    checkersElo: user.checkersElo,
    gamesPlayed: user.gamesPlayed,
    gamesWon: user.gamesWon,
    gamesLost: user.gamesLost,
    gamesDrawn: user.gamesDrawn,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function register(dto: RegisterDto): Promise<AuthResponse> {
  logger.info('Register attempt', { email: dto.email, username: dto.username });

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: dto.email }, { username: dto.username }] },
  });

  if (existing) {
    const isEmailConflict = existing.email === dto.email;
    logger.warn('Register conflict', { field: isEmailConflict ? 'email' : 'username', email: dto.email, username: dto.username });
    throw new AppError(409, isEmailConflict ? 'Користувач з таким email вже існує' : 'Нікнейм вже зайнятий');
  }

  const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
  let user;
  try {
    user = await prisma.user.create({
      data: { email: dto.email, username: dto.username, passwordHash },
    });
  } catch (err) {
    logger.error('prisma.user.create failed', { err, email: dto.email });
    throw err;
  }
  logger.info('User registered', { userId: user.id, username: user.username });

  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, username: user.username },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as unknown as NonNullable<jwt.SignOptions['expiresIn']> },
  );

  return { user: toPublicUser(user), accessToken };
}

export async function login(dto: LoginDto): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({ where: { email: dto.email } });
  if (!user) throw new AppError(401, 'Invalid email or password');

  const valid = await bcrypt.compare(dto.password, user.passwordHash);
  if (!valid) throw new AppError(401, 'Invalid email or password');

  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, username: user.username },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as unknown as NonNullable<jwt.SignOptions['expiresIn']> },
  );

  return { user: toPublicUser(user), accessToken };
}
