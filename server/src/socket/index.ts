import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';

import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@genius/shared';
import { env } from '../config/env';
import { socketAuthMiddleware } from './middleware/socketAuth';
import { registerGameHandlers } from './handlers/game.handler';
import { registerChatHandlers } from './handlers/chat.handler';
import { registerMatchmakingHandlers } from './handlers/matchmaking.handler';
import { logger } from '../utils/logger';
import { removeFromQueue } from '../modules/matchmaking/matchmaking.service';

export function initSocketIO(httpServer: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(
    httpServer,
    {
      cors: {
        origin: [env.CORS_ORIGIN, 'http://localhost:5173'],
        credentials: true,
      },
    },
  );

  io.use((socket, next) => void socketAuthMiddleware(socket, next));

  io.on('connection', (socket) => {
    const { userId, username } = socket.data;
    logger.info('Socket connected', { userId, username, socketId: socket.id });

    registerGameHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerMatchmakingHandlers(io, socket);

    socket.on('disconnect', async (reason) => {
      logger.info('Socket disconnected', { userId, reason });
      await removeFromQueue(userId);
    });
  });

  return io;
}
