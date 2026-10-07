import {
  ICvDetector,
  CvFrameAnalysis,
  Approach,
  VehicleClass,
} from '@green-corridor/shared';
import { store } from '../lib/store';
import { CrossingTracker } from './crossing.tracker';

export class SimulatedDetector implements ICvDetector {
  async analyzeFrame(
    junctionId: string,
    approach: Approach,
    _imageData?: string
  ): Promise<CvFrameAnalysis> {
    const junction = store.junctions.get(junctionId);
    let ambulancePresent = false;
    let ambulanceCrossingState: any = 'not_detected';
    let activeMissionId: string | undefined;

    // Check if any active mission has an ambulance near this junction on this approach
    for (const mission of store.missions.values()) {
      if (['en_route', 'approaching_junction', 'crossing'].includes(mission.status)) {
        const amb = store.ambulances.get(mission.ambulance_id);
        if (amb) {
          // Check route junctions
          const routeJunctions = Array.from(store.route_junctions.values()).filter(
            (rj) => rj.route_id === mission.route_id && rj.junction_id === junctionId
          );
          for (const rj of routeJunctions) {
            if (rj.entry_approach === approach) {
              const crossing = CrossingTracker.getState(junctionId, mission.id);
              if (crossing !== 'not_detected' && crossing !== 'cleared') {
                ambulancePresent = true;
                ambulanceCrossingState = crossing;
                activeMissionId = mission.id;
                break;
              }
            }
          }
        }
      }
    }

    const detections: Array<{
      label: VehicleClass;
      confidence: number;
      bbox: [number, number, number, number];
    }> = [];

    // Background vehicles per lane approach
    const bgTypes: VehicleClass[] = ['car', 'car', 'bus', 'bike', 'truck'];
    const count = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const type = bgTypes[i % bgTypes.length];
      const x = 0.2 + (i % 3) * 0.25;
      const y = 0.15 + Math.floor(i / 3) * 0.35;
      detections.push({
        label: type,
        confidence: Number((0.85 + Math.random() * 0.13).toFixed(2)),
        bbox: [
          Number(x.toFixed(2)),
          Number(y.toFixed(2)),
          type === 'bus' || type === 'truck' ? 0.18 : 0.12,
          type === 'bus' || type === 'truck' ? 0.28 : 0.18,
        ],
      });
    }

    // Add ambulance detection if active
    if (ambulancePresent) {
      detections.unshift({
        label: 'ambulance',
        confidence: 0.98,
        bbox: [0.44, 0.52, 0.14, 0.24],
      });
    }

    const densityPct = Math.min(100, detections.length * 12);

    return {
      detections,
      vehicle_count: detections.length,
      density_pct: densityPct,
      ambulance_detected: ambulancePresent,
      ambulance_direction: ambulancePresent ? approach : null,
      crossing_state: ambulanceCrossingState,
      confidence: 0.95,
      needs_fallback: false,
      summary: ambulancePresent
        ? `Computer Vision confirmed priority emergency ambulance approaching from ${approach}. Road density ${densityPct}%.`
        : `Normal traffic monitored on approach ${approach}. ${detections.length} vehicles detected, lane density ${densityPct}%.`,
    };
  }
}
