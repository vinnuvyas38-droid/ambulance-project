import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  ShieldAlert,
  AlertTriangle,
  User,
  Radio,
  Sparkles,
  Zap
} from 'lucide-react';
import { AuthUser, DEMO_PROFILES, getCurrentUser, setCurrentUser } from '../lib/api';

interface NavbarProps {
  simState: any;
  onStart: () => void;
  onPause: () => void;
  onReset: (scenario?: string) => void;
  onSpeed: (speed: 1 | 2 | 4) => void;
  currentUser: AuthUser;
  onUserChange: (user: AuthUser) => void;
  activeEmergencyCount: number;
  unackedAlertsCount: number;
}

const SCENARIOS = [
  { id: 'single_ambulance', label: 'Single Ambulance Corridor' },
  { id: 'two_ambulances_conflict', label: 'Two Ambulances Conflict (J2)' },
  { id: 'three_ambulances', label: 'Three Ambulances Multi-Priority' },
  { id: 'heavy_traffic', label: 'Heavy Traffic Congestion' },
  { id: 'cv_failure_fallback', label: 'CV Camera Anomaly Fail-Safe' },
];

export const Navbar: React.FC<NavbarProps> = ({
  simState,
  onStart,
  onPause,
  onReset,
  onSpeed,
  currentUser,
  onUserChange,
  activeEmergencyCount,
  unackedAlertsCount,
}) => {
  const isRunning = !!simState?.running;
  const currentSpeed = simState?.speed_multiplier || 1;
  const scenario = simState?.scenario || 'single_ambulance';

  return (
    <header className="border-b border-slate-800 bg-[#090d16]/90 backdrop-blur-md sticky top-0 z-50 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-lg shadow-emerald-500/20 text-white font-black text-xl tracking-wider">
            <span>GC</span>
            {activeEmergencyCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                GREEN CORRIDOR
                <span className="text-xs px-1.5 py-0.5 rounded font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  AI v2.5
                </span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Smart-City Emergency Traffic Preemption Platform
            </p>
          </div>
        </div>

        {/* Center: Simulation Controls */}
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-xl p-1 shadow-inner">
          {/* Play / Pause */}
          {isRunning ? (
            <button
              onClick={onPause}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition"
              title="Pause Simulation"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>PAUSE</span>
            </button>
          ) : (
            <button
              onClick={onStart}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-emerald-600/30"
              title="Start Simulation"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>START SIM</span>
            </button>
          )}

          {/* Speed toggles */}
          <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5 text-xs font-mono">
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => onSpeed(spd as 1 | 2 | 4)}
                className={`px-2 py-1 rounded transition text-xs ${
                  currentSpeed === spd
                    ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Scenario Selector */}
          <div className="flex items-center">
            <select
              value={scenario}
              onChange={(e) => onReset(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 font-medium"
            >
              {SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reset */}
          <button
            onClick={() => onReset(scenario)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Reset Simulation Scenario"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Emergency Status & Profile Selector */}
        <div className="flex items-center gap-3">
          {/* Active Emergency Banner */}
          {activeEmergencyCount > 0 ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-red-950/60 border border-red-500/50 text-red-400 text-xs font-semibold animate-pulse">
              <span className="flex h-2 w-2 rounded-full bg-red-500"></span>
              <span className="font-mono tracking-wide">{activeEmergencyCount} CORRIDOR ACTIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="font-mono">SIGNALS NORMAL</span>
            </div>
          )}

          {/* Alerts Counter */}
          {unackedAlertsCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-950/50 border border-amber-500/40 text-amber-400 text-xs font-mono font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{unackedAlertsCount}</span>
            </div>
          )}

          {/* User Profile Selector */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={currentUser.id}
              onChange={(e) => {
                const found = DEMO_PROFILES.find((p) => p.id === e.target.value);
                if (found) onUserChange(found);
              }}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer font-medium"
            >
              {DEMO_PROFILES.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                  {p.full_name} ({p.role.toUpperCase()})
                </option>
              ))}
            </select>
            <span
              className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded font-bold ${
                currentUser.role === 'admin'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : currentUser.role === 'operator'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : currentUser.role === 'driver'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {currentUser.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
