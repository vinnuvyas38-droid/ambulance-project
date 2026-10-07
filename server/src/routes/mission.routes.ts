import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  createMissionSchema,
  missionFilterSchema,
  Mission,
  SeverityAssessmentRecord,
} from '@green-corridor/shared';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateBody, validateQuery } from '../middleware/validate.middleware';
import { aiRateLimiter } from '../middleware/rateLimit.middleware';
import { store } from '../lib/store';
import { SeverityService } from '../services/severity.service';
import { RouteService } from '../services/route.service';
import { EtaService } from '../services/eta.service';
import { SignalController } from '../services/signal.controller';
import { CrossingTracker } from '../services/crossing.tracker';
import { AuditService } from '../services/audit.service';
import { NotFoundError, ForbiddenError } from '../lib/errors';

export const missionRouter = Router();

// Create mission: Validate -> Gemini severity -> Compute route -> Store
missionRouter.post(
  '/missions',
  authMiddleware,
  requireRole('admin', 'operator', 'driver'),
  aiRateLimiter,
  validateBody(createMissionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ambulance_id, hospital_id, origin_lat, origin_lng, patient_info } = req.body;
      const user = req.user!;

      const ambulance = store.ambulances.get(ambulance_id);
      if (!ambulance) throw new NotFoundError(`Ambulance ${ambulance_id} not found`);

      const hospital = store.hospitals.get(hospital_id);
      if (!hospital) throw new NotFoundError(`Hospital ${hospital_id} not found`);

      // 1. Run AI / Rule-based Severity Assessment
      const { assessment, model, latency_ms } = await SeverityService.assess(patient_info);

      // 2. Compute route and ordered route junctions
      const { route, junctions: routeJunctions } = RouteService.computeRoute(
        origin_lat,
        origin_lng,
        hospital_id
      );

      // 3. Compute initial ETAs
      const corridorEta = EtaService.calculateCorridorEta(
        route.distance_m,
        50,
        routeJunctions.length
      );
      const baselineEta = EtaService.calculateBaselineEta(
        route.distance_m,
        40,
        routeJunctions.length
      );

      // 4. Create and persist Mission
      const missionId = uuidv4();
      const mission: Mission = {
        id: missionId,
        ambulance_id,
        hospital_id,
        route_id: route.id,
        created_by: user.id,
        patient_info,
        emergency_category: patient_info.emergency_category,
        severity_score: assessment.severity_score,
        severity_level: assessment.severity_level,
        status: 'dispatched',
        current_route_seq: 1,
        eta_seconds: corridorEta,
        baseline_eta_seconds: baselineEta,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.missions.set(missionId, mission);

      // Persist severity assessment record
      const assessmentRecord: SeverityAssessmentRecord = {
        id: uuidv4(),
        mission_id: missionId,
        input: patient_info,
        output: assessment,
        score: assessment.severity_score,
        level: assessment.severity_level,
        model,
        latency_ms,
        created_at: new Date().toISOString(),
      };
      store.severity_assessments.set(assessmentRecord.id, assessmentRecord);

      AuditService.log(
        'mission_created',
        'mission',
        {
          missionId,
          severity_score: assessment.severity_score,
          category: mission.emergency_category,
          route_id: route.id,
        },
        'user',
        user.id,
        missionId
      );

      res.status(201).json({
        data: {
          mission,
          assessment,
          route,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// List missions (RLS data isolation applied)
missionRouter.get(
  '/missions',
  authMiddleware,
  validateQuery(missionFilterSchema),
  (req: Request, res: Response) => {
    const user = req.user!;
    let list = Array.from(store.missions.values());

    // RLS Enforcement: Drivers see ONLY their own missions or assigned ambulance's missions
    if (user.role === 'driver') {
      list = list.filter(
        (m) =>
          m.created_by === user.id ||
          store.ambulances.get(m.ambulance_id)?.driver_id === user.id
      );
    }

    // Apply filters
    const { status, level, ambulance_id, page = 1, pageSize = 20 } = req.query as any;
    if (status) list = list.filter((m) => m.status === status);
    if (level) list = list.filter((m) => m.severity_level === level);
    if (ambulance_id) list = list.filter((m) => m.ambulance_id === ambulance_id);

    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const start = (Number(page) - 1) * Number(pageSize);
    const paginated = list.slice(start, start + Number(pageSize)).map((m) => ({
      ...m,
      ambulance: store.ambulances.get(m.ambulance_id),
      hospital: store.hospitals.get(m.hospital_id),
      route: m.route_id ? store.routes.get(m.route_id) : undefined,
    }));

    res.json({
      data: paginated,
      meta: { total: list.length, page: Number(page), pageSize: Number(pageSize) },
    });
  }
);

// Get mission detail
missionRouter.get('/missions/:id', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  const mission = store.missions.get(req.params.id);
  if (!mission) {
    return next(new NotFoundError(`Mission ${req.params.id} not found`));
  }

  const user = req.user!;
  // Driver isolation check
  if (
    user.role === 'driver' &&
    mission.created_by !== user.id &&
    store.ambulances.get(mission.ambulance_id)?.driver_id !== user.id
  ) {
    return next(new ForbiddenError('You are not authorized to view another driver patient record'));
  }

  const assessment = Array.from(store.severity_assessments.values()).find(
    (sa) => sa.mission_id === mission.id
  );
  const overrides = Array.from(store.signal_overrides.values()).filter(
    (so) => so.mission_id === mission.id
  );
  const ambulance = store.ambulances.get(mission.ambulance_id);
  const hospital = store.hospitals.get(mission.hospital_id);
  const route = mission.route_id ? store.routes.get(mission.route_id) : undefined;
  const routeJunctions = route
    ? Array.from(store.route_junctions.values())
        .filter((rj) => rj.route_id === route.id)
        .sort((a, b) => a.seq - b.seq)
        .map((rj) => ({
          ...rj,
          junction: store.junctions.get(rj.junction_id),
          crossing_state: CrossingTracker.getState(rj.junction_id, mission.id),
        }))
    : [];

  res.json({
    data: {
      ...mission,
      ambulance,
      hospital,
      route,
      routeJunctions,
      assessment,
      overrides,
    },
  });
});

// Start mission
missionRouter.post(
  '/missions/:id/start',
  authMiddleware,
  requireRole('admin', 'operator', 'driver'),
  (req: Request, res: Response, next: NextFunction) => {
    const mission = store.missions.get(req.params.id);
    if (!mission) return next(new NotFoundError(`Mission ${req.params.id} not found`));

    mission.status = 'en_route';
    mission.started_at = new Date().toISOString();
    mission.updated_at = new Date().toISOString();

    const amb = store.ambulances.get(mission.ambulance_id);
    if (amb) {
      amb.speed_kmh = 52;
    }

    AuditService.log('mission_started', 'mission', { missionId: mission.id }, 'user', req.user!.id, mission.id);
    res.json({ data: mission });
  }
);

// Cancel mission
missionRouter.post(
  '/missions/:id/cancel',
  authMiddleware,
  requireRole('admin', 'operator'),
  (req: Request, res: Response, next: NextFunction) => {
    const mission = store.missions.get(req.params.id);
    if (!mission) return next(new NotFoundError(`Mission ${req.params.id} not found`));

    mission.status = 'cancelled';
    mission.updated_at = new Date().toISOString();

    // Release held junctions
    for (const j of store.junctions.values()) {
      if (j.active_mission_ids.includes(mission.id)) {
        SignalController.restoreNormalCycle(j.id, mission.id, 'Mission cancelled by operator');
      }
    }

    AuditService.log('mission_cancelled', 'mission', { missionId: mission.id }, 'user', req.user!.id, mission.id);
    res.json({ data: mission });
  }
);
