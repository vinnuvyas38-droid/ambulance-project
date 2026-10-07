import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Send,
  Scale,
  Video,
  BarChart3,
  AlertTriangle,
  Radio,
  Sparkles,
  ShieldAlert,
  Activity,
  Heart
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { CityMap } from './components/CityMap';
import { JunctionInspector } from './components/JunctionInspector';
import { EmergencyDispatch } from './components/EmergencyDispatch';
import { PriorityArbitration } from './components/PriorityArbitration';
import { CvFeedMonitor } from './components/CvFeedMonitor';
import { AnalyticsReports } from './components/AnalyticsReports';
import { AlertsAudit } from './components/AlertsAudit';
import { api, AuthUser, getCurrentUser, setCurrentUser } from './lib/api';

export function App() {
  const [currentUser, setUserState] = useState<AuthUser>(getCurrentUser());
  const [activeTab, setActiveTab] = useState<'map' | 'dispatch' | 'priority' | 'cv' | 'analytics' | 'alerts'>('map');

  // Simulation data
  const [simState, setSimState] = useState<any>({ running: false, speed_multiplier: 1, scenario: 'single_ambulance' });
  const [junctions, setJunctions] = useState<any[]>([]);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedJunctionId, setSelectedJunctionId] = useState<string | null>(null);

  const handleUserChange = (u: AuthUser) => {
    setCurrentUser(u);
    setUserState(u);
  };

  // Poll state every 800ms for continuous live simulation
  const fetchAll = async () => {
    try {
      const [sState, juncs, ambs, miss, hosps, alrts] = await Promise.all([
        api.getSimulationState().catch(() => null),
        api.getJunctions().catch(() => []),
        api.getAmbulances().catch(() => []),
        api.getMissions().catch(() => []),
        api.getHospitals().catch(() => []),
        api.getAlerts().catch(() => []),
      ]);

      if (sState) setSimState(sState);
      if (Array.isArray(juncs)) setJunctions(juncs);
      if (Array.isArray(ambs)) setAmbulances(ambs);
      if (Array.isArray(miss)) setMissions(miss);
      if (Array.isArray(hosps)) setHospitals(hosps);
      if (Array.isArray(alrts)) setAlerts(alrts);
    } catch {
      // offline / starting up
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 750);
    return () => clearInterval(interval);
  }, []);

  // Handlers for simulation master controls
  const handleStartSim = async () => {
    try {
      const res = await api.startSimulation();
      setSimState(res);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePauseSim = async () => {
    try {
      const res = await api.pauseSimulation();
      setSimState(res);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetSim = async (scenario = 'single_ambulance') => {
    try {
      const res = await api.resetSimulation(scenario);
      setSimState(res);
      fetchAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSpeedSim = async (speed: 1 | 2 | 4) => {
    try {
      const res = await api.setSimulationSpeed(speed);
      setSimState(res);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Calculate active emergencies
  const activeEmergencies = junctions.filter((j) => j.mode === 'emergency').length;
  const unackedAlerts = alerts.filter((a) => !a.acknowledged).length;

  const selectedJunction = junctions.find((j) => j.id === selectedJunctionId);

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col font-sans">
      {/* Top Header & Simulation Command Bar */}
      <Navbar
        simState={simState}
        onStart={handleStartSim}
        onPause={handlePauseSim}
        onReset={handleResetSim}
        onSpeed={handleSpeedSim}
        currentUser={currentUser}
        onUserChange={handleUserChange}
        activeEmergencyCount={activeEmergencies}
        unackedAlertsCount={unackedAlerts}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 py-5 flex-1 flex flex-col gap-5">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <nav className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-xl shadow-inner text-xs">
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition ${
                activeTab === 'map'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Corridor Grid & Map</span>
            </button>

            <button
              onClick={() => setActiveTab('dispatch')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition ${
                activeTab === 'dispatch'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-red-400" />
              <span>Emergency Dispatch & AI Triage</span>
              {missions.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-950 text-emerald-400 font-extrabold">
                  {missions.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('priority')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition ${
                activeTab === 'priority'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Scale className="w-3.5 h-3.5 text-purple-400" />
              <span>Priority Arbitration</span>
            </button>

            <button
              onClick={() => setActiveTab('cv')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition ${
                activeTab === 'cv'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-sky-400" />
              <span>Live CV Camera Feed</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition ${
                activeTab === 'analytics'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Analytics & Reports</span>
            </button>

            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition ${
                activeTab === 'alerts'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>Alerts & Audit</span>
              {unackedAlerts > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-red-500 text-white font-extrabold animate-pulse">
                  {unackedAlerts}
                </span>
              )}
            </button>
          </nav>

          {/* Quick Status Pill */}
          <div className="flex items-center gap-2 font-mono text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500">ENGINE TICK:</span>
            <span className="text-emerald-400 font-bold">{simState?.tick || 0}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">SCENARIO: {simState?.scenario?.replace('_', ' ').toUpperCase()}</span>
          </div>
        </div>

        {/* Tab View Content */}
        {activeTab === 'map' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className={selectedJunction ? 'lg:col-span-8' : 'lg:col-span-12'}>
              <CityMap
                junctions={junctions}
                ambulances={ambulances}
                missions={missions}
                hospitals={hospitals}
                selectedJunctionId={selectedJunctionId}
                onSelectJunction={(id) => setSelectedJunctionId(id)}
                onManualOverride={(jId, mov) => {
                  const activeM = missions.find((m) =>
                    ['dispatched', 'en_route', 'approaching_junction', 'crossing'].includes(m.status) &&
                    (junctions.find((j) => j.id === jId)?.active_mission_ids?.includes(m.id) ||
                     m.route?.junctions?.some((rj: any) => rj.junction_id === jId))
                  ) || missions.find((m) => ['dispatched', 'en_route', 'approaching_junction', 'crossing'].includes(m.status));

                  if (!activeM) {
                    alert("Unable to activate emergency override: no active authorized ambulance mission is associated with this junction.");
                    return;
                  }
                  return api.overrideSignal(jId, { mission_id: activeM.id, movement: mov }).then(fetchAll);
                }}
                onRestoreSignal={(jId) => api.restoreSignal(jId).then(fetchAll)}
              />
            </div>

            {selectedJunction && (
              <div className="lg:col-span-4">
                <JunctionInspector
                  junction={selectedJunction}
                  missions={missions}
                  ambulances={ambulances}
                  onClose={() => setSelectedJunctionId(null)}
                  onRefresh={fetchAll}
                  userRole={currentUser.role}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'dispatch' && (
          <EmergencyDispatch
            ambulances={ambulances}
            hospitals={hospitals}
            missions={missions}
            onMissionCreated={fetchAll}
            userRole={currentUser.role}
          />
        )}

        {activeTab === 'priority' && (
          <PriorityArbitration junctions={junctions} userRole={currentUser.role} />
        )}

        {activeTab === 'cv' && (
          <CvFeedMonitor junctions={junctions} userRole={currentUser.role} />
        )}

        {activeTab === 'analytics' && <AnalyticsReports missions={missions} />}

        {activeTab === 'alerts' && (
          <AlertsAudit alerts={alerts} onRefresh={fetchAll} userRole={currentUser.role} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#060911] px-4 py-3 text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>SYSTEM STATUS: OPTIMAL</span>
            <span className="text-slate-700">|</span>
            <span>BACKEND: http://localhost:4000</span>
            <span className="text-slate-700">|</span>
            <span>AI: Gemini 2.5 Flash Connected</span>
          </div>
          <div>
            <span>Smart-City Emergency Green Corridor Platform &copy; 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
export default App;
