"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addToQueue = addToQueue;
exports.removeFromQueue = removeFromQueue;
exports.findMatch = findMatch;
const redis_1 = require("../../config/redis");
const logger_1 = require("../../utils/logger");
const INITIAL_RANGE = 100;
const RANGE_EXPANSION_STEP = 100;
const RANGE_EXPANSION_INTERVAL_MS = 30_000;
const MAX_RANGE = 500;
async function addToQueue(player) {
    await redis_1.redis.zadd(redis_1.REDIS_KEYS.matchmakingQueue, player.rating, JSON.stringify(player));
    logger_1.logger.debug('Player added to matchmaking queue', { userId: player.userId, rating: player.rating });
}
async function removeFromQueue(userId) {
    const members = await redis_1.redis.zrange(redis_1.REDIS_KEYS.matchmakingQueue, 0, -1);
    for (const member of members) {
        const player = JSON.parse(member);
        if (player.userId === userId) {
            await redis_1.redis.zrem(redis_1.REDIS_KEYS.matchmakingQueue, member);
            break;
        }
    }
}
/**
 * Find a match for the player at the front of the queue.
 * Returns a pair of players if found, or null.
 */
async function findMatch() {
    const now = Date.now();
    const members = await redis_1.redis.zrange(redis_1.REDIS_KEYS.matchmakingQueue, 0, -1, 'WITHSCORES');
    // Parse into player objects with their ratings
    const players = [];
    for (let i = 0; i < members.length; i += 2) {
        players.push(JSON.parse(members[i]));
    }
    if (players.length < 2)
        return null;
    for (let i = 0; i < players.length; i++) {
        const a = players[i];
        if (!a)
            continue;
        const waitMs = now - a.joinedAt;
        const expansions = Math.floor(waitMs / RANGE_EXPANSION_INTERVAL_MS);
        const range = Math.min(INITIAL_RANGE + expansions * RANGE_EXPANSION_STEP, MAX_RANGE);
        for (let j = i + 1; j < players.length; j++) {
            const b = players[j];
            if (!b)
                continue;
            if (Math.abs(a.rating - b.rating) <= range) {
                // Remove both from queue
                await removeFromQueue(a.userId);
                await removeFromQueue(b.userId);
                return [a, b];
            }
        }
    }
    return null;
}
//# sourceMappingURL=matchmaking.service.js.map