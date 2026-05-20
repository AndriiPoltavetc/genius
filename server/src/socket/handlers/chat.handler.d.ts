import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@genius/shared';
type GeniusSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type GeniusServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
export declare function registerChatHandlers(io: GeniusServer, socket: GeniusSocket): void;
export {};
//# sourceMappingURL=chat.handler.d.ts.map