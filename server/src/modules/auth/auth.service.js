"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../../config/database");
const env_1 = require("../../config/env");
const errorHandler_1 = require("../../middleware/errorHandler");
const logger_1 = require("../../utils/logger");
const SALT_ROUNDS = 10;
function toPublicUser(user) {
    return {
        id: user.id,
        username: user.username,
        rating: user.rating,
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
        gamesLost: user.gamesLost,
        gamesDrawn: user.gamesDrawn,
        createdAt: user.createdAt.toISOString(),
    };
}
async function register(dto) {
    logger_1.logger.info('Register attempt', { email: dto.email, username: dto.username });
    const existing = await database_1.prisma.user.findFirst({
        where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) {
        const field = existing.email === dto.email ? 'email' : 'username';
        logger_1.logger.warn('Register conflict', { field, email: dto.email, username: dto.username });
        throw new errorHandler_1.AppError(409, `User with this ${field} already exists`);
    }
    const passwordHash = await bcrypt_1.default.hash(dto.password, SALT_ROUNDS);
    let user;
    try {
        user = await database_1.prisma.user.create({
            data: { email: dto.email, username: dto.username, passwordHash },
        });
    }
    catch (err) {
        logger_1.logger.error('prisma.user.create failed', { err, email: dto.email });
        throw err;
    }
    logger_1.logger.info('User registered', { userId: user.id, username: user.username });
    const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, username: user.username }, env_1.env.JWT_SECRET, { expiresIn: env_1.env.JWT_EXPIRES_IN });
    return { user: toPublicUser(user), accessToken };
}
async function login(dto) {
    const user = await database_1.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user)
        throw new errorHandler_1.AppError(401, 'Invalid email or password');
    const valid = await bcrypt_1.default.compare(dto.password, user.passwordHash);
    if (!valid)
        throw new errorHandler_1.AppError(401, 'Invalid email or password');
    const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, username: user.username }, env_1.env.JWT_SECRET, { expiresIn: env_1.env.JWT_EXPIRES_IN });
    return { user: toPublicUser(user), accessToken };
}
//# sourceMappingURL=auth.service.js.map