"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PIECE_VALUES = void 0;
exports.evaluate = evaluate;
const pieceSquareTables_1 = require("./pieceSquareTables");
/** Material values in centipawns */
exports.PIECE_VALUES = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000,
};
/** Total non-pawn, non-king material for endgame detection */
const ENDGAME_THRESHOLD = 1300; // roughly queen + rook gone for each side
/**
 * Detect if the position is in the endgame phase.
 * Simple heuristic: both sides have less than ENDGAME_THRESHOLD in non-pawn material.
 */
function isEndgame(board) {
    let whiteMinorMaterial = 0;
    let blackMinorMaterial = 0;
    const boardData = board.board();
    for (const row of boardData) {
        for (const piece of row) {
            if (!piece || piece.type === 'p' || piece.type === 'k')
                continue;
            const value = exports.PIECE_VALUES[piece.type];
            if (piece.color === 'w')
                whiteMinorMaterial += value;
            else
                blackMinorMaterial += value;
        }
    }
    return whiteMinorMaterial < ENDGAME_THRESHOLD && blackMinorMaterial < ENDGAME_THRESHOLD;
}
/**
 * Static position evaluation function.
 * Returns a score in centipawns from White's perspective:
 *   positive  → White is better
 *   negative  → Black is better
 *   0         → equal
 */
function evaluate(board) {
    if (board.isCheckmate()) {
        // Side to move is in checkmate → the other side wins
        return board.turn() === 'w' ? -30000 : 30000;
    }
    if (board.isDraw())
        return 0;
    const endgame = isEndgame(board);
    let score = 0;
    const boardData = board.board();
    for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
        for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
            const piece = boardData[rankIdx]?.[fileIdx];
            if (!piece)
                continue;
            const file = String.fromCharCode(97 + fileIdx); // 'a'..'h'
            const rank = String(8 - rankIdx); // '8'..'1'
            const square = `${file}${rank}`;
            const materialValue = exports.PIECE_VALUES[piece.type];
            const positionalBonus = (0, pieceSquareTables_1.getPstBonus)(piece.type, piece.color, square, endgame);
            const pieceScore = materialValue + positionalBonus;
            score += piece.color === 'w' ? pieceScore : -pieceScore;
        }
    }
    return score;
}
//# sourceMappingURL=evaluation.js.map