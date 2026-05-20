import type { AiLevel } from '@genius/shared';
export interface AiMoveResult {
    move: string;
    nodesEvaluated: number;
    timeMs: number;
}
export declare function getBestMove(fen: string, level: AiLevel): Promise<AiMoveResult>;
//# sourceMappingURL=aiService.d.ts.map