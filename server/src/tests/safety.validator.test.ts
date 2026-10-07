import { describe, it, expect } from 'vitest';
import { SafetyValidator } from '../services/safety.validator';
import { SignalPlan, DEFAULT_PRIORITY_CONFIG } from '@green-corridor/shared';
import { store } from '../lib/store';

describe('SafetyValidator', () => {
  const junctionId = 'a1111111-aaaa-1111-aaaa-111111111111'; // J1

  it('correctly identifies conflicting movements from junction conflict matrix', () => {
    // E_W conflicts with N_S
    expect(SafetyValidator.areMovementsConflicting(junctionId, 'E_W', 'N_S')).toBe(true);
    // Parallel opposing through movements do NOT conflict
    expect(SafetyValidator.areMovementsConflicting(junctionId, 'N_S', 'S_N')).toBe(false);
    expect(SafetyValidator.areMovementsConflicting(junctionId, 'E_W', 'W_E')).toBe(false);
  });

  it('rejects a signal plan where conflicting movements are in the same phase', () => {
    const dangerousPlan: SignalPlan = {
      phases: [
        {
          order: 1,
          movements: ['N_S', 'E_W'], // Direct collision conflict!
          green_seconds: 15,
          yellow_seconds: 3,
          all_red_seconds: 2,
        },
      ],
    };

    const result = SafetyValidator.validateSignalPlan(junctionId, dangerousPlan);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('conflicting movements');
  });

  it('approves a safe signal plan with mutually non-conflicting movements', () => {
    const safePlan: SignalPlan = {
      phases: [
        {
          order: 1,
          movements: ['N_S', 'S_N'], // Parallel throughs
          green_seconds: 15,
          yellow_seconds: 3,
          all_red_seconds: 2,
        },
      ],
    };

    const result = SafetyValidator.validateSignalPlan(junctionId, safePlan);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects green durations below min_green_seconds or above max_green_seconds', () => {
    const tooShortPlan: SignalPlan = {
      phases: [
        {
          order: 1,
          movements: ['N_S'],
          green_seconds: 4, // Below min_green (8s)
          yellow_seconds: 3,
          all_red_seconds: 2,
        },
      ],
    };
    const resShort = SafetyValidator.validateSignalPlan(junctionId, tooShortPlan, DEFAULT_PRIORITY_CONFIG);
    expect(resShort.valid).toBe(false);
    expect(resShort.errors[0]).toContain('below min_green_seconds');

    const tooLongPlan: SignalPlan = {
      phases: [
        {
          order: 1,
          movements: ['N_S'],
          green_seconds: 50, // Above max_green (30s)
          yellow_seconds: 3,
          all_red_seconds: 2,
        },
      ],
    };
    const resLong = SafetyValidator.validateSignalPlan(junctionId, tooLongPlan, DEFAULT_PRIORITY_CONFIG);
    expect(resLong.valid).toBe(false);
    expect(resLong.errors[0]).toContain('exceeds max_green_seconds');
  });

  it('rejects overrides if junction is in fail_safe mode', () => {
    const junction = store.junctions.get(junctionId)!;
    junction.mode = 'fail_safe';

    const safePlan: SignalPlan = {
      phases: [
        {
          order: 1,
          movements: ['N_S'],
          green_seconds: 15,
          yellow_seconds: 3,
          all_red_seconds: 2,
        },
      ],
    };

    const result = SafetyValidator.validateSignalPlan(junctionId, safePlan);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('fail_safe mode');

    // Restore mode
    junction.mode = 'normal';
  });
});
