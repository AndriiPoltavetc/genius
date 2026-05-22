import type { Server, Socket } from 'socket.io';

import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@genius/shared';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

type GeniusSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type GeniusServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export function registerChatHandlers(io: GeniusServer, socket: GeniusSocket): void {
  socket.on('chatMessage', async ({ gameId, content }) => {
    const { userId, username } = socket.data;

    if (!content.trim() || content.length > 500) return;

    try {
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        select: { whitePlayerId: true, blackPlayerId: true },
      });
      if (!game || (game.whitePlayerId !== userId && game.blackPlayerId !== userId)) return;

      const message = await prisma.chatMessage.create({
        data: { gameId, userId, content: content.trim() },
      });

      io.to(gameId).emit('chatMessage', {
        gameId,
        userId,
        username,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      });
    } catch (err) {
      logger.error('chatMessage error', { err, userId, gameId });
    }
  });
}
