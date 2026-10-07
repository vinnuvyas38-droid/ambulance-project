import { Router, Request, Response, NextFunction } from 'express';
import { simulationSpeedSchema, scenarioSchema } from '@green-corridor/shared';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { SimulationEngine } from '../services/simulation.engine';
import { store } from '../lib/store';

export const simulationRouter = Router();

simulationRouter.get('/simulation/state', (_req: Request, res: Response) => {
  res.json({ data: store.simulation_state });
});

simulationRouter.post(
  '/simulation/start',
  authMiddleware,
  requireRole('admin', 'operator'),
  (_req: Request, res: Response) => {
    SimulationEngine.start();
    res.json({ data: store.simulation_state });
  }
);

simulationRouter.post(
  '/simulation/pause',
  authMiddleware,
  requireRole('admin', 'operator'),
  (_req: Request, res: Response) => {
    SimulationEngine.pause();
    res.json({ data: store.simulation_state });
  }
);

simulationRouter.post(
  '/simulation/reset',
  authMiddleware,
  requireRole('admin', 'operator'),
  (req: Request, res: Response) => {
    const scenario = req.body?.scenario || 'single_ambulance';
    SimulationEngine.reset(scenario);
    res.json({ data: store.simulation_state });
  }
);

simulationRouter.post(
  '/simulation/speed',
  authMiddleware,
  requireRole('admin', 'operator'),
  validateBody(simulationSpeedSchema),
  (req: Request, res: Response) => {
    SimulationEngine.setSpeed(req.body.speed);
    res.json({ data: store.simulation_state });
  }
);

simulationRouter.post(
  '/simulation/scenario',
  authMiddleware,
  requireRole('admin', 'operator'),
  validateBody(scenarioSchema),
  (req: Request, res: Response) => {
    SimulationEngine.reset(req.body.scenario);
    res.json({ data: store.simulation_state });
  }
);
