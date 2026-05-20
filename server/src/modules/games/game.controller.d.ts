import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware';
export declare function getGameHandler(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getHistoryHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=game.controller.d.ts.map