"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerChatHandlers = registerChatHandlers;
const database_1 = require("../../config/database");
const logger_1 = require("../../utils/logger");
function registerChatHandlers(io, socket) {
    socket.on('chatMessage', async ({ gameId, content }) => {
        const { userId, username } = socket.data;
        if (!content.trim() || content.length > 500)
            return;
        try {
            const message = await database_1.prisma.chatMessage.create({
                data: { gameId, userId, content: content.trim() },
            });
            io.to(gameId).emit('chatMessage', {
                gameId,
                userId,
                username,
                content: message.content,
                createdAt: message.createdAt.toISOString(),
            });
        }
        catch (err) {
            logger_1.logger.error('chatMessage error', { err, userId, gameId });
        }
    });
}
//# sourceMappingURL=chat.handler.js.map