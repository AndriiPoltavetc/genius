"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBestMove = getBestMove;
const logger_1 = require("../utils/logger");
const minimax_1 = require("./minimax");
const DEPTH_BY_LEVEL = {
    EASY: 2,
    MEDIUM: 3,
    HARD: 4,
};
function getBestMove(fen, level) {
    const depth = DEPTH_BY_LEVEL[level];
    const start = Date.now();
    logger_1.logger.info('AI thinking', { level, depth, fen });
    try {
        const result = (0, minimax_1.findBestMove)(fen, depth);
        const timeMs = Date.now() - start;
        logger_1.logger.info('AI move computed', { level, depth, timeMs, nodes: result.nodesEvaluated, move: result.bestMove });
        if (!result.bestMove) {
            return Promise.reject(new Error('AI returned no move — game is likely over'));
        }
        return Promise.resolve({ move: result.bestMove, nodesEvaluated: result.nodesEvaluated, timeMs });
    }
    catch (err) {
        logger_1.logger.error('AI computation error', { err });
        return Promise.reject(err instanceof Error ? err : new Error(String(err)));
    }
}
//# sourceMappingURL=aiService.js.map