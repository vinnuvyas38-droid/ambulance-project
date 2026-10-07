import { CrossingState } from '@green-corridor/shared';
import { logger } from '../lib/logger';

interface TrackerState {
  currentState: CrossingState;
  consecutiveClearedFrames: number;
  lastDistance: number;
  updatedAt: number;
}

export class CrossingTracker {
  private static trackers: Map<string, TrackerState> = new Map();

  private static getKey(junctionId: string, missionId: string): string {
    return `${junctionId}_${missionId}`;
  }

  /**
   * Updates tracking state based on telemetry or computer vision detection.
   * Requires clear_confirm_frames consecutive 'cleared' states to officially confirm clearing.
   */
  static update(
    junctionId: string,
    missionId: string,
    distanceMeters: number,
    isMovingAway: boolean,
    clearConfirmFrames = 3
  ): { state: CrossingState; isConfirmedCleared: boolean } {
    const key = this.getKey(junctionId, missionId);
    let tracker = this.trackers.get(key);

    if (!tracker) {
      tracker = {
        currentState: 'not_detected',
        consecutiveClearedFrames: 0,
        lastDistance: distanceMeters,
        updatedAt: Date.now(),
      };
      this.trackers.set(key, tracker);
    }

    let nextState: CrossingState = tracker.currentState;

    if (!isMovingAway) {
      if (distanceMeters > 300) {
        nextState = 'not_detected';
        tracker.consecutiveClearedFrames = 0;
      } else if (distanceMeters > 50) {
        nextState = 'approaching';
        tracker.consecutiveClearedFrames = 0;
      } else if (distanceMeters > 20) {
        nextState = 'entering';
        tracker.consecutiveClearedFrames = 0;
      } else {
        nextState = 'inside';
        tracker.consecutiveClearedFrames = 0;
      }
    } else {
      // Vehicle is moving away from junction
      if (distanceMeters >= 25) {
        nextState = 'cleared';
        tracker.consecutiveClearedFrames++;
      } else {
        nextState = 'inside';
        tracker.consecutiveClearedFrames = 0;
      }
    }

    tracker.currentState = nextState;
    tracker.lastDistance = distanceMeters;
    tracker.updatedAt = Date.now();

    const isConfirmedCleared =
      tracker.currentState === 'cleared' &&
      tracker.consecutiveClearedFrames >= clearConfirmFrames;

    if (isConfirmedCleared) {
      logger.info(
        { junctionId, missionId, frames: tracker.consecutiveClearedFrames },
        'Ambulance confirmed fully cleared junction across verified frames'
      );
    }

    return {
      state: tracker.currentState,
      isConfirmedCleared,
    };
  }

  static getState(junctionId: string, missionId: string): CrossingState {
    const key = this.getKey(junctionId, missionId);
    return this.trackers.get(key)?.currentState || 'not_detected';
  }

  static reset(junctionId: string, missionId?: string): void {
    if (missionId) {
      this.trackers.delete(this.getKey(junctionId, missionId));
    } else {
      // Clear all trackers for junction
      for (const [k] of this.trackers) {
        if (k.startsWith(`${junctionId}_`)) {
          this.trackers.delete(k);
        }
      }
    }
  }
}
