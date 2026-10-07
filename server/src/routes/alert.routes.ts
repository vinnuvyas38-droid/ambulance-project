import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { AlertService } from '../services/alert.service';
import { NotFoundError } from '../lib/errors';

export const alertRouter = Router();

alertRouter.get(
  '/alerts',
  authMiddleware,
  requireRole('admin', 'operator', 'viewer', 'driver'),
  (_req: Request, res: Response) => {
    const alerts = AlertService.getAlerts();
    res.json({ data: alerts });
  }
);

alertRouter.patch(
  '/alerts/:id/ack',
  authMiddleware,
  requireRole('admin', 'operator'),
  (req: Request, res: Response, next: NextFunction) => {
    const success = AlertService.acknowledge(req.params.id);
    if (!success) {
      return next(new NotFoundError(`Alert ${req.params.id} not found`));
    }
    res.json({ data: { acknowledged: true } });
  }
);
