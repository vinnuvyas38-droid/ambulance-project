import { Router, Request, Response } from 'express';
import { paginationSchema } from '@green-corridor/shared';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateQuery } from '../middleware/validate.middleware';
import { AuditService } from '../services/audit.service';

export const auditRouter = Router();

auditRouter.get(
  '/audit',
  authMiddleware,
  requireRole('admin'),
  validateQuery(paginationSchema),
  (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const entity = (req.query.entity as string) || undefined;

    const result = AuditService.getLogs(page, pageSize, entity);
    res.json({
      data: result.logs,
      meta: {
        total: result.total,
        page,
        pageSize,
      },
    });
  }
);
