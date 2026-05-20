"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findBestMove = findBestMove;
const chess_js_1 = require("chess.js");
const evaluation_1 = require("./evaluation");
const moveGenerator_1 = require("./moveGenerator");
/**
 * Minimax algorithm with Alpha-Beta pruning.
 *
 * Complexity without pruning: O(b^d)
 * Complexity with Alpha-Beta (best case): O(b^(d/2))
 *
 * @param board       - current Chess position
 * @param depth       - remaining search depth
 * @param alpha       - best score the maximizing player can guarantee
 * @param beta        - best score the minimizing player can guarantee
 * @param maximizing  - true when it's the maximizing player's turn (White)
 * @param counter     - mutable counter for benchmarking node visits
 */
function minimaxInner(board, depth, alpha, beta, maximizing, counter) {
    counter.nodes++;
    if (depth === 0 || board.isGameOver()) {
        return (0, evaluation_1.evaluate)(board);
    }
    const moves = (0, moveGenerator_1.getOrderedMoves)(board);
    if (maximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
            board.move(move);
            const score = minimaxInner(board, depth - 1, alpha, beta, false, counter);
            board.undo();
            if (score > maxEval)
                maxEval = score;
            if (score > alpha)
                alpha = score;
            if (beta <= alpha)
                break; // Alpha-Beta cutoff (beta pruning)
        }
        return maxEval;
    }
    else {
        let minEval = Infinity;
        for (const move of moves) {
            board.move(move);
            const score = minimaxInner(board, depth - 1, alpha, beta, true, counter);
            board.undo();
            if (score < minEval)
                minEval = score;
            if (score < beta)
                beta = score;
            if (beta <= alpha)
                break; // Alpha-Beta cutoff (alpha pruning)
        }
        return minEval;
    }
}
/**
 * Top-level Minimax call that returns the best move and evaluation metrics.
 *
 * @param fen   - FEN string representing the position
 * @param depth - search depth (2=EASY, 3=MEDIUM, 4=HARD)
 */
function findBestMove(fen, depth) {
    const board = new chess_js_1.Chess(fen);
    if (board.isGameOver()) {
        return { score: (0, evaluation_1.evaluate)(board), bestMove: null, nodesEvaluated: 1 };
    }
    const isWhiteTurn = board.turn() === 'w';
    const moves = (0, moveGenerator_1.getOrderedMoves)(board);
    const counter = { nodes: 0 };
    let bestMove = null;
    let bestScore = isWhiteTurn ? -Infinity : Infinity;
    let alpha = -Infinity;
    let beta = Infinity;
    for (const move of moves) {
        board.move(move);
        const score = minimaxInner(board, depth - 1, alpha, beta, !isWhiteTurn, counter);
        board.undo();
        if (isWhiteTurn ? score > bestScore : score < bestScore) {
            bestScore = score;
            bestMove = move;
        }
        if (isWhiteTurn) {
            alpha = Math.max(alpha, bestScore);
        }
        else {
            beta = Math.min(beta, bestScore);
        }
    }
    return { score: bestScore, bestMove, nodesEvaluated: counter.nodes };
}
//# sourceMappingURL=minimax.js.map