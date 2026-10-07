import { Router, Request, Response, NextFunction } from 'express';
import { routeComputeSchema } from '@green-corridor/shared';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { RouteService } from '../services/route.service';
import { store } from '../lib/store';
import { NotFoundError } from '../lib/errors';

export const routeRouter = Router();

routeRouter.get('/routes/:id', (req: Request, res: Response, next: NextFunction) => {
  const route = store.routes.get(req.params.id);
  if (!route) {
    return next(new NotFoundError(`Route ${req.params.id} not found`));
  }

  const junctions = Array.from(store.route_junctions.values())
    .filter((rj) => rj.route_id === route.id)
    .sort((a, b) => a.seq - b.seq)
    .map((rj) => ({
      ...rj,
      junction: store.junctions.get(rj.junction_id),
    }));

  res.json({
    data: {
      ...route,
      junctions,
    },
  });
});

routeRouter.post(
  '/routes/compute',
  authMiddleware,
  requireRole('admin', 'operator', 'driver'),
  validateBody(routeComputeSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { origin_lat, origin_lng, hospital_id } = req.body;
      const result = RouteService.computeRoute(origin_lat, origin_lng, hospital_id);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);
