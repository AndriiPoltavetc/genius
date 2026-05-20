"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGame = createGame;
exports.getActiveGame = getActiveGame;
exports.applyMove = applyMove;
exports.finalizeGame = finalizeGame;
exports.getGameHistory = getGameHistory;
exports.getGameById = getGameById;
const chess_js_1 = require("chess.js");
const database_1 = require("../../config/database");
const redis_1 = require("../../config/redis");
const errorHandler_1 = require("../../middleware/errorHandler");
const elo_service_1 = require("../ratings/elo.service");
const INITIAL_TIME_MS = 10 * 60 * 1000; // 10 minutes
async function createGame(whitePlayerId, blackPlayerId, isAiGame, aiLevel) {
    const chess = new chess_js_1.Chess();
    const game = await database_1.prisma.game.create({
        data: {
            whitePlayerId,
            blackPlayerId,
            isAiGame,
            aiLevel,
            pgn: chess.pgn(),
            finalFen: chess.fen(),
            result: 'WHITE_WIN', // placeholder, updated on game end
            resultReason: 'CHECKMATE',
        },
    });
    const state = {
        gameId: game.id,
        fen: chess.fen(),
        pgn: chess.pgn(),
        whitePlayerId,
        blackPlayerId,
        isAiGame,
        aiLevel,
        whiteTimeMs: INITIAL_TIME_MS,
        blackTimeMs: INITIAL_TIME_MS,
        lastMoveAt: Date.now(),
        turn: 'w',
    };
    await redis_1.redis.set(redis_1.REDIS_KEYS.activeGame(game.id), JSON.stringify(state), 'EX', 7200);
    if (blackPlayerId) {
        await redis_1.redis.set(redis_1.REDIS_KEYS.playerGame(blackPlayerId), game.id, 'EX', 7200);
    }
    await redis_1.redis.set(redis_1.REDIS_KEYS.playerGame(whitePlayerId), game.id, 'EX', 7200);
    return state;
}
async function getActiveGame(gameId) {
    const data = await redis_1.redis.get(redis_1.REDIS_KEYS.activeGame(gameId));
    if (!data)
        return null;
    return JSON.parse(data);
}
async function applyMove(gameId, from, to, promotion) {
    const state = await getActiveGame(gameId);
    if (!state)
        throw new errorHandler_1.AppError(404, 'Game not found or already finished');
    const chess = new chess_js_1.Chess(state.fen);
    chess.loadPgn(state.pgn);
    const now = Date.now();
    const elapsed = now - state.lastMoveAt;
    if (state.turn === 'w') {
        state.whiteTimeMs = Math.max(0, state.whiteTimeMs - elapsed);
    }
    else {
        state.blackTimeMs = Math.max(0, state.blackTimeMs - elapsed);
    }
    const moveResult = chess.move({ from, to, promotion });
    if (!moveResult)
        throw new errorHandler_1.AppError(400, `Illegal move: ${from}${to}`);
    state.fen = chess.fen();
    state.pgn = chess.pgn();
    state.turn = chess.turn();
    state.lastMoveAt = now;
    await redis_1.redis.set(redis_1.REDIS_KEYS.activeGame(gameId), JSON.stringify(state), 'EX', 7200);
    await database_1.prisma.move.create({
        data: {
            gameId,
            moveNumber: chess.history().length,
            san: moveResult.san,
            uci: `${from}${to}${promotion ?? ''}`,
            fenAfter: chess.fen(),
            timeSpentMs: elapsed,
        },
    });
    return state;
}
async function finalizeGame(gameId, result, resultReason) {
    const state = await getActiveGame(gameId);
    if (!state)
        return;
    const chess = new chess_js_1.Chess(state.fen);
    let whiteRatingAfter;
    let blackRatingAfter;
    let whiteRatingBefore;
    let blackRatingBefore;
    if (!state.isAiGame && state.blackPlayerId) {
        const [white, black] = await Promise.all([
            database_1.prisma.user.findUnique({ where: { id: state.whitePlayerId } }),
            database_1.prisma.user.findUnique({ where: { id: state.blackPlayerId } }),
        ]);
        if (white && black) {
            whiteRatingBefore = white.rating;
            blackRatingBefore = black.rating;
            const eloResult = (0, elo_service_1.calculateElo)(white.rating, black.rating, result === 'WHITE_WIN' ? 'white' : result === 'BLACK_WIN' ? 'black' : 'draw');
            whiteRatingAfter = eloResult.whiteRatingAfter;
            blackRatingAfter = eloResult.blackRatingAfter;
            await Promise.all([
                database_1.prisma.user.update({
                    where: { id: state.whitePlayerId },
                    data: {
                        rating: whiteRatingAfter,
                        gamesPlayed: { increment: 1 },
                        gamesWon: result === 'WHITE_WIN' ? { increment: 1 } : undefined,
                        gamesLost: result === 'BLACK_WIN' ? { increment: 1 } : undefined,
                        gamesDrawn: result === 'DRAW' ? { increment: 1 } : undefined,
                    },
                }),
                database_1.prisma.user.update({
                    where: { id: state.blackPlayerId },
                    data: {
                        rating: blackRatingAfter,
                        gamesPlayed: { increment: 1 },
                        gamesWon: result === 'BLACK_WIN' ? { increment: 1 } : undefined,
                        gamesLost: result === 'WHITE_WIN' ? { increment: 1 } : undefined,
                        gamesDrawn: result === 'DRAW' ? { increment: 1 } : undefined,
                    },
                }),
            ]);
        }
    }
    else if (state.isAiGame) {
        await database_1.prisma.user.update({
            where: { id: state.whitePlayerId },
            data: { gamesPlayed: { increment: 1 } },
        });
    }
    await database_1.prisma.game.update({
        where: { id: gameId },
        data: {
            pgn: chess.pgn(),
            finalFen: chess.fen(),
            result,
            resultReason,
            whiteRatingBefore,
            blackRatingBefore,
            whiteRatingAfter,
            blackRatingAfter,
            endedAt: new Date(),
        },
    });
    // Clean up Redis
    await redis_1.redis.del(redis_1.REDIS_KEYS.activeGame(gameId));
    await redis_1.redis.del(redis_1.REDIS_KEYS.playerGame(state.whitePlayerId));
    if (state.blackPlayerId) {
        await redis_1.redis.del(redis_1.REDIS_KEYS.playerGame(state.blackPlayerId));
    }
}
async function getGameHistory(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [games, total] = await Promise.all([
        database_1.prisma.game.findMany({
            where: {
                OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
                endedAt: { not: null },
            },
            orderBy: { startedAt: 'desc' },
            skip,
            take: limit,
            include: {
                whitePlayer: { select: { id: true, username: true, rating: true } },
                blackPlayer: { select: { id: true, username: true, rating: true } },
                _count: { select: { moves: true } },
            },
        }),
        database_1.prisma.game.count({
            where: {
                OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
                endedAt: { not: null },
            },
        }),
    ]);
    return { games, total, page, limit };
}
async function getGameById(gameId) {
    const game = await database_1.prisma.game.findUnique({
        where: { id: gameId },
        include: {
            whitePlayer: { select: { id: true, username: true, rating: true } },
            blackPlayer: { select: { id: true, username: true, rating: true } },
            moves: { orderBy: { moveNumber: 'asc' } },
        },
    });
    if (!game)
        throw new errorHandler_1.AppError(404, 'Game not found');
    return game;
}
//# sourceMappingURL=game.service.js.map