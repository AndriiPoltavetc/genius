"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFen = parseFen;
exports.getGameOverReason = getGameOverReason;
exports.toUci = toUci;
const chess_js_1 = require("chess.js");
/**
 * Safely parse a FEN string, returning null if invalid.
 */
function parseFen(fen) {
    try {
        const chess = new chess_js_1.Chess(fen);
        return chess;
    }
    catch {
        return null;
    }
}
/** Determine game-over reason from a chess instance. */
function getGameOverReason(chess) {
    if (!chess.isGameOver())
        return null;
    if (chess.isCheckmate())
        return 'CHECKMATE';
    if (chess.isStalemate())
        return 'STALEMATE';
    if (chess.isInsufficientMaterial())
        return 'INSUFFICIENT_MATERIAL';
    if (chess.isThreefoldRepetition())
        return 'THREEFOLD_REPETITION';
    if (chess.isDraw())
        return 'FIFTY_MOVE_RULE';
    return null;
}
/** Convert from-to to UCI notation (e.g. "e2e4", "e7e8q"). */
function toUci(from, to, promotion) {
    return `${from}${to}${promotion ?? ''}`;
}
//# sourceMappingURL=chess.js.map