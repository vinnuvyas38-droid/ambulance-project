import { v4 as uuidv4 } from 'uuid';
import {
  Movement,
  Approach,
  DEFAULT_PRIORITY_CONFIG,
  Mission,
  Ambulance,
} from '@green-corridor/shared';
import { store } from '../lib/store';
import { SignalController } from './signal.controller';
import { CrossingTracker } from './crossing.tracker';
import { PriorityEngine } from './priority.engine';
import { RouteService } from './route.service';
import { EtaService } from './eta.service';
import { SimulatedDetector } from './cv.simulatedDetector';
import { AlertService } from './alert.service';
import { AuditService } from './audit.service';
import { logger } from '../lib/logger';

export class SimulationEngine {
  private static timer: NodeJS.Timeout | null = null;
  private static simulatedDetector = new SimulatedDetector();
  private static crossingPassed = new Set<string>();

  /**
   * Starts the simulation tick loop
   */
  static start(): void {
    if (store.simulation_state.running) return;

    store.simulation_state.running = true;
    store.simulation_state.updated_at = new Date().toISOString();

    const intervalMs = Math.round(500 / store.simulation_state.speed_multiplier);
    this.timer = setInterval(() => {
      this.tick();
    }, intervalMs);

    logger.info({ speed: store.simulation_state.speed_multiplier }, 'Simulation engine started');
    AuditService.log('simulation_started', 'simulation', { speed: store.simulation_state.speed_multiplier });
  }

  /**
   * Pauses the simulation loop
   */
  static pause(): void {
    if (!store.simulation_state.running) return;

    store.simulation_state.running = false;
    store.simulation_state.updated_at = new Date().toISOString();

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    logger.info('Simulation engine paused');
    AuditService.log('simulation_paused', 'simulation');
  }

  /**
   * Resets the simulation to initial state or selected scenario
   */
  static reset(scenario = 'single_ambulance'): void {
    this.pause();
    store.simulation_state.tick = 0;
    store.simulation_state.scenario = scenario;
    store.simulation_state.updated_at = new Date().toISOString();

    // Reset junctions to normal cycle
    for (const j of store.junctions.values()) {
      j.mode = 'normal';
      j.current_signals = { N: 'red', E: 'green', S: 'red', W: 'green' };
      j.active_mission_ids = [];
      CrossingTracker.reset(j.id);
    }

    // Reset overrides
    store.signal_overrides.clear();
    store.cv_detections.clear();
    this.crossingPassed.clear();

    // Load selected scenario preset
    this.loadScenario(scenario);
    logger.info({ scenario }, 'Simulation reset to scenario');
    AuditService.log('simulation_reset', 'simulation', { scenario });
  }

  /**
   * Sets the speed multiplier (1x, 2x, 4x)
   */
  static setSpeed(speed: 1 | 2 | 4): void {
    store.simulation_state.speed_multiplier = speed;
    store.simulation_state.updated_at = new Date().toISOString();

    if (store.simulation_state.running) {
      this.pause();
      this.start();
    }
  }

  /**
   * Loads preset simulation scenarios
   */
  static loadScenario(scenarioId: string): void {
    // Clear active missions
    store.missions.clear();

    const config = store.system_config.get('priority_weights')?.value || DEFAULT_PRIORITY_CONFIG;
    const amb1 = store.ambulances.get('bbbbbbbb-1111-bbbb-1111-111111111111')!; // MEDIC-101
    const amb2 = store.ambulances.get('bbbbbbbb-2222-bbbb-2222-222222222222')!; // MEDIC-102
    const amb3 = store.ambulances.get('bbbbbbbb-3333-bbbb-3333-333333333333')!; // CRITICAL-201

    if (scenarioId === 'single_ambulance') {
      // Single Ambulance Corridor on Route 1
      amb1.lat = 12.9716;
      amb1.lng = 77.5880;
      amb1.speed_kmh = 50.0;
      amb1.heading_deg = 90.0;

      const mission1: Mission = {
        id: uuidv4(),
        ambulance_id: amb1.id,
        hospital_id: '22222222-2222-2222-2222-222222222222',
        route_id: 'cccccccc-1111-cccc-1111-111111111111',
        created_by: '10000000-0000-0000-0000-000000000002',
        patient_info: {
          emergency_category: 'cardiac',
          age_band: 'adult',
          consciousness: 'alert',
          breathing: 'labored',
          severe_bleeding: false,
          chest_pain: true,
          stroke_signs: false,
          trauma_mechanism: 'none',
          heart_rate: 115,
          systolic_bp: 155,
          spo2: 93,
          notes: 'Acute STEMI suspect, emergency catheterization required',
        },
        emergency_category: 'cardiac',
        severity_score: 82,
        severity_level: 'high',
        status: 'en_route',
        current_route_seq: 1,
        eta_seconds: 140,
        baseline_eta_seconds: 260,
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.missions.set(mission1.id, mission1);
    } else if (scenarioId === 'two_ambulances_conflict') {
      // Two ambulances converging on Junction J2 (Civic Square)
      // AMB-101 approaching from West (W_E)
      amb1.lat = 12.9716;
      amb1.lng = 77.6010; // ~350m west of J2
      amb1.speed_kmh = 52.0;
      amb1.heading_deg = 90.0;

      // AMB-102 approaching from North (N_S)
      amb2.lat = 12.9745; // ~320m north of J2
      amb2.lng = 77.6046;
      amb2.speed_kmh = 48.0;
      amb2.heading_deg = 180.0;

      const mission1: Mission = {
        id: uuidv4(),
        ambulance_id: amb1.id,
        hospital_id: '22222222-2222-2222-2222-222222222222',
        route_id: 'cccccccc-1111-cccc-1111-111111111111',
        created_by: '10000000-0000-0000-0000-000000000002',
        patient_info: {
          emergency_category: 'trauma_accident',
          age_band: 'adult',
          consciousness: 'confused',
          breathing: 'labored',
          severe_bleeding: true,
          chest_pain: false,
          stroke_signs: false,
          trauma_mechanism: 'high_speed_collision',
          heart_rate: 125,
          systolic_bp: 95,
          spo2: 91,
          notes: 'High-speed motor vehicle collision with active hemorrhage',
        },
        emergency_category: 'trauma_accident',
        severity_score: 92,
        severity_level: 'critical',
        status: 'approaching_junction',
        current_route_seq: 2,
        eta_seconds: 35,
        baseline_eta_seconds: 85,
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mission2: Mission = {
        id: uuidv4(),
        ambulance_id: amb2.id,
        hospital_id: '11111111-1111-1111-1111-111111111111',
        route_id: 'cccccccc-3333-cccc-3333-333333333333',
        created_by: '10000000-0000-0000-0000-000000000002',
        patient_info: {
          emergency_category: 'stroke',
          age_band: 'senior',
          consciousness: 'alert',
          breathing: 'normal',
          severe_bleeding: false,
          chest_pain: false,
          stroke_signs: true,
          trauma_mechanism: 'none',
          heart_rate: 88,
          systolic_bp: 170,
          spo2: 96,
          notes: 'Acute ischemic stroke symptoms onset 45 min ago',
        },
        emergency_category: 'stroke',
        severity_score: 78,
        severity_level: 'high',
        status: 'approaching_junction',
        current_route_seq: 1,
        eta_seconds: 40,
        baseline_eta_seconds: 90,
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      store.missions.set(mission1.id, mission1);
      store.missions.set(mission2.id, mission2);
    } else if (scenarioId === 'three_ambulances') {
      // 3 ambulances: Critical (92%), High (78%), Medium (61%)
      amb1.lat = 12.9716;
      amb1.lng = 77.6015;
      amb2.lat = 12.9750;
      amb2.lng = 77.6046;
      amb3.lat = 12.9616;
      amb3.lng = 77.6010;

      const m1: Mission = {
        id: uuidv4(),
        ambulance_id: amb1.id,
        hospital_id: '11111111-1111-1111-1111-111111111111',
        created_by: '10000000-0000-0000-0000-000000000002',
        patient_info: {
          emergency_category: 'cardiac',
          age_band: 'adult',
          consciousness: 'unresponsive',
          breathing: 'shallow',
          severe_bleeding: false,
          chest_pain: true,
          stroke_signs: false,
          trauma_mechanism: 'none',
          heart_rate: 140,
          systolic_bp: 80,
          spo2: 84,
          notes: 'Cardiac arrest resuscitated, critical hemodynamic shock',
        },
        emergency_category: 'cardiac',
        severity_score: 94,
        severity_level: 'critical',
        status: 'approaching_junction',
        current_route_seq: 1,
        eta_seconds: 25,
        baseline_eta_seconds: 70,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const m2: Mission = {
        id: uuidv4(),
        ambulance_id: amb2.id,
        hospital_id: '22222222-2222-2222-2222-222222222222',
        created_by: '10000000-0000-0000-0000-000000000002',
        patient_info: {
          emergency_category: 'respiratory',
          age_band: 'child',
          consciousness: 'alert',
          breathing: 'labored',
          severe_bleeding: false,
          chest_pain: false,
          stroke_signs: false,
          trauma_mechanism: 'none',
          heart_rate: 130,
          systolic_bp: 110,
          spo2: 89,
          notes: 'Pediatric status asthmaticus refractory to nebulizers',
        },
        emergency_category: 'respiratory',
        severity_score: 78,
        severity_level: 'high',
        status: 'approaching_junction',
        current_route_seq: 1,
        eta_seconds: 35,
        baseline_eta_seconds: 80,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const m3: Mission = {
        id: uuidv4(),
        ambulance_id: amb3.id,
        hospital_id: '33333333-3333-3333-3333-333333333333',
        created_by: '10000000-0000-0000-0000-000000000002',
        patient_info: {
          emergency_category: 'burns',
          age_band: 'adult',
          consciousness: 'alert',
          breathing: 'normal',
          severe_bleeding: false,
          chest_pain: false,
          stroke_signs: false,
          trauma_mechanism: 'industrial_thermal',
          notes: '2nd degree thermal burn on extremity, vitals stable',
        },
        emergency_category: 'burns',
        severity_score: 61,
        severity_level: 'medium',
        status: 'approaching_junction',
        current_route_seq: 1,
        eta_seconds: 50,
        baseline_eta_seconds: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      store.missions.set(m1.id, m1);
      store.missions.set(m2.id, m2);
      store.missions.set(m3.id, m3);
    } else if (scenarioId === 'cv_failure_fallback') {
      // Triggers CV camera anomaly
      amb1.lat = 12.9716;
      amb1.lng = 77.5920;
      amb1.speed_kmh = 45;

      const mission1: Mission = {
        id: uuidv4(),
        ambulance_id: amb1.id,
        hospital_id: '22222222-2222-2222-2222-222222222222',
        route_id: 'cccccccc-1111-cccc-1111-111111111111',
        created_by: '10000000-0000-0000-0000-000000000002',
        patient_info: {
          emergency_category: 'trauma_accident',
          age_band: 'adult',
          consciousness: 'alert',
          breathing: 'normal',
          severe_bleeding: false,
          chest_pain: false,
          stroke_signs: false,
          trauma_mechanism: 'none',
          notes: 'Testing CV Sensor Anomaly Fail-Safe Recovery',
        },
        emergency_category: 'trauma_accident',
        severity_score: 75,
        severity_level: 'high',
        status: 'approaching_junction',
        current_route_seq: 1,
        eta_seconds: 20,
        baseline_eta_seconds: 60,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.missions.set(mission1.id, mission1);

      // Trigger fail safe on J1 after 3 seconds
      setTimeout(() => {
        SignalController.triggerFailSafe(
          'a1111111-aaaa-1111-aaaa-111111111111',
          'Simulated Vision Anomaly: J1 North camera optical feed packet loss'
        );
        AlertService.create(
          'critical',
          'Junction J1 CV Camera Optical Loss: Activated Fail-Safe to protect traffic',
          'a1111111-aaaa-1111-aaaa-111111111111'
        );
      }, 3000);
    }
  }

  /**
   * Main simulation tick execution
   */
  private static async tick(): Promise<void> {
    store.simulation_state.tick++;
    const config = store.system_config.get('priority_weights')?.value || DEFAULT_PRIORITY_CONFIG;

    // Iterate over active missions
    for (const mission of store.missions.values()) {
      if (!['dispatched', 'en_route', 'approaching_junction', 'crossing'].includes(mission.status)) {
        continue;
      }

      const ambulance = store.ambulances.get(mission.ambulance_id);
      if (!ambulance) continue;

      const route = mission.route_id ? store.routes.get(mission.route_id) : undefined;
      const hospital = store.hospitals.get(mission.hospital_id);

      if (!route || !route.geometry || route.geometry.length < 2 || !hospital) continue;

      // Find ordered route junctions
      const rJunctions = Array.from(store.route_junctions.values())
        .filter((rj) => rj.route_id === route.id)
        .sort((a, b) => a.seq - b.seq);

      // Determine upcoming junction for the current route sequence
      const currentRj = rJunctions[mission.current_route_seq - 1];
      const targetJunction = currentRj ? store.junctions.get(currentRj.junction_id) : undefined;

      // Determine next waypoint after target junction (or hospital if final leg)
      const nextRj = rJunctions[mission.current_route_seq];
      const nextJunction = nextRj ? store.junctions.get(nextRj.junction_id) : undefined;
      const outgoingPos = nextJunction
        ? { lat: nextJunction.lat, lng: nextJunction.lng }
        : { lat: hospital.lat, lng: hospital.lng };

      const currentPos = { lat: ambulance.lat, lng: ambulance.lng };
      let targetPos = hospital ? { lat: hospital.lat, lng: hospital.lng } : currentPos;

      const crossingKey = targetJunction ? `${mission.id}_${targetJunction.id}` : '';
      const hasPassedCenter = Boolean(targetJunction && this.crossingPassed.has(crossingKey));

      if (targetJunction) {
        if (!hasPassedCenter) {
          // Approach current junction
          targetPos = { lat: targetJunction.lat, lng: targetJunction.lng };
        } else {
          // Passed junction center: continue movement along the corridor towards next waypoint
          targetPos = outgoingPos;
        }
      }

      const distToTargetM = RouteService.haversineDistanceMeters(
        currentPos.lat,
        currentPos.lng,
        targetPos.lat,
        targetPos.lng
      );

      // Speed in m/s * tick interval (0.5s)
      const stepMeters = (ambulance.speed_kmh * (1000 / 3600)) * 0.5;

      if (distToTargetM > stepMeters) {
        const ratio = stepMeters / distToTargetM;
        ambulance.lat += (targetPos.lat - currentPos.lat) * ratio;
        ambulance.lng += (targetPos.lng - currentPos.lng) * ratio;
      } else {
        // Reached waypoint target
        ambulance.lat = targetPos.lat;
        ambulance.lng = targetPos.lng;
        if (targetJunction && !hasPassedCenter) {
          // Reached junction center: mark as passed so next movement heads outward
          this.crossingPassed.add(crossingKey);
        }
      }

      // Dynamic heading calculation
      const dLat = targetPos.lat - currentPos.lat;
      const dLng = targetPos.lng - currentPos.lng;
      if (Math.abs(dLat) > 0.00001 || Math.abs(dLng) > 0.00001) {
        ambulance.heading_deg = (Math.atan2(dLng, dLat) * (180 / Math.PI) + 360) % 360;
      }
      ambulance.updated_at = new Date().toISOString();

      // Recalculate remaining total distance and ETAs
      const totalRemainingDist = RouteService.haversineDistanceMeters(
        ambulance.lat,
        ambulance.lng,
        hospital.lat,
        hospital.lng
      );
      const remainingJunctions = Math.max(0, rJunctions.length - mission.current_route_seq + 1);
      mission.eta_seconds = EtaService.calculateCorridorEta(
        totalRemainingDist,
        ambulance.speed_kmh,
        remainingJunctions
      );
      mission.baseline_eta_seconds = EtaService.calculateBaselineEta(
        totalRemainingDist,
        ambulance.speed_kmh,
        remainingJunctions
      );

      // If close to final hospital destination
      if (totalRemainingDist < 40) {
        mission.status = 'arrived';
        mission.completed_at = new Date().toISOString();
        ambulance.speed_kmh = 0;
        logger.info({ missionId: mission.id }, 'Ambulance arrived at destination hospital');
        AuditService.log('mission_arrived', 'mission', { missionId: mission.id });
        continue;
      }

      // Check interaction with target junction
      if (targetJunction && currentRj) {
        const distToJunction = RouteService.haversineDistanceMeters(
          ambulance.lat,
          ambulance.lng,
          targetJunction.lat,
          targetJunction.lng
        );

        // If ambulance is within close threshold of junction center, mark as passed
        if (!hasPassedCenter && distToJunction <= Math.max(stepMeters * 1.2, 8)) {
          this.crossingPassed.add(crossingKey);
        }

        const isDeparting = hasPassedCenter || this.crossingPassed.has(crossingKey);
        const movement = `${currentRj.entry_approach}_${currentRj.exit_approach}` as Movement;

        // 1. Arming threshold (default <= 300m or ETA <= 30s)
        if (!isDeparting && distToJunction <= config.arming_distance_m && targetJunction.mode === 'normal') {
          mission.status = 'approaching_junction';
          SignalController.armJunction(targetJunction.id, mission.id);

          // Evaluate priority and activate emergency green
          PriorityEngine.evaluateJunction(targetJunction.id);

          SignalController.activateEmergencyCorridor(
            targetJunction.id,
            mission.id,
            movement,
            18
          ).catch((err) => {
            logger.warn({ err: err.message }, 'Could not activate emergency green corridor');
          });
        }

        // 2. Crossing Tracker updates
        const { state: crossingState, isConfirmedCleared } = CrossingTracker.update(
          targetJunction.id,
          mission.id,
          distToJunction,
          isDeparting,
          config.clear_confirm_frames
        );

        if (crossingState === 'entering' || crossingState === 'inside') {
          mission.status = 'crossing';
        }

        // 3. Junction Cleared -> Restore normal cycle automatically
        if (isConfirmedCleared) {
          logger.info(
            { junction: targetJunction.code, missionId: mission.id },
            'Ambulance confirmed cleared! Restoring junction to normal cycle.'
          );
          SignalController.restoreNormalCycle(targetJunction.id, mission.id);

          // Advance to next junction in sequence
          this.crossingPassed.delete(crossingKey);
          mission.current_route_seq++;
          mission.status = 'en_route';
          CrossingTracker.reset(targetJunction.id, mission.id);
        }
      }
    }
  }
}
