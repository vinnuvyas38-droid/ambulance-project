import {
  UserRole,
  EmergencyLevel,
  EmergencyCategory,
  JunctionMode,
  CrossingState,
  Movement,
  Approach,
  SignalColor,
  OverrideStatus,
  MissionStatus,
  DetectionSource,
  DensityLevel,
  VehicleClass,
} from '../constants';
import {
  PatientInfoInput,
  SeverityAssessment,
  CvFrameAnalysis,
  PriorityRationale,
  SignalPlanReview,
  MissionSummary,
  PriorityConfig,
  SignalPlan,
  DetectionItem,
} from '../schemas';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Hospital {
  id: string;
  name: string;
  address?: string | null;
  lat: number;
  lng: number;
  capabilities: string[];
  is_active: boolean;
  created_at: string;
}

export interface JunctionSignalState {
  N: SignalColor;
  E: SignalColor;
  S: SignalColor;
  W: SignalColor;
}

export interface NormalCyclePhase {
  phase: string;
  movements: Movement[];
  green: number;
}

export interface Junction {
  id: string;
  code: string;
  name: string;
  lat: number;
  lng: number;
  grid_x: number;
  grid_y: number;
  mode: JunctionMode;
  normal_cycle: NormalCyclePhase[];
  current_signals: JunctionSignalState;
  active_mission_ids: string[];
  updated_at: string;
  created_at: string;
}

export interface JunctionCamera {
  id: string;
  junction_id: string;
  approach: Approach;
  label: string;
  is_online: boolean;
}

export interface JunctionMovement {
  id: string;
  junction_id: string;
  movement: Movement;
  from_approach: Approach;
  to_approach: Approach;
}

export interface JunctionConflict {
  id: string;
  junction_id: string;
  movement_a: Movement;
  movement_b: Movement;
}

export interface RouteGeometryPoint {
  lat: number;
  lng: number;
}

export interface Route {
  id: string;
  name: string;
  origin_lat: number;
  origin_lng: number;
  hospital_id: string;
  geometry: RouteGeometryPoint[];
  distance_m: number;
  created_by?: string | null;
  created_at: string;
  junctions?: RouteJunction[];
}

export interface RouteJunction {
  id: string;
  route_id: string;
  seq: number;
  junction_id: string;
  entry_approach: Approach;
  exit_approach: Approach;
  distance_from_prev_m: number;
  junction?: Junction;
}

export interface Ambulance {
  id: string;
  call_sign: string;
  driver_id?: string | null;
  is_authorized: boolean;
  lat: number;
  lng: number;
  speed_kmh: number;
  heading_deg: number;
  is_simulated: boolean;
  created_at: string;
  updated_at: string;
}

export interface Mission {
  id: string;
  ambulance_id: string;
  hospital_id: string;
  route_id?: string | null;
  created_by: string;
  patient_info: PatientInfoInput;
  emergency_category: EmergencyCategory;
  severity_score?: number | null;
  severity_level?: EmergencyLevel | null;
  status: MissionStatus;
  current_route_seq: number;
  eta_seconds?: number | null;
  baseline_eta_seconds?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  ambulance?: Ambulance;
  hospital?: Hospital;
  route?: Route;
}

export interface SeverityAssessmentRecord {
  id: string;
  mission_id: string;
  input: PatientInfoInput;
  output: SeverityAssessment;
  score: number;
  level: EmergencyLevel;
  model: string;
  latency_ms: number;
  created_at: string;
}

export interface SignalOverride {
  id: string;
  junction_id: string;
  mission_id: string;
  movement: Movement;
  status: OverrideStatus;
  planned_green_seconds?: number | null;
  requested_at: string;
  activated_at?: string | null;
  cleared_at?: string | null;
  restored_at?: string | null;
  failure_reason?: string | null;
}

export interface PriorityCandidate {
  mission_id: string;
  ambulance_call_sign: string;
  severity_score: number;
  severity_level: EmergencyLevel;
  eta_seconds: number;
  waiting_seconds: number;
  entry_approach: Approach;
  exit_approach: Approach;
  movement: Movement;
  is_authorized: boolean;
  route_requirement_score: number;
  factor_scores: {
    severity: number;
    eta: number;
    waiting: number;
    conflict_cost: number;
    route_requirement: number;
  };
  final_score: number;
  rank: number;
}

export interface PrioritySchedulePhase {
  phase_order: number;
  mission_ids: string[];
  movements: Movement[];
  green_seconds: number;
  yellow_seconds: number;
  all_red_seconds: number;
}

export interface PriorityDecision {
  id: string;
  junction_id: string;
  candidates: PriorityCandidate[];
  ranking: Array<{ mission_id: string; rank: number; final_score: number }>;
  schedule: PrioritySchedulePhase[];
  safety_validated: boolean;
  ai_rationale?: string | null;
  ai_model?: string | null;
  created_at: string;
}

export interface CvDetection {
  id: string;
  junction_id: string;
  approach?: Approach | null;
  mission_id?: string | null;
  source: DetectionSource;
  detections: DetectionItem[];
  vehicle_count: number;
  density_pct: number;
  density: DensityLevel;
  ambulance_detected: boolean;
  ambulance_direction?: Approach | null;
  crossing: CrossingState;
  confidence: number;
  created_at: string;
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  junction_id?: string | null;
  mission_id?: string | null;
  acknowledged: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string | null;
  actor_type: 'user' | 'system' | 'ai';
  action: string;
  entity: string;
  entity_id?: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface SimulationState {
  id: number;
  running: boolean;
  speed_multiplier: 1 | 2 | 4;
  scenario?: string | null;
  tick: number;
  updated_at: string;
}

export interface SystemConfig {
  key: string;
  value: PriorityConfig;
  updated_by?: string | null;
  updated_at: string;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ICvDetector {
  analyzeFrame(
    junctionId: string,
    approach: Approach,
    imageData?: string
  ): Promise<CvFrameAnalysis>;
}
