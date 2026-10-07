import { Router, Request, Response, NextFunction } from 'express';
import { patientInfoSchema } from '@green-corridor/shared';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { aiRateLimiter } from '../middleware/rateLimit.middleware';
import { SeverityService } from '../services/severity.service';

export const severityRouter = Router();

severityRouter.post(
  '/severity/assess',
  authMiddleware,
  requireRole('admin', 'operator', 'driver'),
  aiRateLimiter,
  validateBody(patientInfoSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assessmentResult = await SeverityService.assess(req.body);
      res.json({ data: assessmentResult });
    } catch (err) {
      next(err);
    }
  }
);
