import Redis from 'ioredis';
export declare const redis: Redis;
export declare const REDIS_KEYS: {
    readonly matchmakingQueue: "matchmaking:queue";
    readonly activeGame: (gameId: string) => string;
    readonly gameTimer: (gameId: string) => string;
    readonly playerGame: (userId: string) => string;
};
//# sourceMappingURL=redis.d.ts.map