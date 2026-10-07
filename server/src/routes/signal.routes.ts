import { Router, Request, Response, NextFunction } from 'express';
import { overrideRequestSchema } from '@green-corridor/shared';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { SignalController } from '../services/signal.controller';
import { AuditService } from '../services/audit.service';

export const signalRouter = Router();

signalRouter.post(
  '/signals/:junctionId/override',
  authMiddleware,
  requireRole('admin', 'operator'),
  validateBody(overrideRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { junctionId } = req.params;
      const { mission_id, movement, planned_green_seconds } = req.body;

      const override = await SignalController.activateEmergencyCorridor(
        junctionId,
        mission_id,
        movement,
        planned_green_seconds
      );

      AuditService.log(
        'manual_signal_override',
        'signal',
        { junctionId, mission_id, movement, planned_green_seconds },
        'user',
        req.user!.id,
        override.id
      );

      res.json({ data: override });
    } catch (err) {
      next(err);
    }
  }
);

signalRouter.post(
  '/signals/:junctionId/restore',
  authMiddleware,
  requireRole('admin', 'operator'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { junctionId } = req.params;
      await SignalController.restoreNormalCycle(junctionId, undefined, 'Manual operator restore');

      AuditService.log(
        'manual_signal_restore',
        'signal',
        { junctionId },
        'user',
        req.user!.id
      );

      res.json({ data: { message: `Junction ${junctionId} normal cycle restored` } });
    } catch (err) {
      next(err);
    }
  }
);
