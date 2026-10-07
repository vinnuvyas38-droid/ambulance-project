const API_BASE = '/api/v1';

export type UserRole = 'admin' | 'operator' | 'driver' | 'viewer';

export interface AuthUser {
  id: string;
  full_name: string;
  role: UserRole;
}

export const DEMO_PROFILES: AuthUser[] = [
  { id: '10000000-0000-0000-0000-000000000001', full_name: 'Dr. Sarah Connor', role: 'admin' },
  { id: '10000000-0000-0000-0000-000000000002', full_name: 'James Reynolds', role: 'operator' },
  { id: '10000000-0000-0000-0000-000000000003', full_name: 'Alex Vance', role: 'driver' },
  { id: '10000000-0000-0000-0000-000000000004', full_name: 'City Observer', role: 'viewer' },
];

let currentToken = 'mock-admin-token';
let currentUser: AuthUser = DEMO_PROFILES[0];

export function setCurrentUser(user: AuthUser) {
  currentUser = user;
  currentToken = `mock-${user.role}-token`;
  if (typeof window !== 'undefined') {
    localStorage.setItem('greencorridor_user', JSON.stringify(user));
  }
}

export function getCurrentUser(): AuthUser {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('greencorridor_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.role) {
          currentUser = parsed;
          currentToken = `mock-${parsed.role}-token`;
        }
      } catch (e) {
        // use default
      }
    }
  }
  return currentUser;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${currentToken}`);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const errJson = await response.json();
      errorMsg = errJson.message || errJson.error || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

export const api = {
  // Simulation
  getSimulationState: () => request<any>('/simulation/state'),
  startSimulation: () => request<any>('/simulation/start', { method: 'POST' }),
  pauseSimulation: () => request<any>('/simulation/pause', { method: 'POST' }),
  resetSimulation: (scenario = 'single_ambulance') =>
    request<any>('/simulation/reset', { method: 'POST', body: JSON.stringify({ scenario }) }),
  setSimulationSpeed: (speed: 1 | 2 | 4) =>
    request<any>('/simulation/speed', { method: 'POST', body: JSON.stringify({ speed }) }),

  // Junctions
  getJunctions: () => request<any[]>('/junctions'),
  getJunctionDetail: (id: string) => request<any>(`/junctions/${id}`),
  getJunctionTimeline: (id: string) => request<any[]>(`/junctions/${id}/timeline`),

  // Signals
  overrideSignal: (junctionId: string, data: { mission_id: string; movement: string; planned_green_seconds?: number }) =>
    request<any>(`/signals/${junctionId}/override`, { method: 'POST', body: JSON.stringify(data) }),
  restoreSignal: (junctionId: string) =>
    request<any>(`/signals/${junctionId}/restore`, { method: 'POST' }),

  // Ambulances & Hospitals
  getAmbulances: () => request<any[]>('/ambulances'),
  registerAmbulance: (data: any) => request<any>('/ambulances', { method: 'POST', body: JSON.stringify(data) }),
  getHospitals: () => request<any[]>('/hospitals'),

  // Missions
  getMissions: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<any[]>(`/missions${qs ? '?' + qs : ''}`);
  },
  getMissionDetail: (id: string) => request<any>(`/missions/${id}`),
  createMission: (data: any) => request<any>('/missions', { method: 'POST', body: JSON.stringify(data) }),
  startMission: (id: string) => request<any>(`/missions/${id}/start`, { method: 'POST' }),
  cancelMission: (id: string) => request<any>(`/missions/${id}/cancel`, { method: 'POST' }),

  // Severity AI
  assessSeverity: (patientInfo: any) =>
    request<any>('/severity/assess', { method: 'POST', body: JSON.stringify(patientInfo) }),

  // Priority Engine
  evaluatePriority: (junctionId: string, candidates?: any[]) =>
    request<any>('/priority/evaluate', { method: 'POST', body: JSON.stringify({ junction_id: junctionId, candidates }) }),
  getPriorityDecisions: (junctionId?: string) =>
    request<any[]>(`/priority/decisions${junctionId ? `?junction_id=${junctionId}` : ''}`),

  // CV Feeds
  getCvDetections: (junctionId?: string) =>
    request<any[]>(`/cv/detections${junctionId ? `?junction_id=${junctionId}` : ''}`),
  analyzeFrame: (data: { image: string; approach: string; junction_id?: string }) =>
    request<any>('/cv/analyze-frame', { method: 'POST', body: JSON.stringify(data) }),

  // Alerts
  getAlerts: () => request<any[]>('/alerts'),
  acknowledgeAlert: (id: string) => request<any>(`/alerts/${id}/ack`, { method: 'PATCH' }),

  // Reports
  getReportsSummary: () => request<any>('/reports/summary'),
  getMissionReport: (missionId: string) => request<any>(`/reports/missions/${missionId}`),

  // Config
  getConfig: () => request<any>('/config'),
  updateConfig: (data: any) => request<any>('/config', { method: 'PUT', body: JSON.stringify(data) }),

  // Audit
  getAuditLogs: (page = 1, pageSize = 25) =>
    request<any[]>(`/audit?page=${page}&pageSize=${pageSize}`),
};
