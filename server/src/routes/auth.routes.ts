import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { store } from '../lib/store';
import { NotFoundError } from '../lib/errors';
import { AuditService } from '../services/audit.service';

export const authRouter = Router();

const updateMeSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
});

authRouter.get('/me', authMiddleware, (req: Request, res: Response) => {
  res.json({ data: req.user });
});

authRouter.patch(
  '/me',
  authMiddleware,
  validateBody(updateMeSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      user.full_name = req.body.full_name;
      user.updated_at = new Date().toISOString();

      store.profiles.set(user.id, user);
      AuditService.log('profile_updated', 'profile', { full_name: user.full_name }, 'user', user.id, user.id);

      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  }
);

// Demo helper route to list available quick-login profiles
authRouter.get('/demo-users', (_req: Request, res: Response) => {
  const users = Array.from(store.profiles.values());
  res.json({ data: users });
});
