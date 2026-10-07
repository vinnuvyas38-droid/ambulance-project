import { v4 as uuidv4 } from 'uuid';
import {
  JunctionMode,
  Movement,
  Approach,
  SignalColor,
  DEFAULT_PRIORITY_CONFIG,
  SignalOverride,
} from '@green-corridor/shared';
import { store } from '../lib/store';
import { SafetyValidator } from './safety.validator';
import { logger } from '../lib/logger';
import { SafetyViolationError, NotFoundError } from '../lib/errors';

export interface SignalEvent {
  junctionId: string;
  missionId?: string;
  fromMode: JunctionMode;
  toMode: JunctionMode;
  activeMovement?: Movement;
  timestamp: string;
  reason: string;
}

export class SignalController {
  private static activeTimers: Map<string, NodeJS.Timeout> = new Map();
  public static eventTimeline: SignalEvent[] = [];

  /**
   * Sets signal head colors for N, E, S, W approaches
   */
  static setSignalHeads(
    junctionId: string,
    signals: { N: SignalColor; E: SignalColor; S: SignalColor; W: SignalColor }
  ): void {
    const junction = store.junctions.get(junctionId);
    if (junction) {
      junction.current_signals = signals;
      junction.updated_at = new Date().toISOString();
    }
  }

  /**
   * Arming phase: ambulance is approaching within arming distance (~300m / 30s)
   */
  static armJunction(junctionId: string, missionId: string): void {
    const junction = store.junctions.get(junctionId);
    if (!junction || junction.mode === 'emergency' || junction.mode === 'fail_safe') return;

    const prevMode = junction.mode;
    junction.mode = 'armed';
    junction.updated_at = new Date().toISOString();

    if (!junction.active_mission_ids.includes(missionId)) {
      junction.active_mission_ids.push(missionId);
    }

    this.logEvent(junctionId, missionId, prevMode, 'armed', 'Approaching corridor detected within arming zone');
  }

  /**
   * Emergency override activation: transitions safely via yellow and all-red clearance
   */
  static async activateEmergencyCorridor(
    junctionId: string,
    missionId: string,
    movement: Movement,
    plannedGreenSeconds = 15
  ): Promise<SignalOverride> {
    const junction = store.junctions.get(junctionId);
    if (!junction) throw new NotFoundError(`Junction ${junctionId} not found`);

    // Deterministic Safety Validation
    const validation = SafetyValidator.validateOverrideRequest(
      junctionId,
      missionId,
      movement,
      plannedGreenSeconds
    );
    if (!validation.valid) {
      throw new SafetyViolationError(
        `Safety Validator rejected override: ${validation.errors.join('; ')}`
      );
    }

    const config = store.system_config.get('priority_weights')?.value || DEFAULT_PRIORITY_CONFIG;
    const [entryApproach] = movement.split('_') as [Approach, Approach];

    // Clear any pending timer
    if (this.activeTimers.has(junctionId)) {
      clearTimeout(this.activeTimers.get(junctionId)!);
      this.activeTimers.delete(junctionId);
    }

    const prevMode = junction.mode;
    junction.mode = 'emergency';
    junction.updated_at = new Date().toISOString();

    const overrideId = uuidv4();
    const overrideRecord: SignalOverride = {
      id: overrideId,
      junction_id: junctionId,
      mission_id: missionId,
      movement,
      status: 'active',
      planned_green_seconds: plannedGreenSeconds,
      requested_at: new Date().toISOString(),
      activated_at: new Date().toISOString(),
    };
    store.signal_overrides.set(overrideId, overrideRecord);

    // 1. Yellow clearance interval
    logger.info({ junctionId, movement }, 'Executing emergency yellow clearance');
    this.setSignalHeads(junctionId, { N: 'yellow', E: 'yellow', S: 'yellow', W: 'yellow' });
    this.logEvent(junctionId, missionId, prevMode, 'emergency', 'Phase 1: Yellow clearance initiated', movement);

    // Wait yellow clearance (scaled for simulation speed)
    await new Promise((resolve) => setTimeout(resolve, Math.max(100, config.yellow_seconds * 300)));

    // 2. All-red clearance interval
    logger.info({ junctionId }, 'Executing emergency all-red clearance');
    this.setSignalHeads(junctionId, { N: 'red', E: 'red', S: 'red', W: 'red' });

    await new Promise((resolve) => setTimeout(resolve, Math.max(100, config.all_red_seconds * 300)));

    // 3. Grant emergency green to ambulance approach; keep all conflicting approaches red
    const newSignals: { N: SignalColor; E: SignalColor; S: SignalColor; W: SignalColor } = {
      N: 'red',
      E: 'red',
      S: 'red',
      W: 'red',
    };
    newSignals[entryApproach] = 'green';
    this.setSignalHeads(junctionId, newSignals);

    this.logEvent(
      junctionId,
      missionId,
      'emergency',
      'emergency',
      `Phase 3: Emergency GREEN active on ${entryApproach} approach (${movement})`,
      movement
    );

    return overrideRecord;
  }

  /**
   * Junction cleared: restores normal traffic cycle
   */
  static async restoreNormalCycle(
    junctionId: string,
    missionId?: string,
    reason = 'Ambulance crossing confirmed complete'
  ): Promise<void> {
    const junction = store.junctions.get(junctionId);
    if (!junction) return;

    const prevMode = junction.mode;
    junction.mode = 'clearing';
    junction.updated_at = new Date().toISOString();

    // Mark any active override as cleared & restored
    for (const ov of store.signal_overrides.values()) {
      if (ov.junction_id === junctionId && ov.status === 'active') {
        ov.status = 'restored';
        ov.cleared_at = new Date().toISOString();
        ov.restored_at = new Date().toISOString();
      }
    }

    if (missionId) {
      junction.active_mission_ids = junction.active_mission_ids.filter((id) => id !== missionId);
    } else {
      junction.active_mission_ids = [];
    }

    // Yellow transition before normal cycle
    this.setSignalHeads(junctionId, { N: 'yellow', E: 'yellow', S: 'yellow', W: 'yellow' });
    this.logEvent(junctionId, missionId, prevMode, 'clearing', 'Clearing yellow clearance before normal cycle');

    await new Promise((resolve) => setTimeout(resolve, 800));

    // Restore default normal cycle signals (e.g. NS red, EW green)
    junction.mode = 'normal';
    junction.current_signals = { N: 'red', E: 'green', S: 'red', W: 'green' };
    junction.updated_at = new Date().toISOString();

    this.logEvent(junctionId, missionId, 'clearing', 'normal', reason);
    logger.info({ junctionId, reason }, 'Normal traffic signal cycle restored');
  }

  /**
   * Fail-safe trigger: on any sensor failure, AI error, or safety anomaly
   */
  static triggerFailSafe(junctionId: string, reason: string): void {
    const junction = store.junctions.get(junctionId);
    if (!junction) return;

    const prevMode = junction.mode;
    junction.mode = 'fail_safe';
    junction.updated_at = new Date().toISOString();

    // Mark overrides as failed_safe
    for (const ov of store.signal_overrides.values()) {
      if (ov.junction_id === junctionId && ov.status === 'active') {
        ov.status = 'failed_safe';
        ov.failure_reason = reason;
      }
    }

    // Set signals to safe flashing yellow/red state
    this.setSignalHeads(junctionId, { N: 'yellow', E: 'yellow', S: 'yellow', W: 'yellow' });
    this.logEvent(junctionId, undefined, prevMode, 'fail_safe', `FAIL-SAFE ENGAGED: ${reason}`);

    logger.warn({ junctionId, reason }, 'FAIL-SAFE ACTIVATED: restoring safe traffic cycle');

    // Auto-restore to normal cycle after brief safety interval
    setTimeout(() => {
      this.restoreNormalCycle(junctionId, undefined, 'Automatic recovery from fail-safe');
    }, 4000);
  }

  private static logEvent(
    junctionId: string,
    missionId: string | undefined,
    fromMode: JunctionMode,
    toMode: JunctionMode,
    reason: string,
    activeMovement?: Movement
  ): void {
    const event: SignalEvent = {
      junctionId,
      missionId,
      fromMode,
      toMode,
      activeMovement,
      timestamp: new Date().toISOString(),
      reason,
    };
    this.eventTimeline.unshift(event);
    if (this.eventTimeline.length > 200) {
      this.eventTimeline.pop();
    }
  }
}
