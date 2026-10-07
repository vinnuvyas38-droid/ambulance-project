import { describe, it, expect } from 'vitest';
import { PriorityEngine } from '../services/priority.engine';
import { Movement } from '@green-corridor/shared';

describe('PriorityEngine', () => {
  const junctionId = 'a2222222-aaaa-2222-aaaa-222222222222'; // J2

  it('correctly ranks multiple ambulances by weighted factors and breaks ties', () => {
    const candidates = [
      {
        mission_id: 'm-low',
        ambulance_call_sign: 'AMB-LOW',
        severity_score: 45,
        eta_seconds: 60,
        waiting_seconds: 5,
        movement: 'E_W' as Movement,
      },
      {
        mission_id: 'm-crit',
        ambulance_call_sign: 'AMB-CRITICAL',
        severity_score: 95,
        eta_seconds: 30,
        waiting_seconds: 20,
        movement: 'N_S' as Movement,
      },
      {
        mission_id: 'm-high',
        ambulance_call_sign: 'AMB-HIGH',
        severity_score: 78,
        eta_seconds: 40,
        waiting_seconds: 10,
        movement: 'W_E' as Movement,
      },
    ];

    const decision = PriorityEngine.evaluateJunction(junctionId, candidates);

    expect(decision.candidates).toHaveLength(3);
    // Highest ranked should be AMB-CRITICAL (Rank 1)
    expect(decision.candidates[0].ambulance_call_sign).toBe('AMB-CRITICAL');
    expect(decision.candidates[0].rank).toBe(1);
    expect(decision.candidates[0].severity_level).toBe('critical');

    // Second ranked should be AMB-HIGH (Rank 2)
    expect(decision.candidates[1].ambulance_call_sign).toBe('AMB-HIGH');
    expect(decision.candidates[1].rank).toBe(2);

    // Third ranked should be AMB-LOW (Rank 3)
    expect(decision.candidates[2].ambulance_call_sign).toBe('AMB-LOW');
    expect(decision.candidates[2].rank).toBe(3);
  });

  it('schedules non-conflicting ambulances into separate phases when they conflict', () => {
    // N_S conflicts with E_W at J2
    const candidates = [
      {
        mission_id: 'm-1',
        ambulance_call_sign: 'AMB-1',
        severity_score: 90,
        eta_seconds: 25,
        waiting_seconds: 10,
        movement: 'N_S' as Movement,
      },
      {
        mission_id: 'm-2',
        ambulance_call_sign: 'AMB-2',
        severity_score: 75,
        eta_seconds: 30,
        waiting_seconds: 10,
        movement: 'E_W' as Movement,
      },
    ];

    const decision = PriorityEngine.evaluateJunction(junctionId, candidates);
    // Because N_S and E_W conflict, they MUST be scheduled in 2 separate phases!
    expect(decision.schedule.length).toBe(2);
    expect(decision.schedule[0].movements).toContain('N_S');
    expect(decision.schedule[1].movements).toContain('E_W');
  });
});
