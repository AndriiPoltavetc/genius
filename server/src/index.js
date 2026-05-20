"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const http_1 = __importDefault(require("http"));
const app_1 = require("./app");
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const socket_1 = require("./socket");
const logger_1 = require("./utils/logger");
async function bootstrap() {
    await redis_1.redis.connect();
    const app = (0, app_1.createApp)();
    const server = http_1.default.createServer(app);
    (0, socket_1.initSocketIO)(server);
    server.listen(env_1.env.PORT, () => {
        logger_1.logger.info(`Server running on port ${env_1.env.PORT} [${env_1.env.NODE_ENV}]`);
    });
    const shutdown = async (signal) => {
        logger_1.logger.info(`${signal} received, shutting down gracefully`);
        server.close(async () => {
            await database_1.prisma.$disconnect();
            await redis_1.redis.quit();
            logger_1.logger.info('Server closed');
            process.exit(0);
        });
    };
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
}
bootstrap().catch((err) => {
    logger_1.logger.error('Failed to start server', { err });
    process.exit(1);
});
//# sourceMappingURL=index.js.map