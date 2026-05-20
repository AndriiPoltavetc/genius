import type { Request, Response, NextFunction } from 'express';

import { RegisterSchema, LoginSchema } from './auth.dto';
import * as authService from './auth.service';

export async function registerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = RegisterSchema.parse(req.body);
    const result = await authService.register(dto);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = LoginSchema.parse(req.body);
    const result = await authService.login(dto);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function meHandler(req: Request, res: Response, next: NextFunction) {
  try {
    // req.user is set by authMiddleware
    res.json({ user: (req as { user?: unknown }).user });
  } catch (err) {
    next(err);
  }
}
