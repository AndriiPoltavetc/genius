import type { Request, Response, NextFunction } from 'express';
import type { AuthTokenPayload } from '@genius/shared';
export interface AuthRequest extends Request {
    user?: AuthTokenPayload;
}
export declare function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.middleware.d.ts.map