"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocketIO = initSocketIO;
const socket_io_1 = require("socket.io");
const env_1 = require("../config/env");
const socketAuth_1 = require("./middleware/socketAuth");
const game_handler_1 = require("./handlers/game.handler");
const chat_handler_1 = require("./handlers/chat.handler");
const matchmaking_handler_1 = require("./handlers/matchmaking.handler");
const logger_1 = require("../utils/logger");
const matchmaking_service_1 = require("../modules/matchmaking/matchmaking.service");
function initSocketIO(httpServer) {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: [env_1.env.CORS_ORIGIN, 'http://localhost:5173'],
            credentials: true,
        },
    });
    io.use((socket, next) => void (0, socketAuth_1.socketAuthMiddleware)(socket, next));
    io.on('connection', (socket) => {
        const { userId, username } = socket.data;
        logger_1.logger.info('Socket connected', { userId, username, socketId: socket.id });
        (0, game_handler_1.registerGameHandlers)(io, socket);
        (0, chat_handler_1.registerChatHandlers)(io, socket);
        (0, matchmaking_handler_1.registerMatchmakingHandlers)(io, socket);
        socket.on('disconnect', async (reason) => {
            logger_1.logger.info('Socket disconnected', { userId, reason });
            await (0, matchmaking_service_1.removeFromQueue)(userId);
        });
    });
    return io;
}
//# sourceMappingURL=index.js.map