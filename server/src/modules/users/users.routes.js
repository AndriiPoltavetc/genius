"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = require("express");
const database_1 = require("../../config/database");
const errorHandler_1 = require("../../middleware/errorHandler");
exports.userRoutes = (0, express_1.Router)();
exports.userRoutes.get('/:userId', async (req, res, next) => {
    try {
        const user = await database_1.prisma.user.findUnique({
            where: { id: req.params['userId'] },
            select: {
                id: true,
                username: true,
                rating: true,
                gamesPlayed: true,
                gamesWon: true,
                gamesLost: true,
                gamesDrawn: true,
                createdAt: true,
            },
        });
        if (!user)
            throw new errorHandler_1.AppError(404, 'User not found');
        res.json(user);
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=users.routes.js.map