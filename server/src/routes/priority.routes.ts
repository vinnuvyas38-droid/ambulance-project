import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { aiRateLimiter } from '../middleware/rateLimit.middleware';
import { PriorityEngine } from '../services/priority.engine';
import { store } from '../lib/store';
import { AuditService } from '../services/audit.service';

export const priorityRouter = Router();

const evaluatePrioritySchema = z.object({
  junction_id: z.string().uuid(),
  candidates: z
    .array(
      z.object({
        mission_id: z.string().uuid(),
        ambulance_call_sign: z.string(),
        severity_score: z.number().int().min(0).max(100),
        eta_seconds: z.number().int().min(0),
        waiting_seconds: z.number().int().min(0),
        movement: z.any(),
        is_authorized: z.boolean().optional(),
      })
    )
    .optional(),
});

priorityRouter.post(
  '/priority/evaluate',
  authMiddleware,
  requireRole('admin', 'operator'),
  aiRateLimiter,
  validateBody(evaluatePrioritySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { junction_id, candidates } = req.body;
      const decision = await PriorityEngine.evaluateWithAi(junction_id, candidates);

      AuditService.log(
        'priority_evaluated',
        'priority',
        {
          junction_id,
          candidateCount: decision.candidates.length,
          topRanked: decision.ranking[0],
        },
        'user',
        req.user!.id,
        decision.id
      );

      res.json({ data: decision });
    } catch (err) {
      next(err);
    }
  }
);

priorityRouter.get('/priority/decisions', authMiddleware, (req: Request, res: Response) => {
  const { junction_id } = req.query;
  let decisions = Array.from(store.priority_decisions.values());

  if (junction_id) {
    decisions = decisions.filter((d) => d.junction_id === junction_id);
  }

  decisions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json({ data: decisions.slice(0, 50) });
});
