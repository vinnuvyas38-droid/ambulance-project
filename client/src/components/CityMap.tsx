import React, { useState } from 'react';
import {
  Navigation,
  Shield,
  Activity,
  Layers,
  Info,
  Maximize2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Radio,
  Sliders
} from 'lucide-react';

interface CityMapProps {
  junctions: any[];
  ambulances: any[];
  missions: any[];
  hospitals: any[];
  selectedJunctionId: string | null;
  onSelectJunction: (id: string) => void;
  onManualOverride: (junctionId: string, movement: string) => void;
  onRestoreSignal: (junctionId: string) => void;
}

// Convert geographic coordinates to SVG viewport (1000 x 620)
function projectCoords(lat: number, lng: number) {
  const minLng = 77.585;
  const maxLng = 77.622;
  const minLat = 12.956;
  const maxLat = 12.982;

  const x = ((lng - minLng) / (maxLng - minLng)) * 860 + 70;
  const y = ((maxLat - lat) / (maxLat - minLat)) * 500 + 60;
  return { x: Math.max(30, Math.min(970, x)), y: Math.max(30, Math.min(590, y)) };
}

export const CityMap: React.FC<CityMapProps> = ({
  junctions,
  ambulances,
  missions,
  hospitals,
  selectedJunctionId,
  onSelectJunction,
  onManualOverride,
  onRestoreSignal,
}) => {
  const [hoveredItem, setHoveredItem] = useState<any>(null);

  // Road connections between grid junctions
  const roadConnections = [
    { from: 'J1', to: 'J2' },
    { from: 'J2', to: 'J3' },
    { from: 'J4', to: 'J5' },
    { from: 'J5', to: 'J6' },
    { from: 'J1', to: 'J4' },
    { from: 'J2', to: 'J5' },
    { from: 'J3', to: 'J6' },
  ];

  const junctionMap = new Map<string, any>();
  junctions.forEach((j) => junctionMap.set(j.code, j));

  // Determine active corridor segments
  const activeMission = missions.find(
    (m) => ['dispatched', 'en_route', 'approaching_junction', 'crossing'].includes(m.status)
  );

  return (
    <div className="relative w-full h-[620px] rounded-2xl overflow-hidden bg-[#060911] border border-slate-800 shadow-2xl">
      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#334155 1px, transparent 1px), radial-gradient(#1e293b 1px, #060911 1px)`,
          backgroundSize: '40px 40px',
          backgroundPosition: '0 0, 20px 20px',
        }}
      />

      {/* City District Labels */}
      <div className="absolute top-4 left-6 pointer-events-none">
        <span className="text-[10px] tracking-widest font-mono uppercase text-slate-500 font-bold block">
          CENTRAL METROPOLITAN CORRIDOR NETWORK
        </span>
        <span className="text-xs text-slate-400 font-semibold">
          High-Speed Emergency Route Grid (Sector 7 - 12)
        </span>
      </div>

      <div className="absolute bottom-4 left-6 pointer-events-none flex items-center gap-4 text-[11px] font-mono text-slate-400 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
          <span>Green Corridor</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500"></span>
          <span>Red Phase</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
          <span>Armed (300m)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
          <span>Active Preemption</span>
        </div>
      </div>

      {/* SVG City Canvas */}
      <svg className="w-full h-full">
        <defs>
          {/* Neon Glow Filters */}
          <filter id="glow-emerald" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-red" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="roadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>

        {/* 1. Base Road Arteries */}
        {roadConnections.map((rc, idx) => {
          const jA = junctionMap.get(rc.from);
          const jB = junctionMap.get(rc.to);
          if (!jA || !jB) return null;

          const pA = projectCoords(jA.lat, jA.lng);
          const pB = projectCoords(jB.lat, jB.lng);

          return (
            <g key={`road-${idx}`}>
              {/* Outer road pavement */}
              <line
                x1={pA.x}
                y1={pA.y}
                x2={pB.x}
                y2={pB.y}
                stroke="#151e32"
                strokeWidth="28"
                strokeLinecap="round"
              />
              {/* Asphalt center */}
              <line
                x1={pA.x}
                y1={pA.y}
                x2={pB.x}
                y2={pB.y}
                stroke="#0d1424"
                strokeWidth="22"
                strokeLinecap="round"
              />
              {/* Road markings */}
              <line
                x1={pA.x}
                y1={pA.y}
                x2={pB.x}
                y2={pB.y}
                stroke="#334155"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
            </g>
          );
        })}

        {/* 2. Hospital connecting roads */}
        {hospitals.map((h) => {
          const hp = projectCoords(h.lat, h.lng);
          // Connect to nearest junction
          let nearestJ = junctions[0];
          let minDist = 999999;
          junctions.forEach((j) => {
            const jp = projectCoords(j.lat, j.lng);
            const dist = Math.hypot(hp.x - jp.x, hp.y - jp.y);
            if (dist < minDist) {
              minDist = dist;
              nearestJ = j;
            }
          });

          if (nearestJ) {
            const jp = projectCoords(nearestJ.lat, nearestJ.lng);
            return (
              <g key={`hosp-road-${h.id}`}>
                <line
                  x1={jp.x}
                  y1={jp.y}
                  x2={hp.x}
                  y2={hp.y}
                  stroke="#151e32"
                  strokeWidth="18"
                  strokeLinecap="round"
                />
                <line
                  x1={jp.x}
                  y1={jp.y}
                  x2={hp.x}
                  y2={hp.y}
                  stroke="#0d1424"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
              </g>
            );
          }
          return null;
        })}

        {/* 3. Active Emergency Corridor Illumination */}
        {missions
          .filter((m) => ['dispatched', 'en_route', 'approaching_junction', 'crossing'].includes(m.status))
          .map((m) => {
            const amb = ambulances.find((a) => a.id === m.ambulance_id);
            const hosp = hospitals.find((h) => h.id === m.hospital_id);
            if (!amb || !hosp) return null;

            const ap = projectCoords(amb.lat, amb.lng);
            const hp = projectCoords(hosp.lat, hosp.lng);

            return (
              <g key={`corridor-${m.id}`}>
                {/* Glowing corridor beam */}
                <line
                  x1={ap.x}
                  y1={ap.y}
                  x2={hp.x}
                  y2={hp.y}
                  stroke="#10b981"
                  strokeWidth="6"
                  opacity="0.25"
                  filter="url(#glow-emerald)"
                />
                <line
                  x1={ap.x}
                  y1={ap.y}
                  x2={hp.x}
                  y2={hp.y}
                  stroke="#34d399"
                  strokeWidth="3"
                  className="corridor-active-path"
                />
              </g>
            );
          })}

        {/* 4. Junction Nodes */}
        {junctions.map((j) => {
          const pt = projectCoords(j.lat, j.lng);
          const isSelected = selectedJunctionId === j.id;
          const isEmergency = j.mode === 'emergency';
          const isArmed = j.mode === 'armed';
          const isFailSafe = j.mode === 'fail_safe';
          const signals = j.current_signals || { N: 'red', E: 'green', S: 'red', W: 'green' };

          return (
            <g
              key={j.id}
              className="cursor-pointer transition-transform hover:scale-105"
              onClick={() => onSelectJunction(j.id)}
            >
              {/* Emergency Radar Halo */}
              {isEmergency && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="36"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  className="animate-ping opacity-60"
                />
              )}
              {isArmed && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="30"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  className="animate-pulse opacity-75"
                />
              )}
              {isFailSafe && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="34"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                  className="animate-ping opacity-75"
                />
              )}

              {/* Junction Body Plate */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="22"
                fill={
                  isSelected
                    ? '#1e293b'
                    : isEmergency
                    ? '#064e3b'
                    : isFailSafe
                    ? '#7f1d1d'
                    : '#0f172a'
                }
                stroke={
                  isSelected
                    ? '#38bdf8'
                    : isEmergency
                    ? '#10b981'
                    : isFailSafe
                    ? '#ef4444'
                    : isArmed
                    ? '#f59e0b'
                    : '#334155'
                }
                strokeWidth={isSelected ? '3' : '2'}
                filter={isEmergency ? 'url(#glow-emerald)' : isFailSafe ? 'url(#glow-red)' : undefined}
              />

              {/* Junction Code */}
              <text
                x={pt.x}
                y={pt.y - 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#f8fafc"
                fontSize="11"
                fontWeight="800"
                fontFamily="JetBrains Mono"
              >
                {j.code}
              </text>

              {/* Signal Pods: North, East, South, West */}
              {/* North */}
              <circle
                cx={pt.x}
                cy={pt.y - 28}
                r="4.5"
                fill={signals.N === 'green' ? '#10b981' : signals.N === 'yellow' ? '#f59e0b' : '#ef4444'}
                filter={signals.N === 'green' ? 'url(#glow-emerald)' : undefined}
                stroke="#090d16"
                strokeWidth="1.5"
              />
              {/* South */}
              <circle
                cx={pt.x}
                cy={pt.y + 28}
                r="4.5"
                fill={signals.S === 'green' ? '#10b981' : signals.S === 'yellow' ? '#f59e0b' : '#ef4444'}
                filter={signals.S === 'green' ? 'url(#glow-emerald)' : undefined}
                stroke="#090d16"
                strokeWidth="1.5"
              />
              {/* West */}
              <circle
                cx={pt.x - 28}
                cy={pt.y}
                r="4.5"
                fill={signals.W === 'green' ? '#10b981' : signals.W === 'yellow' ? '#f59e0b' : '#ef4444'}
                filter={signals.W === 'green' ? 'url(#glow-emerald)' : undefined}
                stroke="#090d16"
                strokeWidth="1.5"
              />
              {/* East */}
              <circle
                cx={pt.x + 28}
                cy={pt.y}
                r="4.5"
                fill={signals.E === 'green' ? '#10b981' : signals.E === 'yellow' ? '#f59e0b' : '#ef4444'}
                filter={signals.E === 'green' ? 'url(#glow-emerald)' : undefined}
                stroke="#090d16"
                strokeWidth="1.5"
              />

              {/* Junction Label & Status Tag */}
              <text
                x={pt.x}
                y={pt.y + 38}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="9"
                fontWeight="600"
              >
                {j.name.split(' ')[0]}
              </text>
              <text
                x={pt.x}
                y={pt.y + 49}
                textAnchor="middle"
                fill={
                  isEmergency
                    ? '#34d399'
                    : isFailSafe
                    ? '#f87171'
                    : isArmed
                    ? '#fbbf24'
                    : '#64748b'
                }
                fontSize="8"
                fontWeight="700"
                fontFamily="JetBrains Mono"
              >
                {j.mode.toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* 5. Hospital Destinations */}
        {hospitals.map((h) => {
          const pt = projectCoords(h.lat, h.lng);
          return (
            <g key={h.id} className="transition-transform hover:scale-110">
              <rect
                x={pt.x - 16}
                y={pt.y - 16}
                width="32"
                height="32"
                rx="8"
                fill="#0f172a"
                stroke="#ef4444"
                strokeWidth="2"
                filter="url(#glow-red)"
              />
              {/* Red Cross */}
              <rect x={pt.x - 2.5} y={pt.y - 10} width="5" height="20" rx="1" fill="#ef4444" />
              <rect x={pt.x - 10} y={pt.y - 2.5} width="20" height="5" rx="1" fill="#ef4444" />

              <text
                x={pt.x}
                y={pt.y + 24}
                textAnchor="middle"
                fill="#fca5a5"
                fontSize="9"
                fontWeight="bold"
              >
                {h.name.split(' ')[0]}
              </text>
              <text
                x={pt.x}
                y={pt.y + 34}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="8"
              >
                TRAUMA / ER
              </text>
            </g>
          );
        })}

        {/* 6. Dynamic Ambulances */}
        {ambulances.map((amb) => {
          const pt = projectCoords(amb.lat, amb.lng);
          const activeM = missions.find(
            (m) => m.ambulance_id === amb.id && ['dispatched', 'en_route', 'approaching_junction', 'crossing'].includes(m.status)
          );

          return (
            <g key={amb.id} className="transition-all duration-300">
              {/* Radar pulse around active ambulance */}
              {activeM && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="24"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                  className="animate-ping opacity-60"
                />
              )}

              {/* Ambulance vehicle chassis */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="14"
                fill="#ffffff"
                stroke={activeM ? '#ef4444' : '#64748b'}
                strokeWidth="2.5"
                filter={activeM ? 'url(#glow-red)' : undefined}
              />

              {/* Siren Red/Blue strobe indicator */}
              {activeM ? (
                <>
                  <circle cx={pt.x - 4} cy={pt.y} r="3" fill="#ef4444" className="animate-pulse" />
                  <circle cx={pt.x + 4} cy={pt.y} r="3" fill="#3b82f6" className="animate-pulse" />
                </>
              ) : (
                <circle cx={pt.x} cy={pt.y} r="4" fill="#64748b" />
              )}

              {/* Ambulance Tag Badge */}
              <g transform={`translate(${pt.x - 38}, ${pt.y - 32})`}>
                <rect
                  width="76"
                  height="16"
                  rx="4"
                  fill="#090d16"
                  stroke={activeM ? '#ef4444' : '#334155'}
                  strokeWidth="1"
                />
                <text
                  x="38"
                  y="11"
                  textAnchor="middle"
                  fill={activeM ? '#ffffff' : '#94a3b8'}
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono"
                >
                  {amb.call_sign} {activeM?.severity_score ? `[${activeM.severity_score}%]` : ''}
                </text>
              </g>

              {/* Speed & ETA Badge */}
              {activeM && (
                <g transform={`translate(${pt.x - 30}, ${pt.y + 18})`}>
                  <rect width="60" height="13" rx="3" fill="#090d16" fillOpacity="0.9" stroke="#10b981" strokeWidth="0.8" />
                  <text
                    x="30"
                    y="9.5"
                    textAnchor="middle"
                    fill="#34d399"
                    fontSize="7.5"
                    fontFamily="JetBrains Mono"
                    fontWeight="600"
                  >
                    {Math.round(amb.speed_kmh)} km/h • {activeM.eta_seconds}s
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
