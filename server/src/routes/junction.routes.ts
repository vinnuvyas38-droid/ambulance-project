import { Router, Request, Response, NextFunction } from 'express';
import { store } from '../lib/store';
import { NotFoundError } from '../lib/errors';
import { SignalController } from '../services/signal.controller';

export const junctionRouter = Router();

junctionRouter.get('/junctions', (_req: Request, res: Response) => {
  const junctions = Array.from(store.junctions.values());
  res.json({ data: junctions });
});

junctionRouter.get('/junctions/:id', (req: Request, res: Response, next: NextFunction) => {
  const junction = store.junctions.get(req.params.id);
  if (!junction) {
    return next(new NotFoundError(`Junction ${req.params.id} not found`));
  }

  const cameras = Array.from(store.junction_cameras.values()).filter(
    (c) => c.junction_id === junction.id
  );
  const movements = Array.from(store.junction_movements.values()).filter(
    (m) => m.junction_id === junction.id
  );
  const conflicts = Array.from(store.junction_conflicts.values()).filter(
    (c) => c.junction_id === junction.id
  );
  const recentDetections = Array.from(store.cv_detections.values())
    .filter((d) => d.junction_id === junction.id)
    .slice(-10);

  res.json({
    data: {
      ...junction,
      cameras,
      movements,
      conflicts,
      recentDetections,
    },
  });
});

junctionRouter.get('/junctions/:id/timeline', (req: Request, res: Response) => {
  const events = SignalController.eventTimeline.filter(
    (e) => e.junctionId === req.params.id
  );
  res.json({ data: events });
});
