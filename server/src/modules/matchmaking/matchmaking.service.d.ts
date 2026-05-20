export interface QueuedPlayer {
    userId: string;
    username: string;
    rating: number;
    joinedAt: number;
}
export declare function addToQueue(player: QueuedPlayer): Promise<void>;
export declare function removeFromQueue(userId: string): Promise<void>;
/**
 * Find a match for the player at the front of the queue.
 * Returns a pair of players if found, or null.
 */
export declare function findMatch(): Promise<[QueuedPlayer, QueuedPlayer] | null>;
//# sourceMappingURL=matchmaking.service.d.ts.map