"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const minimax_1 = require("./minimax");
const { fen, depth } = worker_threads_1.workerData;
try {
    const result = (0, minimax_1.findBestMove)(fen, depth);
    worker_threads_1.parentPort?.postMessage({ move: result.bestMove, nodesEvaluated: result.nodesEvaluated });
}
catch (err) {
    worker_threads_1.parentPort?.postMessage({ move: null, nodesEvaluated: 0, error: String(err) });
}
//# sourceMappingURL=worker.js.map