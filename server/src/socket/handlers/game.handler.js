"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGameHandlers = registerGameHandlers;
const chess_js_1 = require("chess.js");
const game_service_1 = require("../../modules/games/game.service");
const aiService_1 = require("../../ai/aiService");
const chess_1 = require("../../utils/chess");
const logger_1 = require("../../utils/logger");
function registerGameHandlers(io, socket) {
    const { userId, username } = socket.data;
    socket.on('startAiGame', async ({ level }) => {
        try {
            const state = await (0, game_service_1.createGame)(userId, undefined, true, level);
            await socket.join(state.gameId);
            socket.data.currentGameId = state.gameId;
            const chess = new chess_js_1.Chess(state.fen);
            socket.emit('gameStart', {
                gameId: state.gameId,
                playerColor: 'w',
                gameState: {
                    id: state.gameId,
                    fen: state.fen,
                    pgn: state.pgn,
                    turn: chess.turn(),
                    moves: [],
                    isCheck: chess.inCheck(),
                    isCheckmate: chess.isCheckmate(),
                    isStalemate: chess.isStalemate(),
                    isDraw: chess.isDraw(),
                    isGameOver: chess.isGameOver(),
                    whiteTimeMs: state.whiteTimeMs,
                    blackTimeMs: state.blackTimeMs,
                    isAiGame: true,
                    aiLevel: level,
                    whitePlayerId: userId,
                },
            });
        }
        catch (err) {
            logger_1.logger.error('startAiGame error', { err });
            socket.emit('error', { code: 'START_GAME_ERROR', message: 'Failed to start game' });
        }
    });
    socket.on('move', async ({ gameId, from, to, promotion }) => {
        try {
            const state = await (0, game_service_1.applyMove)(gameId, from, to, promotion);
            const chess = new chess_js_1.Chess();
            chess.loadPgn(state.pgn);
            const move = chess.history({ verbose: true }).at(-1);
            if (!move)
                return;
            const movePayload = {
                from: move.from,
                to: move.to,
                san: move.san,
                uci: `${move.from}${move.to}${move.promotion ?? ''}`,
                fenAfter: chess.fen(),
                moveNumber: chess.history().length,
                timeSpentMs: 0,
            };
            if (chess.isGameOver()) {
                const reason = (0, chess_1.getGameOverReason)(chess);
                const result = chess.isCheckmate()
                    ? state.turn === 'w' ? 'BLACK_WIN' : 'WHITE_WIN' // current turn = loser after checkmate
                    : 'DRAW';
                io.to(gameId).emit('move', {
                    gameId,
                    move: movePayload,
                    gameState: { ...buildGameState(state.gameId, chess, state), result, resultReason: reason ?? undefined },
                });
                io.to(gameId).emit('gameEnd', { gameId, result, resultReason: reason ?? 'CHECKMATE' });
                await (0, game_service_1.finalizeGame)(gameId, result, reason ?? 'CHECKMATE');
                return;
            }
            io.to(gameId).emit('move', {
                gameId,
                move: movePayload,
                gameState: buildGameState(state.gameId, chess, state),
            });
            // If AI game and it's AI's turn (Black)
            if (state.isAiGame && state.turn === 'b' && state.aiLevel) {
                const aiResult = await (0, aiService_1.getBestMove)(chess.fen(), state.aiLevel);
                const aiFen = new chess_js_1.Chess(chess.fen());
                const aiMove = aiFen.move(aiResult.move);
                if (aiMove) {
                    const updatedState = await (0, game_service_1.applyMove)(gameId, aiMove.from, aiMove.to, aiMove.promotion);
                    const updatedChess = new chess_js_1.Chess(updatedState.fen);
                    const aiMovePayload = {
                        from: aiMove.from,
                        to: aiMove.to,
                        san: aiMove.san,
                        uci: `${aiMove.from}${aiMove.to}${aiMove.promotion ?? ''}`,
                        fenAfter: updatedChess.fen(),
                        moveNumber: updatedChess.history().length,
                        timeSpentMs: aiResult.timeMs,
                    };
                    if (updatedChess.isGameOver()) {
                        const reason = (0, chess_1.getGameOverReason)(updatedChess);
                        const result = updatedChess.isCheckmate() ? 'BLACK_WIN' : 'DRAW';
                        io.to(gameId).emit('move', {
                            gameId,
                            move: aiMovePayload,
                            gameState: { ...buildGameState(gameId, updatedChess, updatedState), result, resultReason: reason ?? undefined },
                        });
                        io.to(gameId).emit('gameEnd', { gameId, result, resultReason: reason ?? 'CHECKMATE' });
                        await (0, game_service_1.finalizeGame)(gameId, result, reason ?? 'CHECKMATE');
                    }
                    else {
                        io.to(gameId).emit('move', {
                            gameId,
                            move: aiMovePayload,
                            gameState: buildGameState(gameId, updatedChess, updatedState),
                        });
                    }
                }
            }
        }
        catch (err) {
            logger_1.logger.error('move error', { err, userId, gameId });
            socket.emit('error', { code: 'MOVE_ERROR', message: 'Invalid or illegal move' });
        }
    });
    socket.on('resign', async () => {
        try {
            const game = await (0, game_service_1.getActiveGame)(socket.data.currentGameId ?? '');
            if (!game)
                return;
            const result = game.whitePlayerId === userId ? 'BLACK_WIN' : 'WHITE_WIN';
            io.to(game.gameId).emit('gameEnd', { gameId: game.gameId, result, resultReason: 'RESIGN' });
            await (0, game_service_1.finalizeGame)(game.gameId, result, 'RESIGN');
        }
        catch (err) {
            logger_1.logger.error('resign error', { err, userId });
        }
    });
    void username; // used implicitly via socket.data
}
function buildGameState(gameId, chess, state) {
    return {
        id: gameId,
        fen: chess.fen(),
        pgn: chess.pgn(),
        turn: chess.turn(),
        moves: [],
        isCheck: chess.inCheck(),
        isCheckmate: chess.isCheckmate(),
        isStalemate: chess.isStalemate(),
        isDraw: chess.isDraw(),
        isGameOver: chess.isGameOver(),
        whiteTimeMs: state.whiteTimeMs,
        blackTimeMs: state.blackTimeMs,
        isAiGame: state.isAiGame,
        whitePlayerId: state.whitePlayerId,
        blackPlayerId: state.blackPlayerId,
    };
}
//# sourceMappingURL=game.handler.js.map