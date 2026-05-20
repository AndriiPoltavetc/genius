import type { Server, Socket } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, SocketData } from '@genius/shared';
type GeniusSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type GeniusServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
export declare function registerGameHandlers(io: GeniusServer, socket: GeniusSocket): void;
export {};
//# sourceMappingURL=game.handler.d.ts.map