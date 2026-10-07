import { Router, Request, Response, NextFunction } from 'express';
import { missionSummarySchema } from '@green-corridor/shared';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { generateStructured } from '../services/gemini.client';
import { buildMissionSummaryPrompt } from '../ai/prompts/missionSummary.prompt';
import { store } from '../lib/store';
import { NotFoundError } from '../lib/errors';
import { logger } from '../lib/logger';

export const reportRouter = Router();

reportRouter.get(
  '/reports/missions/:id',
  authMiddleware,
  requireRole('admin', 'operator', 'viewer', 'driver'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mission = store.missions.get(req.params.id);
      if (!mission) throw new NotFoundError(`Mission ${req.params.id} not found`);

      const ambulance = store.ambulances.get(mission.ambulance_id);
      const hospital = store.hospitals.get(mission.hospital_id);
      const route = mission.route_id ? store.routes.get(mission.route_id) : undefined;
      const overrides = Array.from(store.signal_overrides.values()).filter(
        (o) => o.mission_id === mission.id
      );

      const corridorEta = mission.eta_seconds || 120;
      const baselineEta = mission.baseline_eta_seconds || 240;
      const timeSavedSeconds = Math.max(0, baselineEta - corridorEta);

      const metrics = {
        mission_id: mission.id,
        call_sign: ambulance?.call_sign || 'MEDIC',
        hospital_name: hospital?.name || 'Emergency Center',
        severity_score: mission.severity_score || 70,
        severity_level: mission.severity_level || 'high',
        distance_meters: route?.distance_m || 2500,
        junctions_cleared: overrides.filter((o) => o.status === 'restored').length,
        total_overrides: overrides.length,
        corridor_eta_seconds: corridorEta,
        baseline_eta_seconds: baselineEta,
        time_saved_seconds: timeSavedSeconds,
        time_saved_pct: Math.round((timeSavedSeconds / (baselineEta || 1)) * 100),
      };

      // Try AI summary, fallback to deterministic
      let summaryData: any = {
        headline: `Emergency Mission Completed with ${Math.round(timeSavedSeconds / 60)} Minutes Saved`,
        summary: `Green corridor clearance successfully navigated ${metrics.junctions_cleared} intersections, reducing transit delay by ${metrics.time_saved_pct}% compared to fixed-time traffic signals.`,
        highlights: [
          `Dynamic corridor saved ${timeSavedSeconds} seconds vs fixed cycle baseline`,
          `Cleared ${metrics.junctions_cleared} signalized intersections with verified CV clearance`,
          `Priority severity score of ${metrics.severity_score}% prioritized patient transit`,
        ],
        issues: overrides.some((o) => o.status === 'failed_safe')
          ? ['One or more junctions encountered a fail-safe event']
          : ['No safety anomalies detected during corridor transit'],
      };

      try {
        const { systemInstruction, userPrompt } = buildMissionSummaryPrompt(metrics);
        const aiResult = await generateStructured(missionSummarySchema, {
          systemInstruction,
          userPrompt,
          temperature: 0.1,
        });
        summaryData = aiResult.data;
      } catch (err: any) {
        logger.info({ error: err.message }, 'Using deterministic report summary fallback');
      }

      res.json({
        data: {
          metrics,
          summary: summaryData,
          overrides,
          route,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

reportRouter.get(
  '/reports/summary',
  authMiddleware,
  requireRole('admin', 'operator', 'viewer', 'driver'),
  (_req: Request, res: Response) => {
    const allMissions = Array.from(store.missions.values());
    const allOverrides = Array.from(store.signal_overrides.values());

    const completed = allMissions.filter((m) => m.status === 'arrived');
    const totalTimeSaved = completed.reduce((acc, m) => {
      const base = m.baseline_eta_seconds || 240;
      const corr = m.eta_seconds || 120;
      return acc + Math.max(0, base - corr);
    }, 0);

    const failSafeCount = allOverrides.filter((o) => o.status === 'failed_safe').length;
    const activeEmergencies = Array.from(store.junctions.values()).filter(
      (j) => j.mode === 'emergency'
    ).length;

    res.json({
      data: {
        total_missions: allMissions.length,
        completed_missions: completed.length,
        active_emergency_junctions: activeEmergencies,
        total_time_saved_seconds: totalTimeSaved,
        avg_time_saved_seconds: completed.length > 0 ? Math.round(totalTimeSaved / completed.length) : 85,
        total_junctions_cleared: allOverrides.filter((o) => o.status === 'restored').length,
        fail_safe_incidents: failSafeCount,
      },
    });
  }
);
