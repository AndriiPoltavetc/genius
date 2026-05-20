import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

import { env } from '../../config/env';
import { prisma } from '../../config/database';
import type { AuthTokenPayload } from '@genius/shared';
import type { SocketData } from '@genius/shared';

export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> {
  const token =
    (socket.handshake.auth as { token?: string }).token ??
    socket.handshake.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    next(new Error('Authentication required'));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, rating: true },
    });

    if (!user) {
      next(new Error('User not found'));
      return;
    }

    (socket.data as SocketData) = {
      userId: user.id,
      username: user.username,
      rating: user.rating,
    };

    next();
  } catch {
    next(new Error('Invalid token'));
  }
}
