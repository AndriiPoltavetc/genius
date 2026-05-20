"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const rateLimiter_1 = require("../../middleware/rateLimiter");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const auth_controller_1 = require("./auth.controller");
exports.authRoutes = (0, express_1.Router)();
exports.authRoutes.post('/register', rateLimiter_1.authRateLimiter, auth_controller_1.registerHandler);
exports.authRoutes.post('/login', rateLimiter_1.authRateLimiter, auth_controller_1.loginHandler);
exports.authRoutes.get('/me', auth_middleware_1.authMiddleware, auth_controller_1.meHandler);
//# sourceMappingURL=auth.routes.js.map