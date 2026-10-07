import { v4 as uuidv4 } from 'uuid';
import {
  Hospital,
  Junction,
  JunctionCamera,
  JunctionMovement,
  JunctionConflict,
  Ambulance,
  Route,
  RouteJunction,
  Mission,
  SeverityAssessmentRecord,
  SignalOverride,
  PriorityDecision,
  CvDetection,
  Alert,
  AuditLog,
  SimulationState,
  SystemConfig,
  Profile,
  DEFAULT_PRIORITY_CONFIG,
  Movement,
  Approach,
} from '@green-corridor/shared';

export interface InMemoryDb {
  profiles: Map<string, Profile>;
  hospitals: Map<string, Hospital>;
  junctions: Map<string, Junction>;
  junction_cameras: Map<string, JunctionCamera>;
  junction_movements: Map<string, JunctionMovement>;
  junction_conflicts: Map<string, JunctionConflict>;
  ambulances: Map<string, Ambulance>;
  routes: Map<string, Route>;
  route_junctions: Map<string, RouteJunction>;
  missions: Map<string, Mission>;
  severity_assessments: Map<string, SeverityAssessmentRecord>;
  signal_overrides: Map<string, SignalOverride>;
  priority_decisions: Map<string, PriorityDecision>;
  cv_detections: Map<string, CvDetection>;
  alerts: Map<string, Alert>;
  audit_logs: AuditLog[];
  simulation_state: SimulationState;
  system_config: Map<string, SystemConfig>;
}

// Initial seed
export function createInitialDatabase(): InMemoryDb {
  const db: InMemoryDb = {
    profiles: new Map(),
    hospitals: new Map(),
    junctions: new Map(),
    junction_cameras: new Map(),
    junction_movements: new Map(),
    junction_conflicts: new Map(),
    ambulances: new Map(),
    routes: new Map(),
    route_junctions: new Map(),
    missions: new Map(),
    severity_assessments: new Map(),
    signal_overrides: new Map(),
    priority_decisions: new Map(),
    cv_detections: new Map(),
    alerts: new Map(),
    audit_logs: [],
    simulation_state: {
      id: 1,
      running: false,
      speed_multiplier: 1,
      scenario: 'single_ambulance',
      tick: 0,
      updated_at: new Date().toISOString(),
    },
    system_config: new Map(),
  };

  // Seed Profiles
  const defaultProfiles: Profile[] = [
    { id: '10000000-0000-0000-0000-000000000001', full_name: 'Dr. Sarah Connor (Admin)', role: 'admin', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '10000000-0000-0000-0000-000000000002', full_name: 'James Reynolds (Traffic Operator)', role: 'operator', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '10000000-0000-0000-0000-000000000003', full_name: 'Alex Vance (Paramedic Driver)', role: 'driver', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '10000000-0000-0000-0000-000000000004', full_name: 'City Observer (Viewer)', role: 'viewer', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];
  defaultProfiles.forEach((p) => db.profiles.set(p.id, p));

  // Seed System Config
  db.system_config.set('priority_weights', {
    key: 'priority_weights',
    value: { ...DEFAULT_PRIORITY_CONFIG },
    updated_at: new Date().toISOString(),
  });

  // Seed Hospitals
  const hospitals: Hospital[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Apex Trauma & Cardiac Center',
      address: '100 Healthcare Ave, Medical District',
      lat: 12.9600,
      lng: 77.5920,
      capabilities: ['trauma', 'cardiac', 'stroke', 'pediatric', 'icu'],
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'St. Jude Memorial Hospital',
      address: '45 Innovation Way, Tech Corridor',
      lat: 12.9730,
      lng: 77.6180,
      capabilities: ['cardiac', 'burns', 'neurology', 'icu'],
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'City General Emergency Hospital',
      address: '78 Civic Boulevard, Downtown',
      lat: 12.9590,
      lng: 77.6150,
      capabilities: ['general_emergency', 'obstetric', 'poisoning', 'icu'],
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ];
  hospitals.forEach((h) => db.hospitals.set(h.id, h));

  // Seed Junctions (3x2 Grid)
  const junctions: Junction[] = [
    {
      id: 'a1111111-aaaa-1111-aaaa-111111111111',
      code: 'J1',
      name: 'Metro Central Junction',
      lat: 12.9716,
      lng: 77.5946,
      grid_x: 0,
      grid_y: 0,
      mode: 'normal',
      normal_cycle: [
        { phase: 'NS', movements: ['N_S', 'S_N', 'N_E', 'S_W'], green: 25 },
        { phase: 'EW', movements: ['E_W', 'W_E', 'E_S', 'W_N'], green: 25 },
      ],
      current_signals: { N: 'red', E: 'green', S: 'red', W: 'green' },
      active_mission_ids: [],
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: 'a2222222-aaaa-2222-aaaa-222222222222',
      code: 'J2',
      name: 'Civic Square Junction',
      lat: 12.9716,
      lng: 77.6046,
      grid_x: 1,
      grid_y: 0,
      mode: 'normal',
      normal_cycle: [
        { phase: 'NS', movements: ['N_S', 'S_N', 'N_E', 'S_W'], green: 25 },
        { phase: 'EW', movements: ['E_W', 'W_E', 'E_S', 'W_N'], green: 25 },
      ],
      current_signals: { N: 'red', E: 'green', S: 'red', W: 'green' },
      active_mission_ids: [],
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: 'a3333333-aaaa-3333-aaaa-333333333333',
      code: 'J3',
      name: 'Tech Park Avenue',
      lat: 12.9716,
      lng: 77.6146,
      grid_x: 2,
      grid_y: 0,
      mode: 'normal',
      normal_cycle: [
        { phase: 'NS', movements: ['N_S', 'S_N', 'N_E', 'S_W'], green: 25 },
        { phase: 'EW', movements: ['E_W', 'W_E', 'E_S', 'W_N'], green: 25 },
      ],
      current_signals: { N: 'red', E: 'green', S: 'red', W: 'green' },
      active_mission_ids: [],
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: 'a4444444-aaaa-4444-aaaa-444444444444',
      code: 'J4',
      name: 'Hospital Boulevard',
      lat: 12.9616,
      lng: 77.5946,
      grid_x: 0,
      grid_y: 1,
      mode: 'normal',
      normal_cycle: [
        { phase: 'NS', movements: ['N_S', 'S_N', 'N_E', 'S_W'], green: 25 },
        { phase: 'EW', movements: ['E_W', 'W_E', 'E_S', 'W_N'], green: 25 },
      ],
      current_signals: { N: 'red', E: 'green', S: 'red', W: 'green' },
      active_mission_ids: [],
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: 'a5555555-aaaa-5555-aaaa-555555555555',
      code: 'J5',
      name: 'Rivergate Cross',
      lat: 12.9616,
      lng: 77.6046,
      grid_x: 1,
      grid_y: 1,
      mode: 'normal',
      normal_cycle: [
        { phase: 'NS', movements: ['N_S', 'S_N', 'N_E', 'S_W'], green: 25 },
        { phase: 'EW', movements: ['E_W', 'W_E', 'E_S', 'W_N'], green: 25 },
      ],
      current_signals: { N: 'red', E: 'green', S: 'red', W: 'green' },
      active_mission_ids: [],
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: 'a6666666-aaaa-6666-aaaa-666666666666',
      code: 'J6',
      name: 'Eastern Expressway Hub',
      lat: 12.9616,
      lng: 77.6146,
      grid_x: 2,
      grid_y: 1,
      mode: 'normal',
      normal_cycle: [
        { phase: 'NS', movements: ['N_S', 'S_N', 'N_E', 'S_W'], green: 25 },
        { phase: 'EW', movements: ['E_W', 'W_E', 'E_S', 'W_N'], green: 25 },
      ],
      current_signals: { N: 'red', E: 'green', S: 'red', W: 'green' },
      active_mission_ids: [],
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ];
  junctions.forEach((j) => db.junctions.set(j.id, j));

  // Seed Cameras, Movements, and Conflicts for all 6 junctions
  const approaches: Approach[] = ['N', 'E', 'S', 'W'];
  const allMovements: Array<{ m: Movement; f: Approach; t: Approach }> = [
    { m: 'N_S', f: 'N', t: 'S' }, { m: 'S_N', f: 'S', t: 'N' },
    { m: 'E_W', f: 'E', t: 'W' }, { m: 'W_E', f: 'W', t: 'E' },
    { m: 'N_E', f: 'N', t: 'E' }, { m: 'N_W', f: 'N', t: 'W' },
    { m: 'S_E', f: 'S', t: 'E' }, { m: 'S_W', f: 'S', t: 'W' },
    { m: 'E_N', f: 'E', t: 'N' }, { m: 'E_S', f: 'E', t: 'S' },
    { m: 'W_N', f: 'W', t: 'N' }, { m: 'W_S', f: 'W', t: 'S' },
  ];

  const conflictPairs: Array<[Movement, Movement]> = [
    ['E_W', 'N_S'], ['E_W', 'S_N'], ['E_W', 'N_W'], ['E_W', 'S_E'], ['E_W', 'S_W'], ['E_W', 'N_E'],
    ['N_S', 'W_E'], ['S_N', 'W_E'], ['N_E', 'W_E'], ['N_W', 'W_E'], ['S_E', 'W_E'], ['S_W', 'W_E'],
    ['E_S', 'N_S'], ['E_S', 'S_N'], ['E_S', 'W_E'], ['E_S', 'N_W'], ['E_S', 'W_N'],
    ['N_S', 'W_N'], ['S_N', 'W_N'], ['E_W', 'W_N'], ['S_W', 'W_N'], ['E_S', 'W_N'],
    ['N_S', 'S_W'], ['E_W', 'S_W'], ['W_E', 'S_W'], ['E_N', 'S_W'],
    ['E_W', 'N_E'], ['N_E', 'S_N'], ['N_E', 'W_E'], ['N_E', 'W_S'],
    ['E_N', 'N_S'], ['E_N', 'S_N'], ['E_N', 'W_E'], ['E_N', 'W_S'],
    ['N_S', 'W_S'], ['S_N', 'W_S'], ['E_W', 'W_S'],
    ['E_S', 'W_S'], ['E_N', 'W_N'],
  ];

  junctions.forEach((j) => {
    // Cameras
    approaches.forEach((app) => {
      const camId = `${j.id}_cam_${app}`;
      db.junction_cameras.set(camId, {
        id: camId,
        junction_id: j.id,
        approach: app,
        label: `${j.code} Camera ${app}`,
        is_online: true,
      });
    });

    // Movements
    allMovements.forEach((mov) => {
      const movId = `${j.id}_mov_${mov.m}`;
      db.junction_movements.set(movId, {
        id: movId,
        junction_id: j.id,
        movement: mov.m,
        from_approach: mov.f,
        to_approach: mov.t,
      });
    });

    // Conflicts (stored with movement_a < movement_b)
    conflictPairs.forEach(([m1, m2]) => {
      const [a, b] = m1 < m2 ? [m1, m2] : [m2, m1];
      const confId = `${j.id}_conf_${a}_${b}`;
      db.junction_conflicts.set(confId, {
        id: confId,
        junction_id: j.id,
        movement_a: a,
        movement_b: b,
      });
    });
  });

  // Ambulances (4)
  const ambulances: Ambulance[] = [
    {
      id: 'bbbbbbbb-1111-bbbb-1111-111111111111',
      call_sign: 'MEDIC-101',
      driver_id: '10000000-0000-0000-0000-000000000003',
      is_authorized: true,
      lat: 12.9716,
      lng: 77.5880,
      speed_kmh: 52.0,
      heading_deg: 90.0,
      is_simulated: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'bbbbbbbb-2222-bbbb-2222-222222222222',
      call_sign: 'MEDIC-102',
      driver_id: null,
      is_authorized: true,
      lat: 12.9780,
      lng: 77.6046,
      speed_kmh: 48.0,
      heading_deg: 180.0,
      is_simulated: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'bbbbbbbb-3333-bbbb-3333-333333333333',
      call_sign: 'CRITICAL-201',
      driver_id: null,
      is_authorized: true,
      lat: 12.9616,
      lng: 77.5880,
      speed_kmh: 55.0,
      heading_deg: 90.0,
      is_simulated: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'bbbbbbbb-4444-bbbb-4444-444444444444',
      call_sign: 'RAPID-301',
      driver_id: null,
      is_authorized: true,
      lat: 12.9716,
      lng: 77.6200,
      speed_kmh: 45.0,
      heading_deg: 270.0,
      is_simulated: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  ambulances.forEach((a) => db.ambulances.set(a.id, a));

  // Routes (3)
  const routes: Route[] = [
    {
      id: 'cccccccc-1111-cccc-1111-111111111111',
      name: 'West-East Expressway to St. Jude',
      origin_lat: 12.9716,
      origin_lng: 77.5880,
      hospital_id: '22222222-2222-2222-2222-222222222222',
      geometry: [
        { lat: 12.9716, lng: 77.5880 },
        { lat: 12.9716, lng: 77.5946 },
        { lat: 12.9716, lng: 77.6046 },
        { lat: 12.9716, lng: 77.6146 },
        { lat: 12.9730, lng: 77.6180 },
      ],
      distance_m: 3200,
      created_at: new Date().toISOString(),
    },
    {
      id: 'cccccccc-2222-cccc-2222-222222222222',
      name: 'North Arterial to Apex Trauma',
      origin_lat: 12.9780,
      origin_lng: 77.5946,
      hospital_id: '11111111-1111-1111-1111-111111111111',
      geometry: [
        { lat: 12.9780, lng: 77.5946 },
        { lat: 12.9716, lng: 77.5946 },
        { lat: 12.9616, lng: 77.5946 },
        { lat: 12.9600, lng: 77.5920 },
      ],
      distance_m: 2200,
      created_at: new Date().toISOString(),
    },
    {
      id: 'cccccccc-3333-cccc-3333-333333333333',
      name: 'Central Cross to Apex Trauma',
      origin_lat: 12.9780,
      origin_lng: 77.6046,
      hospital_id: '11111111-1111-1111-1111-111111111111',
      geometry: [
        { lat: 12.9780, lng: 77.6046 },
        { lat: 12.9716, lng: 77.6046 },
        { lat: 12.9616, lng: 77.6046 },
        { lat: 12.9616, lng: 77.5946 },
        { lat: 12.9600, lng: 77.5920 },
      ],
      distance_m: 3500,
      created_at: new Date().toISOString(),
    },
  ];
  routes.forEach((r) => db.routes.set(r.id, r));

  // Route Junctions
  const routeJunctions: RouteJunction[] = [
    // Route 1
    { id: uuidv4(), route_id: routes[0].id, seq: 1, junction_id: junctions[0].id, entry_approach: 'W', exit_approach: 'E', distance_from_prev_m: 700 },
    { id: uuidv4(), route_id: routes[0].id, seq: 2, junction_id: junctions[1].id, entry_approach: 'W', exit_approach: 'E', distance_from_prev_m: 1100 },
    { id: uuidv4(), route_id: routes[0].id, seq: 3, junction_id: junctions[2].id, entry_approach: 'W', exit_approach: 'E', distance_from_prev_m: 1100 },
    // Route 2
    { id: uuidv4(), route_id: routes[1].id, seq: 1, junction_id: junctions[0].id, entry_approach: 'N', exit_approach: 'S', distance_from_prev_m: 700 },
    { id: uuidv4(), route_id: routes[1].id, seq: 2, junction_id: junctions[3].id, entry_approach: 'N', exit_approach: 'S', distance_from_prev_m: 1100 },
    // Route 3
    { id: uuidv4(), route_id: routes[2].id, seq: 1, junction_id: junctions[1].id, entry_approach: 'N', exit_approach: 'S', distance_from_prev_m: 700 },
    { id: uuidv4(), route_id: routes[2].id, seq: 2, junction_id: junctions[4].id, entry_approach: 'N', exit_approach: 'W', distance_from_prev_m: 1100 },
    { id: uuidv4(), route_id: routes[2].id, seq: 3, junction_id: junctions[3].id, entry_approach: 'E', exit_approach: 'W', distance_from_prev_m: 1100 },
  ];
  routeJunctions.forEach((rj) => db.route_junctions.set(rj.id, rj));

  return db;
}

export const store = createInitialDatabase();
