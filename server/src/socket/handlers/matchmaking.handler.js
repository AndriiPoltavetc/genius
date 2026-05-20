"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMatchmakingHandlers = registerMatchmakingHandlers;
const matchmaking_service_1 = require("../../modules/matchmaking/matchmaking.service");
const game_service_1 = require("../../modules/games/game.service");
const logger_1 = require("../../utils/logger");
const chess_js_1 = require("chess.js");
function registerMatchmakingHandlers(io, socket) {
    const { userId, username, rating } = socket.data;
    socket.on('joinQueue', async () => {
        try {
            await (0, matchmaking_service_1.addToQueue)({ userId, username, rating, joinedAt: Date.now() });
            socket.emit('queueJoined');
            const match = await (0, matchmaking_service_1.findMatch)();
            if (!match)
                return;
            const [playerA, playerB] = match;
            // Randomly assign colors
            const [white, black] = Math.random() < 0.5 ? [playerA, playerB] : [playerB, playerA];
            const state = await (0, game_service_1.createGame)(white.userId, black.userId, false);
            const chess = new chess_js_1.Chess();
            const gameStateBase = {
                id: state.gameId,
                fen: chess.fen(),
                pgn: chess.pgn(),
                turn: 'w',
                moves: [],
                isCheck: false,
                isCheckmate: false,
                isStalemate: false,
                isDraw: false,
                isGameOver: false,
                whiteTimeMs: state.whiteTimeMs,
                blackTimeMs: state.blackTimeMs,
                isAiGame: false,
                whitePlayerId: white.userId,
                blackPlayerId: black.userId,
            };
            const whiteSocket = [...io.sockets.sockets.values()].find((s) => s.data.userId === white.userId);
            const blackSocket = [...io.sockets.sockets.values()].find((s) => s.data.userId === black.userId);
            if (whiteSocket) {
                await whiteSocket.join(state.gameId);
                whiteSocket.data.currentGameId = state.gameId;
                whiteSocket.emit('gameStart', {
                    gameId: state.gameId,
                    playerColor: 'w',
                    gameState: gameStateBase,
                    opponent: { id: black.userId, username: black.username, rating: black.rating },
                });
            }
            if (blackSocket) {
                await blackSocket.join(state.gameId);
                blackSocket.data.currentGameId = state.gameId;
                blackSocket.emit('gameStart', {
                    gameId: state.gameId,
                    playerColor: 'b',
                    gameState: gameStateBase,
                    opponent: { id: white.userId, username: white.username, rating: white.rating },
                });
            }
        }
        catch (err) {
            logger_1.logger.error('joinQueue error', { err, userId });
            socket.emit('error', { code: 'QUEUE_ERROR', message: 'Failed to join queue' });
        }
    });
    socket.on('leaveQueue', async () => {
        try {
            await (0, matchmaking_service_1.removeFromQueue)(userId);
            socket.emit('queueLeft');
        }
        catch (err) {
            logger_1.logger.error('leaveQueue error', { err, userId });
        }
    });
}
//# sourceMappingURL=matchmaking.handler.js.map