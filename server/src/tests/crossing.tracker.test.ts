import { describe, it, expect, beforeEach } from 'vitest';
import { CrossingTracker } from '../services/crossing.tracker';

describe('CrossingTracker', () => {
  const junctionId = 'j-test-1';
  const missionId = 'm-test-1';

  beforeEach(() => {
    CrossingTracker.reset(junctionId);
  });

  it('progresses through states: not_detected -> approaching -> entering -> inside', () => {
    // 1. Far away (>300m)
    let res = CrossingTracker.update(junctionId, missionId, 450, false);
    expect(res.state).toBe('not_detected');
    expect(res.isConfirmedCleared).toBe(false);

    // 2. Approaching (200m)
    res = CrossingTracker.update(junctionId, missionId, 200, false);
    expect(res.state).toBe('approaching');

    // 3. Entering stop line (40m)
    res = CrossingTracker.update(junctionId, missionId, 40, false);
    expect(res.state).toBe('entering');

    // 4. Inside intersection box (10m)
    res = CrossingTracker.update(junctionId, missionId, 10, false);
    expect(res.state).toBe('inside');
  });

  it('requires consecutive cleared frames before declaring confirmed cleared', () => {
    // Inside intersection
    CrossingTracker.update(junctionId, missionId, 10, false);

    // Frame 1 of cleared (moving away, distance 30m)
    let res = CrossingTracker.update(junctionId, missionId, 30, true, 3);
    expect(res.state).toBe('cleared');
    expect(res.isConfirmedCleared).toBe(false); // Only 1 frame

    // Frame 2 of cleared
    res = CrossingTracker.update(junctionId, missionId, 45, true, 3);
    expect(res.state).toBe('cleared');
    expect(res.isConfirmedCleared).toBe(false); // Only 2 frames

    // Frame 3 of cleared
    res = CrossingTracker.update(junctionId, missionId, 60, true, 3);
    expect(res.state).toBe('cleared');
    expect(res.isConfirmedCleared).toBe(true); // 3 consecutive frames verified!
  });
});
