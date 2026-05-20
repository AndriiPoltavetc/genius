import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@genius/shared';
type GeniusSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type GeniusServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
export declare function registerMatchmakingHandlers(io: GeniusServer, socket: GeniusSocket): void;
export {};
//# sourceMappingURL=matchmaking.handler.d.ts.map