import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
export declare function initSocketIO(httpServer: HttpServer): Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
//# sourceMappingURL=index.d.ts.map