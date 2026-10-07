import { Router, Request, Response, NextFunction } from 'express';
import { configSchema, DEFAULT_PRIORITY_CONFIG } from '@green-corridor/shared';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { store } from '../lib/store';
import { AuditService } from '../services/audit.service';

export const configRouter = Router();

configRouter.get(
  '/config',
  authMiddleware,
  requireRole('admin', 'operator', 'viewer', 'driver'),
  (_req: Request, res: Response) => {
    const config =
      store.system_config.get('priority_weights')?.value || DEFAULT_PRIORITY_CONFIG;
    res.json({ data: config });
  }
);

configRouter.put(
  '/config',
  authMiddleware,
  requireRole('admin'),
  validateBody(configSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const updatedConfig = req.body;
      store.system_config.set('priority_weights', {
        key: 'priority_weights',
        value: updatedConfig,
        updated_by: req.user!.id,
        updated_at: new Date().toISOString(),
      });

      AuditService.log(
        'config_updated',
        'config',
        { newConfig: updatedConfig },
        'user',
        req.user!.id
      );

      res.json({ data: updatedConfig });
    } catch (err) {
      next(err);
    }
  }
);
