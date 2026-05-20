import type { AiLevel, GameResult, ResultReason } from '@genius/shared';
export interface ActiveGameState {
    gameId: string;
    fen: string;
    pgn: string;
    whitePlayerId: string;
    blackPlayerId?: string;
    isAiGame: boolean;
    aiLevel?: AiLevel;
    whiteTimeMs: number;
    blackTimeMs: number;
    lastMoveAt: number;
    turn: 'w' | 'b';
}
export declare function createGame(whitePlayerId: string, blackPlayerId: string | undefined, isAiGame: boolean, aiLevel?: AiLevel): Promise<ActiveGameState>;
export declare function getActiveGame(gameId: string): Promise<ActiveGameState | null>;
export declare function applyMove(gameId: string, from: string, to: string, promotion?: string): Promise<ActiveGameState>;
export declare function finalizeGame(gameId: string, result: GameResult, resultReason: ResultReason): Promise<void>;
export declare function getGameHistory(userId: string, page?: number, limit?: number): Promise<{
    games: ({
        _count: {
            moves: number;
        };
        whitePlayer: {
            id: string;
            username: string;
            rating: number;
        } | null;
        blackPlayer: {
            id: string;
            username: string;
            rating: number;
        } | null;
    } & {
        id: string;
        result: import(".prisma/client").$Enums.GameResult;
        resultReason: import(".prisma/client").$Enums.ResultReason;
        isAiGame: boolean;
        aiLevel: import(".prisma/client").$Enums.AiLevel | null;
        pgn: string;
        finalFen: string;
        whiteRatingBefore: number | null;
        blackRatingBefore: number | null;
        whiteRatingAfter: number | null;
        blackRatingAfter: number | null;
        timeControl: string;
        startedAt: Date;
        endedAt: Date | null;
        whitePlayerId: string | null;
        blackPlayerId: string | null;
    })[];
    total: number;
    page: number;
    limit: number;
}>;
export declare function getGameById(gameId: string): Promise<{
    moves: {
        id: string;
        gameId: string;
        createdAt: Date;
        moveNumber: number;
        san: string;
        uci: string;
        fenAfter: string;
        timeSpentMs: number;
    }[];
    whitePlayer: {
        id: string;
        username: string;
        rating: number;
    } | null;
    blackPlayer: {
        id: string;
        username: string;
        rating: number;
    } | null;
} & {
    id: string;
    result: import(".prisma/client").$Enums.GameResult;
    resultReason: import(".prisma/client").$Enums.ResultReason;
    isAiGame: boolean;
    aiLevel: import(".prisma/client").$Enums.AiLevel | null;
    pgn: string;
    finalFen: string;
    whiteRatingBefore: number | null;
    blackRatingBefore: number | null;
    whiteRatingAfter: number | null;
    blackRatingAfter: number | null;
    timeControl: string;
    startedAt: Date;
    endedAt: Date | null;
    whitePlayerId: string | null;
    blackPlayerId: string | null;
}>;
//# sourceMappingURL=game.service.d.ts.map