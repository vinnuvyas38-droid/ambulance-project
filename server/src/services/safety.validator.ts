import {
  SignalPlan,
  Movement,
  PriorityConfig,
  DEFAULT_PRIORITY_CONFIG,
} from '@green-corridor/shared';
import { store } from '../lib/store';
import { logger } from '../lib/logger';

export interface SafetyValidationResult {
  valid: boolean;
  errors: string[];
}

export class SafetyValidator {
  /**
   * Checks whether two movements conflict at a given junction.
   */
  static areMovementsConflicting(
    junctionId: string,
    movementA: Movement,
    movementB: Movement
  ): boolean {
    if (movementA === movementB) return false;

    const [a, b] = movementA < movementB ? [movementA, movementB] : [movementB, movementA];
    const key = `${junctionId}_conf_${a}_${b}`;
    return store.junction_conflicts.has(key);
  }

  /**
   * Checks if an entire set of movements can safely be green together.
   * Conflicting movements must NEVER be green simultaneously.
   */
  static canGroupMovements(junctionId: string, movements: Movement[]): boolean {
    for (let i = 0; i < movements.length; i++) {
      for (let j = i + 1; j < movements.length; j++) {
        if (this.areMovementsConflicting(junctionId, movements[i], movements[j])) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Validates an entire proposed multi-phase signal plan against safety constraints.
   */
  static validateSignalPlan(
    junctionId: string,
    plan: SignalPlan,
    config: PriorityConfig = DEFAULT_PRIORITY_CONFIG
  ): SafetyValidationResult {
    const errors: string[] = [];

    const junction = store.junctions.get(junctionId);
    if (!junction) {
      return { valid: false, errors: [`Junction ${junctionId} does not exist.`] };
    }

    // Rule 5: Reject plans for junctions already in fail_safe mode
    if (junction.mode === 'fail_safe') {
      errors.push(`Junction ${junction.code} is currently in fail_safe mode and cannot accept overrides.`);
    }

    if (!plan.phases || plan.phases.length === 0) {
      errors.push('Signal plan must contain at least one phase.');
      return { valid: false, errors };
    }

    plan.phases.forEach((phase, index) => {
      // Rule 1: No two movements in the same phase may conflict
      for (let i = 0; i < phase.movements.length; i++) {
        for (let j = i + 1; j < phase.movements.length; j++) {
          const mA = phase.movements[i];
          const mB = phase.movements[j];
          if (this.areMovementsConflicting(junctionId, mA, mB)) {
            errors.push(
              `Phase ${phase.order} has conflicting movements: ${mA} conflicts with ${mB}. Simultaneous green is prohibited.`
            );
          }
        }
      }

      // Rule 3: min_green <= green_seconds <= max_green
      if (phase.green_seconds < config.min_green_seconds) {
        errors.push(
          `Phase ${phase.order} green duration (${phase.green_seconds}s) is below min_green_seconds (${config.min_green_seconds}s).`
        );
      }
      if (phase.green_seconds > config.max_green_seconds) {
        errors.push(
          `Phase ${phase.order} green duration (${phase.green_seconds}s) exceeds max_green_seconds (${config.max_green_seconds}s).`
        );
      }

      // Rule 2: Clearance checks (yellow and all-red)
      if (plan.phases.length > 1 || index > 0) {
        if (phase.yellow_seconds < config.yellow_seconds) {
          errors.push(
            `Phase ${phase.order} yellow clearance (${phase.yellow_seconds}s) is below required ${config.yellow_seconds}s.`
          );
        }
        if (phase.all_red_seconds < config.all_red_seconds) {
          errors.push(
            `Phase ${phase.order} all-red clearance (${phase.all_red_seconds}s) is below required ${config.all_red_seconds}s.`
          );
        }
      }
    });

    const valid = errors.length === 0;
    if (!valid) {
      logger.warn({ junctionId, errors }, 'SafetyValidator rejected proposed signal plan');
    }
    return { valid, errors };
  }

  /**
   * Validates a direct manual or emergency override request.
   */
  static validateOverrideRequest(
    junctionId: string,
    missionId: string,
    movement: Movement,
    plannedGreenSeconds?: number
  ): SafetyValidationResult {
    const errors: string[] = [];
    const junction = store.junctions.get(junctionId);
    if (!junction) {
      return { valid: false, errors: [`Junction ${junctionId} does not exist`] };
    }

    if (junction.mode === 'fail_safe') {
      errors.push(`Junction ${junction.code} is in fail-safe mode; override rejected.`);
    }

    const mission = store.missions.get(missionId);
    if (!mission) {
      errors.push(`Mission ${missionId} not found.`);
    } else {
      const ambulance = store.ambulances.get(mission.ambulance_id);
      // Rule 4: Only authorized ambulances can request overrides
      if (!ambulance || !ambulance.is_authorized) {
        errors.push(`Ambulance ${mission.ambulance_id} is not authorized for emergency corridor overrides.`);
      }
    }

    const config = store.system_config.get('priority_weights')?.value || DEFAULT_PRIORITY_CONFIG;
    if (plannedGreenSeconds !== undefined) {
      if (plannedGreenSeconds < config.min_green_seconds || plannedGreenSeconds > config.max_green_seconds) {
        errors.push(
          `Requested green duration (${plannedGreenSeconds}s) is outside safe limits [${config.min_green_seconds}s, ${config.max_green_seconds}s].`
        );
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
