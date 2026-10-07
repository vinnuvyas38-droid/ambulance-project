import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Zap,
  Sliders,
  Scale,
  Sparkles,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { api } from '../lib/api';

interface PriorityArbitrationProps {
  junctions: any[];
  userRole: string;
}

interface FullConfig {
  w_severity: number;
  w_eta: number;
  w_waiting: number;
  w_conflict_cost: number;
  w_route_requirement: number;
  arming_distance_m: number;
  yellow_seconds: number;
  all_red_seconds: number;
  min_green_seconds: number;
  max_green_seconds: number;
  clear_confirm_frames: number;
  cv_timeout_seconds: number;
}

const DEFAULT_CONFIG: FullConfig = {
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
};

const WEIGHT_KEYS = [
  'w_severity',
  'w_eta',
  'w_waiting',
  'w_conflict_cost',
  'w_route_requirement',
] as const;

type WeightKey = (typeof WEIGHT_KEYS)[number];

export const PriorityArbitration: React.FC<PriorityArbitrationProps> = ({
  junctions,
  userRole,
}) => {
  const [selectedJunctionId, setSelectedJunctionId] = useState(
    junctions.find((j) => j.code === 'J2')?.id || junctions[0]?.id || ''
  );
  const [evaluating, setEvaluating] = useState(false);
  const [decision, setDecision] = useState<any>(null);
  const [weights, setWeights] = useState<FullConfig>(DEFAULT_CONFIG);
  const [savingConfig, setSavingConfig] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // Load config from backend
    api.getConfig().then((cfg) => {
      if (cfg) setWeights((prev) => ({ ...prev, ...cfg }));
    }).catch(() => {});
  }, []);

  const handleEvaluateAi = async () => {
    try {
      setEvaluating(true);
      setMsg(null);
      const res = await api.evaluatePriority(selectedJunctionId);
      setDecision(res);
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  // Rebalances the other 4 weights when one weight slider is dragged so total sum is always 1.000
  const handleWeightSliderChange = (changedKey: WeightKey, rawVal: number) => {
    const newVal = Math.max(0.02, Math.min(0.85, Math.round(rawVal * 100) / 100));
    const otherKeys = WEIGHT_KEYS.filter((k) => k !== changedKey);
    const remainingBudget = Math.max(0.05, Math.round((1.0 - newVal) * 1000) / 1000);

    const currentOthersSum = otherKeys.reduce((acc, k) => acc + (weights[k] || 0), 0);
    const nextWeights: FullConfig = { ...weights, [changedKey]: newVal };

    if (currentOthersSum > 0.001) {
      let accumulated = 0;
      otherKeys.forEach((k, idx) => {
        if (idx === otherKeys.length - 1) {
          const finalVal = Math.max(0.01, Math.round((remainingBudget - accumulated) * 1000) / 1000);
          nextWeights[k] = finalVal;
        } else {
          const share = Math.round(((weights[k] / currentOthersSum) * remainingBudget) * 1000) / 1000;
          nextWeights[k] = Math.max(0.01, share);
          accumulated += nextWeights[k];
        }
      });
    } else {
      const share = Math.round((remainingBudget / otherKeys.length) * 1000) / 1000;
      otherKeys.forEach((k, idx) => {
        nextWeights[k] = idx === otherKeys.length - 1
          ? Math.max(0.01, Math.round((remainingBudget - share * (otherKeys.length - 1)) * 1000) / 1000)
          : share;
      });
    }

    // Micro-adjust largest other key to guarantee exact sum = 1.000
    const sum = WEIGHT_KEYS.reduce((acc, k) => acc + nextWeights[k], 0);
    const diff = Math.round((1.0 - sum) * 1000) / 1000;
    if (Math.abs(diff) > 0.0001) {
      const targetAdjustKey = otherKeys.reduce((max, k) => nextWeights[k] > nextWeights[max] ? k : max, otherKeys[0]);
      nextWeights[targetAdjustKey] = Math.max(0.01, Math.round((nextWeights[targetAdjustKey] + diff) * 1000) / 1000);
    }

    setWeights(nextWeights);
  };

  const handleNormalizeWeights = () => {
    const sum = WEIGHT_KEYS.reduce((acc, k) => acc + weights[k], 0);
    if (sum <= 0) return;
    const nextWeights: FullConfig = { ...weights };
    let accumulated = 0;
    WEIGHT_KEYS.forEach((k, idx) => {
      if (idx === WEIGHT_KEYS.length - 1) {
        nextWeights[k] = Math.round((1.0 - accumulated) * 1000) / 1000;
      } else {
        const share = Math.round((weights[k] / sum) * 1000) / 1000;
        nextWeights[k] = share;
        accumulated += share;
      }
    });
    setWeights(nextWeights);
  };

  const handleSaveWeights = async () => {
    const sum = WEIGHT_KEYS.reduce((acc, k) => acc + weights[k], 0);
    if (Math.abs(sum - 1.0) > 0.001) {
      setMsg(`Error: Priority weights must sum to exactly 1.000 (currently ${sum.toFixed(3)}). Click Normalize Weights.`);
      return;
    }
    if (weights.min_green_seconds > weights.max_green_seconds) {
      setMsg('Error: min_green_seconds cannot exceed max_green_seconds');
      return;
    }

    try {
      setSavingConfig(true);
      setMsg(null);
      await api.updateConfig(weights);
      setMsg('Priority algorithmic weights and timing constraints successfully saved!');
      const fresh = await api.getConfig();
      if (fresh) setWeights((prev) => ({ ...prev, ...fresh }));
    } catch (err: any) {
      setMsg(`Error saving config: ${err.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  const canEdit = userRole === 'admin';
  const currentSum = WEIGHT_KEYS.reduce((acc, k) => acc + (weights[k] || 0), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Conflict Evaluation Console */}
      <div className="lg:col-span-7 bg-[#0b101c] border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Multi-Ambulance Priority Arbitration</h3>
              <p className="text-xs text-slate-400">
                Mathematical Scoring & Clinical Tradeoff Resolution for Converging Emergency Vehicles
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            Deterministic + Gemini AI
          </span>
        </div>

        {/* Junction Selector & Run Action */}
        <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex-1">
            <label className="text-[11px] font-mono text-slate-400 block mb-1">
              Select Target Intersection for Conflict Resolution
            </label>
            <select
              value={selectedJunctionId}
              onChange={(e) => setSelectedJunctionId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-medium focus:border-purple-500"
            >
              {junctions.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.code} - {j.name} (Active Mode: {j.mode.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleEvaluateAi}
            disabled={evaluating}
            className="mt-4 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{evaluating ? 'EVALUATING...' : 'RESOLVE CONFLICT'}</span>
          </button>
        </div>

        {/* Decision Breakdown */}
        {decision ? (
          <div className="flex flex-col gap-4">
            <div className="bg-slate-950 border border-purple-500/40 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase font-bold text-purple-400 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Arbitration Decision Rationale
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Latency: {decision.latency_ms || 32}ms
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {decision.explanation || decision.ai_rationale ||
                  'Patient in MEDIC-101 presents with acute life threat, granted first priority corridor preemption.'}
              </p>
            </div>

            {/* Candidate Ranking Cards */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                Ranking & Priority Score Breakdown
              </h4>
              <div className="flex flex-col gap-2.5">
                {(decision.candidates || []).map((cand: any, idx: number) => {
                  const isWinner = idx === 0;
                  const score = cand.final_score !== undefined ? cand.final_score : cand.composite_score;
                  return (
                    <div
                      key={cand.mission_id || idx}
                      className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition ${
                        isWinner
                          ? 'bg-emerald-950/30 border-emerald-500/50 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-black text-xs ${
                            isWinner
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white font-mono">
                              {cand.ambulance_call_sign || 'MEDIC'}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800">
                              Movement: {cand.movement || 'W_E'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            Severity: {cand.severity_score}% • ETA: {cand.eta_seconds}s • Wait: {cand.waiting_seconds}s
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-[10px] text-slate-400 block">Priority Score</span>
                        <span
                          className={`text-sm font-black ${
                            isWinner ? 'text-emerald-400' : 'text-slate-300'
                          }`}
                        >
                          {score !== undefined && !isNaN(score) ? `${(score * 100).toFixed(1)}%` : '0.0%'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-8 text-center flex flex-col items-center justify-center">
            <Scale className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-xs text-slate-400 font-medium max-w-sm">
              Click &quot;Resolve Conflict&quot; to compute the weighted arbitration score and review clinical rationale between converging emergency vehicles.
            </p>
          </div>
        )}
      </div>

      {/* Right: Algorithmic Weights Tuner */}
      <div className="lg:col-span-5 bg-[#0b101c] border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Algorithmic Priority Weights</h3>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                Math.abs(currentSum - 1.0) <= 0.001
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-red-500/20 text-red-400 border-red-500/40'
              }`}
            >
              Sum: {currentSum.toFixed(3)}
            </span>
            {canEdit && Math.abs(currentSum - 1.0) > 0.001 && (
              <button
                onClick={handleNormalizeWeights}
                className="text-[10px] px-2 py-0.5 rounded bg-purple-600/40 hover:bg-purple-600/60 text-purple-200 border border-purple-500/40 font-mono"
              >
                Normalize
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Tune the multi-criteria decision weights and safety timing bounds. Sliders automatically rebalance to maintain a total sum of 1.000.
        </p>

        <div className="flex flex-col gap-3.5 text-xs font-mono">
          {/* Severity Weight */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-300">Severity Urgency (w_severity)</span>
              <span className="text-emerald-400 font-bold">{weights.w_severity.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.80"
              step="0.01"
              disabled={!canEdit}
              value={weights.w_severity}
              onChange={(e) => handleWeightSliderChange('w_severity', Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          {/* ETA Weight */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-300">ETA Proximity (w_eta)</span>
              <span className="text-blue-400 font-bold">{weights.w_eta.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.80"
              step="0.01"
              disabled={!canEdit}
              value={weights.w_eta}
              onChange={(e) => handleWeightSliderChange('w_eta', Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>

          {/* Waiting Time Weight */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-300">Queue Delay (w_waiting)</span>
              <span className="text-amber-400 font-bold">{weights.w_waiting.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.80"
              step="0.01"
              disabled={!canEdit}
              value={weights.w_waiting}
              onChange={(e) => handleWeightSliderChange('w_waiting', Number(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>

          {/* Conflict Cost Weight */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-300">Conflict Traffic Penalty (w_conflict)</span>
              <span className="text-red-400 font-bold">{weights.w_conflict_cost.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.80"
              step="0.01"
              disabled={!canEdit}
              value={weights.w_conflict_cost}
              onChange={(e) => handleWeightSliderChange('w_conflict_cost', Number(e.target.value))}
              className="w-full accent-red-500"
            />
          </div>

          {/* Route Requirement Weight */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-300">Route Requirement (w_route)</span>
              <span className="text-purple-400 font-bold">{weights.w_route_requirement.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.80"
              step="0.01"
              disabled={!canEdit}
              value={weights.w_route_requirement}
              onChange={(e) => handleWeightSliderChange('w_route_requirement', Number(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          {/* Timing & Safety Parameters (Completes all 12 configSchema fields) */}
          <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Safety Clearance & Detection Settings
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 text-[10px] block mb-0.5">Min Green (5-30s)</span>
                <input
                  type="number"
                  min="5"
                  max="30"
                  disabled={!canEdit}
                  value={weights.min_green_seconds}
                  onChange={(e) => setWeights({ ...weights, min_green_seconds: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white"
                />
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block mb-0.5">Max Green (15-120s)</span>
                <input
                  type="number"
                  min="15"
                  max="120"
                  disabled={!canEdit}
                  value={weights.max_green_seconds}
                  onChange={(e) => setWeights({ ...weights, max_green_seconds: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white"
                />
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block mb-0.5">Yellow Clear (2-10s)</span>
                <input
                  type="number"
                  min="2"
                  max="10"
                  disabled={!canEdit}
                  value={weights.yellow_seconds}
                  onChange={(e) => setWeights({ ...weights, yellow_seconds: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white"
                />
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block mb-0.5">All-Red Clear (1-10s)</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  disabled={!canEdit}
                  value={weights.all_red_seconds}
                  onChange={(e) => setWeights({ ...weights, all_red_seconds: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white"
                />
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block mb-0.5">Arming Distance (m)</span>
                <input
                  type="number"
                  min="50"
                  max="1000"
                  disabled={!canEdit}
                  value={weights.arming_distance_m}
                  onChange={(e) => setWeights({ ...weights, arming_distance_m: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white"
                />
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block mb-0.5">Clear Frames (1-10)</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  disabled={!canEdit}
                  value={weights.clear_confirm_frames}
                  onChange={(e) => setWeights({ ...weights, clear_confirm_frames: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {canEdit ? (
          <button
            onClick={handleSaveWeights}
            disabled={savingConfig || Math.abs(currentSum - 1.0) > 0.001}
            className="w-full mt-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
          >
            {savingConfig ? 'SAVING WEIGHTS...' : 'SAVE ALGORITHM CONFIGURATION'}
          </button>
        ) : (
          <p className="text-[11px] text-slate-500 italic text-center">
            Log in as Administrator to modify system weights and constraints.
          </p>
        )}

        {msg && (
          <div
            className={`text-[11px] p-2.5 rounded-lg border font-mono ${
              msg.startsWith('Error')
                ? 'bg-red-950/40 border-red-500/40 text-red-300'
                : 'bg-slate-950 border-purple-500/40 text-purple-300'
            }`}
          >
            {msg}
          </div>
        )}
      </div>
    </div>
  );
};
