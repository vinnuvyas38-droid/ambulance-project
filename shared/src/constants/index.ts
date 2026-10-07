export const USER_ROLES = ['admin', 'operator', 'driver', 'viewer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const EMERGENCY_LEVELS = ['critical', 'high', 'medium', 'low'] as const;
export type EmergencyLevel = (typeof EMERGENCY_LEVELS)[number];

export const EMERGENCY_CATEGORIES = [
  'cardiac',
  'stroke',
  'trauma_accident',
  'respiratory',
  'obstetric',
  'burns',
  'poisoning',
  'pediatric',
  'other',
] as const;
export type EmergencyCategory = (typeof EMERGENCY_CATEGORIES)[number];

export const AGE_BANDS = ['infant', 'child', 'adult', 'senior'] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export const CONSCIOUSNESS_LEVELS = [
  'alert',
  'confused',
  'responds_to_pain',
  'unresponsive',
] as const;
export type ConsciousnessLevel = (typeof CONSCIOUSNESS_LEVELS)[number];

export const BREATHING_LEVELS = ['normal', 'labored', 'shallow', 'absent'] as const;
export type BreathingLevel = (typeof BREATHING_LEVELS)[number];

export const VEHICLE_CLASSES = [
  'ambulance',
  'car',
  'truck',
  'bus',
  'bike',
  'auto_rickshaw',
  'pedestrian',
] as const;
export type VehicleClass = (typeof VEHICLE_CLASSES)[number];

export const DENSITY_LEVELS = ['free', 'moderate', 'heavy', 'jammed'] as const;
export type DensityLevel = (typeof DENSITY_LEVELS)[number];

export const JUNCTION_MODES = [
  'normal',
  'armed',
  'emergency',
  'clearing',
  'fail_safe',
] as const;
export type JunctionMode = (typeof JUNCTION_MODES)[number];

export const CROSSING_STATES = [
  'not_detected',
  'approaching',
  'entering',
  'inside',
  'cleared',
] as const;
export type CrossingState = (typeof CROSSING_STATES)[number];

export const SIGNAL_COLORS = ['red', 'yellow', 'green'] as const;
export type SignalColor = (typeof SIGNAL_COLORS)[number];

export const APPROACHES = ['N', 'E', 'S', 'W'] as const;
export type Approach = (typeof APPROACHES)[number];

export const MOVEMENTS = [
  'N_S',
  'S_N',
  'E_W',
  'W_E',
  'N_E',
  'N_W',
  'S_E',
  'S_W',
  'E_N',
  'E_S',
  'W_N',
  'W_S',
] as const;
export type Movement = (typeof MOVEMENTS)[number];

export const MISSION_STATUSES = [
  'dispatched',
  'en_route',
  'approaching_junction',
  'crossing',
  'arrived',
  'cancelled',
] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const OVERRIDE_STATUSES = [
  'requested',
  'approved',
  'active',
  'cleared',
  'restored',
  'rejected',
  'failed_safe',
] as const;
export type OverrideStatus = (typeof OVERRIDE_STATUSES)[number];

export const DETECTION_SOURCES = ['simulated', 'gemini'] as const;
export type DetectionSource = (typeof DETECTION_SOURCES)[number];

export const SEVERITY_THRESHOLDS = {
  CRITICAL_MIN: 85,
  HIGH_MIN: 70,
  MEDIUM_MIN: 50,
  LOW_MIN: 0,
} as const;

export const DEFAULT_PRIORITY_CONFIG = {
  w_severity: 0.4,
  w_eta: 0.2,
  w_waiting: 0.15,
  w_conflict_cost: 0.15,
  w_route_requirement: 0.1,
  arming_distance_m: 300,
  yellow_seconds: 3,
  all_red_seconds: 2,
  min_green_seconds: 8,
  max_green_seconds: 30,
  clear_confirm_frames: 3,
  cv_timeout_seconds: 5,
} as const;

export const DENSITY_RANGES = {
  free: { min: 0, max: 25 },
  moderate: { min: 26, max: 50 },
  heavy: { min: 51, max: 75 },
  jammed: { min: 76, max: 100 },
} as const;

export const SCENARIO_PRESETS = [
  { id: 'single_ambulance', name: 'Single Ambulance Corridor', description: 'Standard high-urgency green corridor across 3 junctions' },
  { id: 'two_ambulances_conflict', name: 'Two Ambulances Conflict', description: 'Two ambulances approaching Junction J2 on conflicting routes' },
  { id: 'three_ambulances', name: 'Three Ambulances Multi-Priority', description: 'Critical, high, and medium ambulances ranked and scheduled' },
  { id: 'heavy_traffic', name: 'Heavy Traffic Congestion', description: 'Corridor clearance under 80%+ traffic density' },
  { id: 'cv_failure_fallback', name: 'CV Failure Fallback', description: 'Simulated camera feed anomaly triggering safety fail-safe' },
] as const;
