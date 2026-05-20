"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameRoutes = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const game_controller_1 = require("./game.controller");
exports.gameRoutes = (0, express_1.Router)();
exports.gameRoutes.get('/history', auth_middleware_1.authMiddleware, game_controller_1.getHistoryHandler);
exports.gameRoutes.get('/:gameId', game_controller_1.getGameHandler);
//# sourceMappingURL=game.routes.js.map