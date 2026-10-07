import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { store } from '../lib/store';
import { Ambulance } from '@green-corridor/shared';
import { AuditService } from '../services/audit.service';

export const ambulanceRouter = Router();

const createAmbulanceSchema = z.object({
  call_sign: z.string().trim().min(2).max(50),
  driver_id: z.string().uuid().optional().nullable(),
  lat: z.number().min(-90).max(90).default(12.97),
  lng: z.number().min(-180).max(180).default(77.59),
  is_authorized: z.boolean().default(true),
});

ambulanceRouter.get('/ambulances', authMiddleware, (req: Request, res: Response) => {
  const user = req.user!;
  let ambulances = Array.from(store.ambulances.values());

  // RLS Data Isolation: Driver sees only their assigned vehicle, or staff/viewer see all
  if (user.role === 'driver') {
    ambulances = ambulances.filter((a) => a.driver_id === user.id);
  }

  res.json({ data: ambulances });
});

ambulanceRouter.post(
  '/ambulances',
  authMiddleware,
  requireRole('admin', 'operator'),
  validateBody(createAmbulanceSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = uuidv4();
      const ambulance: Ambulance = {
        id,
        call_sign: req.body.call_sign,
        driver_id: req.body.driver_id || null,
        is_authorized: req.body.is_authorized,
        lat: req.body.lat,
        lng: req.body.lng,
        speed_kmh: 0,
        heading_deg: 0,
        is_simulated: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      store.ambulances.set(id, ambulance);
      AuditService.log('ambulance_registered', 'ambulance', { call_sign: ambulance.call_sign }, 'user', req.user!.id, id);

      res.status(201).json({ data: ambulance });
    } catch (err) {
      next(err);
    }
  }
);
