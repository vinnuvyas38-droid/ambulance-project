import React, { useState } from 'react';
import {
  X,
  Shield,
  ShieldAlert,
  Radio,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Video,
  Activity,
  Sliders
} from 'lucide-react';
import { api } from '../lib/api';

interface JunctionInspectorProps {
  junction: any;
  missions?: any[];
  ambulances?: any[];
  onClose: () => void;
  onRefresh: () => void;
  userRole: string;
}

export const JunctionInspector: React.FC<JunctionInspectorProps> = ({
  junction,
  missions = [],
  ambulances = [],
  onClose,
  onRefresh,
  userRole,
}) => {
  const [selectedMovement, setSelectedMovement] = useState('W_E');
  const [greenDuration, setGreenDuration] = useState(20);
  const [selectedMissionId, setSelectedMissionId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!junction) return null;

  const signals = junction.current_signals || { N: 'red', E: 'green', S: 'red', W: 'green' };
  const canControl = ['admin', 'operator'].includes(userRole);

  // Active missions
  const activeMissions = (missions || []).filter((m: any) =>
    ['dispatched', 'en_route', 'approaching_junction', 'crossing'].includes(m.status)
  );

  // Missions associated with this junction directly or through route
  const junctionMissions = activeMissions.filter(
    (m: any) =>
      junction.active_mission_ids?.includes(m.id) ||
      m.route?.junctions?.some((rj: any) => rj.junction_id === junction.id)
  );

  const availableMissions = junctionMissions.length > 0 ? junctionMissions : activeMissions;

  // Sync selected mission when available missions change
  React.useEffect(() => {
    if (availableMissions.length > 0) {
      if (!selectedMissionId || !availableMissions.some((m) => m.id === selectedMissionId)) {
        const defaultMission = availableMissions[0];
        setSelectedMissionId(defaultMission.id);
        const rj = defaultMission.route?.junctions?.find((j: any) => j.junction_id === junction.id);
        if (rj) {
          setSelectedMovement(`${rj.entry_approach}_${rj.exit_approach}`);
        }
      }
    } else {
      setSelectedMissionId('');
    }
  }, [availableMissions, junction.id, selectedMissionId]);

  const handleForceOverride = async () => {
    if (!selectedMissionId) {
      setStatusMsg('Unable to activate emergency override: no active authorized ambulance mission is associated with this junction.');
      return;
    }

    try {
      setLoading(true);
      setStatusMsg(null);
      await api.overrideSignal(junction.id, {
        mission_id: selectedMissionId,
        movement: selectedMovement,
        planned_green_seconds: greenDuration,
      });
      setStatusMsg('Emergency Green Corridor preempted successfully!');
      onRefresh();
    } catch (err: any) {
      setStatusMsg(`Override rejected: ${err.message || 'Safety validation failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreNormal = async () => {
    try {
      setLoading(true);
      setStatusMsg(null);
      await api.restoreSignal(junction.id);
      setStatusMsg('Restored normal fixed-time signal cycle.');
      onRefresh();
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0b101c] border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-mono font-black text-emerald-400 text-lg">
            {junction.code}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{junction.name}</h3>
            <p className="text-[11px] font-mono text-slate-400">
              Coordinates: {junction.lat.toFixed(4)}°N, {junction.lng.toFixed(4)}°E
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Badge & Active Corridor Status */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1">
            Operational Mode
          </span>
          <span
            className={`text-xs font-mono font-bold px-2 py-0.5 rounded inline-block ${
              junction.mode === 'emergency'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : junction.mode === 'fail_safe'
                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                : junction.mode === 'armed'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {junction.mode.toUpperCase()}
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1">
            Active Missions
          </span>
          <span className="text-xs font-mono font-bold text-white">
            {junction.active_mission_ids?.length || 0} Vehicle(s) Assigned
          </span>
        </div>
      </div>

      {/* 4-Way Signal Lights Status */}
      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          4-Way Signal Light Pods
        </h4>
        <div className="grid grid-cols-4 gap-2 text-center font-mono">
          {(['N', 'E', 'S', 'W'] as const).map((app) => {
            const sig = signals[app] || 'red';
            return (
              <div
                key={app}
                className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center gap-1.5"
              >
                <span className="text-[11px] font-bold text-slate-400">Approach {app}</span>
                <span
                  className={`w-4 h-4 rounded-full transition-all ${
                    sig === 'green'
                      ? 'bg-emerald-400 signal-green-glow'
                      : sig === 'yellow'
                      ? 'bg-amber-400 signal-yellow-glow'
                      : 'bg-red-500 signal-red-glow'
                  }`}
                />
                <span
                  className={`text-[10px] uppercase font-bold ${
                    sig === 'green'
                      ? 'text-emerald-400'
                      : sig === 'yellow'
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                >
                  {sig}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Manual Control Actions for Operator */}
      <div className="border-t border-slate-800/80 pt-3">
        <h4 className="text-xs font-semibold text-slate-300 mb-2.5 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Manual Signal Preemption Controls
        </h4>

        {canControl ? (
          <div className="flex flex-col gap-2.5">
            {availableMissions.length === 0 ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Preemption Override Unavailable</span>
                  <p className="text-[11px] text-amber-200/80 mt-0.5">
                    No active authorized ambulance mission is associated with this junction. Emergency signal override requires an active, authorized emergency mission.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-[10px] text-slate-400 font-mono block mb-1">
                  Active Emergency Mission
                </label>
                <select
                  value={selectedMissionId}
                  onChange={(e) => {
                    const mId = e.target.value;
                    setSelectedMissionId(mId);
                    const m = availableMissions.find((x) => x.id === mId);
                    const rj = m?.route?.junctions?.find((j: any) => j.junction_id === junction.id);
                    if (rj) {
                      setSelectedMovement(`${rj.entry_approach}_${rj.exit_approach}`);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-emerald-500"
                >
                  {availableMissions.map((m: any) => {
                    const amb = ambulances.find((a) => a.id === m.ambulance_id) || m.ambulance;
                    return (
                      <option key={m.id} value={m.id}>
                        {amb?.call_sign || 'MEDIC'} • {m.emergency_category?.toUpperCase() || 'EMERGENCY'} ({m.severity_level || 'PRIORITY'})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 font-mono block mb-1">
                  Movement Corridor
                </label>
                <select
                  value={selectedMovement}
                  onChange={(e) => setSelectedMovement(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-emerald-500"
                >
                  <option value="W_E">West to East (W_E)</option>
                  <option value="E_W">East to West (E_W)</option>
                  <option value="N_S">North to South (N_S)</option>
                  <option value="S_N">South to North (S_N)</option>
                  <option value="N_E">North to East (N_E)</option>
                  <option value="W_S">West to South (W_S)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-mono block mb-1">
                  Green Phase ({greenDuration}s)
                </label>
                <input
                  type="range"
                  min="8"
                  max="30"
                  value={greenDuration}
                  onChange={(e) => setGreenDuration(Number(e.target.value))}
                  className="w-full accent-emerald-500 mt-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                disabled={loading || availableMissions.length === 0 || !selectedMissionId}
                onClick={handleForceOverride}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Force Green Corridor</span>
              </button>

              <button
                disabled={loading}
                onClick={handleRestoreNormal}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Normal Cycle</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-500" />
            <span>Switch to Admin or Operator role to issue manual overrides.</span>
          </div>
        )}

        {statusMsg && (
          <div className="mt-2 text-[11px] p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-emerald-400">
            {statusMsg}
          </div>
        )}
      </div>
    </div>
  );
};
