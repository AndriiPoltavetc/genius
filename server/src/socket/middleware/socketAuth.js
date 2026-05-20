"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketAuthMiddleware = socketAuthMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../config/env");
const database_1 = require("../../config/database");
async function socketAuthMiddleware(socket, next) {
    const token = socket.handshake.auth.token ??
        socket.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        next(new Error('Authentication required'));
        return;
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        const user = await database_1.prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, username: true, rating: true },
        });
        if (!user) {
            next(new Error('User not found'));
            return;
        }
        socket.data = {
            userId: user.id,
            username: user.username,
            rating: user.rating,
        };
        next();
    }
    catch {
        next(new Error('Invalid token'));
    }
}
//# sourceMappingURL=socketAuth.js.map