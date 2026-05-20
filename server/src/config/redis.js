"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.REDIS_KEYS = exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
const logger_1 = require("../utils/logger");
exports.redis = new ioredis_1.default(env_1.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 100, 3000),
});
exports.redis.on('connect', () => logger_1.logger.info('Redis connected'));
exports.redis.on('error', (err) => logger_1.logger.error('Redis error', { err }));
// Key namespaces
exports.REDIS_KEYS = {
    matchmakingQueue: 'matchmaking:queue',
    activeGame: (gameId) => `game:active:${gameId}`,
    gameTimer: (gameId) => `game:timer:${gameId}`,
    playerGame: (userId) => `player:game:${userId}`,
};
//# sourceMappingURL=redis.js.map