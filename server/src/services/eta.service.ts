export class EtaService {
  /**
   * Calculates dynamic ETA for an ambulance in an active green corridor
   * @param distanceMeters remaining distance to destination
   * @param speedKmh current or planned ambulance speed in km/h (default 50)
   * @param remainingJunctions count of upcoming junctions
   */
  static calculateCorridorEta(
    distanceMeters: number,
    speedKmh = 50,
    remainingJunctions = 1
  ): number {
    const effectiveSpeed = Math.max(20, speedKmh);
    const travelTimeSeconds = Math.round(distanceMeters / (effectiveSpeed * (1000 / 3600)));
    // Minimal green corridor clearance overhead (~4s per junction)
    const corridorOverhead = remainingJunctions * 4;
    return travelTimeSeconds + corridorOverhead;
  }

  /**
   * Calculates baseline fixed-cycle traffic ETA (without AI green corridor)
   * Standard fixed signal cycles force red halts (~25-35s) plus queue backpressure (~15-20s)
   */
  static calculateBaselineEta(
    distanceMeters: number,
    speedKmh = 40,
    remainingJunctions = 1
  ): number {
    const corridorEta = this.calculateCorridorEta(distanceMeters, speedKmh, remainingJunctions);
    // Average delay per red signal cycle with cross-traffic queue: ~42 seconds per junction
    const fixedCycleDelayPerJunction = 42;
    return corridorEta + remainingJunctions * fixedCycleDelayPerJunction;
  }

  /**
   * Calculates time saved vs fixed-cycle baseline
   */
  static calculateTimeSaved(corridorEta: number, baselineEta: number): number {
    return Math.max(0, baselineEta - corridorEta);
  }
}
