"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const env_1 = require("./config/env");
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimiter_1 = require("./middleware/rateLimiter");
const auth_routes_1 = require("./modules/auth/auth.routes");
const game_routes_1 = require("./modules/games/game.routes");
const users_routes_1 = require("./modules/users/users.routes");
const leaderboard_routes_1 = require("./modules/leaderboard/leaderboard.routes");
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)({
        origin: [env_1.env.CORS_ORIGIN, 'http://localhost:5173'],
        credentials: true,
    }));
    app.use(express_1.default.json());
    app.use(rateLimiter_1.rateLimiter);
    // Health check
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    // API routes
    app.use('/api/auth', auth_routes_1.authRoutes);
    app.use('/api/games', game_routes_1.gameRoutes);
    app.use('/api/users', users_routes_1.userRoutes);
    app.use('/api/leaderboard', leaderboard_routes_1.leaderboardRoutes);
    app.use(errorHandler_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map