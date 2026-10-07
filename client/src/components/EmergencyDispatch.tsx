import React, { useState } from 'react';
import {
  Activity,
  Heart,
  AlertCircle,
  Clock,
  ShieldCheck,
  Send,
  Navigation,
  Building2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Play
} from 'lucide-react';
import { api } from '../lib/api';

interface EmergencyDispatchProps {
  ambulances: any[];
  hospitals: any[];
  missions: any[];
  onMissionCreated: () => void;
  userRole: string;
}

export const EmergencyDispatch: React.FC<EmergencyDispatchProps> = ({
  ambulances,
  hospitals,
  missions,
  onMissionCreated,
  userRole,
}) => {
  const [selectedAmbulance, setSelectedAmbulance] = useState(ambulances[0]?.id || '');
  const [selectedHospital, setSelectedHospital] = useState(hospitals[0]?.id || '');
  const [category, setCategory] = useState('cardiac');
  const [ageBand, setAgeBand] = useState('adult');
  const [consciousness, setConsciousness] = useState('confused');
  const [breathing, setBreathing] = useState('labored');
  const [severeBleeding, setSevereBleeding] = useState(false);
  const [chestPain, setChestPain] = useState(true);
  const [strokeSigns, setStrokeSigns] = useState(false);
  const [heartRate, setHeartRate] = useState(120);
  const [systolicBp, setSystolicBp] = useState(95);
  const [spo2, setSpo2] = useState(91);
  const [notes, setNotes] = useState('Severe cardiac symptoms, acute distress');

  const [loading, setLoading] = useState(false);
  const [lastAssessment, setLastAssessment] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canDispatch = ['admin', 'operator', 'driver'].includes(userRole);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canDispatch) return;

    try {
      setLoading(true);
      setErrorMsg(null);

      const patientInfo = {
        emergency_category: category,
        age_band: ageBand,
        consciousness,
        breathing,
        severe_bleeding: severeBleeding,
        chest_pain: chestPain,
        stroke_signs: strokeSigns,
        trauma_mechanism: '',
        heart_rate: heartRate,
        systolic_bp: systolicBp,
        spo2,
        notes,
      };

      const amb = ambulances.find((a) => a.id === selectedAmbulance) || ambulances[0];

      const res = await api.createMission({
        ambulance_id: amb.id,
        hospital_id: selectedHospital || hospitals[0]?.id,
        origin_lat: amb.lat || 12.9716,
        origin_lng: amb.lng || 77.5880,
        patient_info: patientInfo,
      });

      setLastAssessment(res);
      onMissionCreated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch corridor');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelMission = async (id: string) => {
    try {
      await api.cancelMission(id);
      onMissionCreated();
    } catch (err: any) {
      alert(`Error cancelling mission: ${err.message}`);
    }
  };

  const handleStartMission = async (id: string) => {
    try {
      await api.startMission(id);
      onMissionCreated();
    } catch (err: any) {
      alert(`Error starting mission: ${err.message}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Form: Patient Triage & Vitals */}
      <div className="lg:col-span-7 bg-[#0b101c] border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center font-bold">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Emergency Dispatch & Patient Triage</h3>
              <p className="text-xs text-slate-400">
                Prototype Emergency Priority Score & Automated Green Corridor Preemption
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Gemini Enabled
          </span>
        </div>

        {/* Prototype Safety Notice */}
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-3.5 py-2.5 mb-5 text-[11px] text-amber-300/90 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-amber-300 font-semibold">Prototype Coordination Notice:</strong> Telemetry and vitals generate an Emergency Severity Score strictly for traffic signal preemption arbitration. This prototype system is not a certified medical diagnostic device.
          </div>
        </div>

        <form onSubmit={handleDispatch} className="flex flex-col gap-4">
          {/* Target Ambulance & Hospital */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1.5 font-medium">
                Emergency Ambulance
              </label>
              <select
                value={selectedAmbulance}
                onChange={(e) => setSelectedAmbulance(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500"
              >
                {ambulances.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.call_sign} ({a.is_authorized ? 'Authorized' : 'Unverified'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1.5 font-medium">
                Destination Hospital
              </label>
              <select
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Emergency Category & Age */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1.5 font-medium">
                Emergency Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500"
              >
                <option value="cardiac">Cardiac / STEMI / Arrest</option>
                <option value="stroke">Acute Stroke / Neurological</option>
                <option value="trauma_accident">Severe Trauma / Accident</option>
                <option value="respiratory">Respiratory Distress</option>
                <option value="burns">Critical Burns</option>
                <option value="obstetric">Obstetric Emergency</option>
                <option value="pediatric">Pediatric Acute</option>
                <option value="poisoning">Poisoning / Toxicity</option>
                <option value="other">Other Acute Illness</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1.5 font-medium">
                Patient Age Band
              </label>
              <select
                value={ageBand}
                onChange={(e) => setAgeBand(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500"
              >
                <option value="infant">Infant (&lt;1 yr)</option>
                <option value="child">Child (1-12 yrs)</option>
                <option value="adult">Adult (13-64 yrs)</option>
                <option value="senior">Senior (65+ yrs)</option>
              </select>
            </div>
          </div>

          {/* Consciousness & Breathing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1.5 font-medium">
                Consciousness Level
              </label>
              <select
                value={consciousness}
                onChange={(e) => setConsciousness(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500"
              >
                <option value="alert">Alert</option>
                <option value="confused">Confused</option>
                <option value="responds_to_pain">Responds to Pain</option>
                <option value="unresponsive">Unresponsive</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1.5 font-medium">
                Breathing State
              </label>
              <select
                value={breathing}
                onChange={(e) => setBreathing(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500"
              >
                <option value="normal">Normal</option>
                <option value="labored">Labored / Tachypnea</option>
                <option value="shallow">Shallow / Weak</option>
                <option value="absent">Absent / Apnea</option>
              </select>
            </div>
          </div>

          {/* Vitals Sliders: Heart Rate, BP, SpO2 */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-3 font-bold">
              Real-Time Vital Signs Telemetry
            </span>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Heart Rate</span>
                  <span className="font-mono font-bold text-red-400">{heartRate} bpm</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="190"
                  value={heartRate}
                  onChange={(e) => setHeartRate(Number(e.target.value))}
                  className="w-full accent-red-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Systolic BP</span>
                  <span className="font-mono font-bold text-blue-400">{systolicBp} mmHg</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="220"
                  value={systolicBp}
                  onChange={(e) => setSystolicBp(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">SpO2 Oxygen</span>
                  <span className="font-mono font-bold text-emerald-400">{spo2}%</span>
                </div>
                <input
                  type="range"
                  min="70"
                  max="100"
                  value={spo2}
                  onChange={(e) => setSpo2(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap items-center gap-6 mt-4 pt-3 border-t border-slate-800 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={chestPain}
                  onChange={(e) => setChestPain(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-slate-300">Chest Pain</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={severeBleeding}
                  onChange={(e) => setSevereBleeding(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-slate-300">Severe Bleeding</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={strokeSigns}
                  onChange={(e) => setStrokeSigns(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-slate-300">Stroke Signs (FAST)</span>
              </label>
            </div>
          </div>

          {/* Clinical Notes */}
          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1.5 font-medium">
              Paramedic Field Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. STEMI pattern in V1-V4, IV line established"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-mono">
              {errorMsg}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !canDispatch}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>
              {loading ? 'ANALYZING & DISPATCHING...' : 'DISPATCH AI GREEN CORRIDOR'}
            </span>
          </button>
        </form>
      </div>

      {/* Right Column: AI Severity Assessment & Active Missions */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        {/* Latest AI Triage Card */}
        {lastAssessment ? (
          <div className="bg-[#0b101c] border border-emerald-500/40 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Emergency Priority Score Assessment
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                {lastAssessment.assessment?.model || 'Gemini 2.5'}
              </span>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex flex-col items-center justify-center text-emerald-400">
                <span className="text-2xl font-black font-mono">
                  {lastAssessment.assessment?.severity_score || lastAssessment.mission?.severity_score}
                </span>
                <span className="text-[9px] uppercase font-bold tracking-wider">Priority Score</span>
              </div>
              <div>
                <span
                  className={`text-xs uppercase font-mono font-bold px-2 py-0.5 rounded inline-block mb-1 ${
                    lastAssessment.assessment?.severity_level === 'critical'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {lastAssessment.assessment?.severity_level || lastAssessment.mission?.severity_level} PRIORITY
                </span>
                <p className="text-xs text-slate-300">
                  {lastAssessment.assessment?.explanation || 'High risk acute hemodynamic compromise.'}
                </p>
              </div>
            </div>

            {/* Estimated time saved */}
            <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-center">
              <div>
                <span className="text-[10px] text-slate-400 block">Baseline Travel Time</span>
                <span className="text-sm font-bold text-slate-300">
                  {lastAssessment.mission?.baseline_eta_seconds}s (Fixed)
                </span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-400 block">Corridor Green Time</span>
                <span className="text-sm font-bold text-emerald-400">
                  {lastAssessment.mission?.eta_seconds}s (Dynamic)
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#0b101c] border border-slate-800 rounded-2xl p-5 shadow-2xl text-center flex flex-col items-center justify-center py-8">
            <Heart className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-xs text-slate-400 font-medium">
              Enter patient vitals to calculate Emergency Severity Score and dynamic corridor routing.
            </p>
          </div>
        )}

        {/* Active Emergency Missions List */}
        <div className="bg-[#0b101c] border border-slate-800 rounded-2xl p-5 shadow-2xl flex-1">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Active Corridor Missions ({missions.length})</span>
          </h4>

          <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
            {missions.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No active missions running.</p>
            ) : (
              missions.map((m) => (
                <div
                  key={m.id}
                  className="bg-slate-950 border border-slate-800/90 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white font-mono">
                        {m.ambulance?.call_sign || 'MEDIC'}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                          m.severity_level === 'critical'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {m.severity_level} [{m.severity_score}%]
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Destination: {m.hospital?.name || 'Hospital'} • ETA {m.eta_seconds}s
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {m.status === 'dispatched' && (
                      <button
                        onClick={() => handleStartMission(m.id)}
                        className="p-1.5 rounded-lg bg-emerald-600/30 text-emerald-400 hover:bg-emerald-600/50"
                        title="Start En Route"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {['dispatched', 'en_route', 'approaching_junction'].includes(m.status) && (
                      <button
                        onClick={() => handleCancelMission(m.id)}
                        className="p-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/40"
                        title="Cancel Corridor"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
