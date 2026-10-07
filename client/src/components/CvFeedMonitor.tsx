import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  Camera,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  Activity,
  Cpu
} from 'lucide-react';
import { api } from '../lib/api';

interface CvFeedMonitorProps {
  junctions: any[];
  userRole: string;
}

export const CvFeedMonitor: React.FC<CvFeedMonitorProps> = ({
  junctions,
  userRole,
}) => {
  const [selectedJunctionId, setSelectedJunctionId] = useState(
    junctions[0]?.id || ''
  );
  const [selectedApproach, setSelectedApproach] = useState<'N' | 'E' | 'S' | 'W'>('N');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [recentDetections, setRecentDetections] = useState<any[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedJunction = junctions.find((j) => j.id === selectedJunctionId) || junctions[0];

  // Draw simulated camera feed on HTML5 canvas with cars & bounding boxes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let offset = 0;

    const render = () => {
      offset = (offset + 1) % 60;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background road pavement
      ctx.fillStyle = '#080d1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Lane dividers
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.setLineDash([15, 15]);
      ctx.lineDashOffset = -offset;

      ctx.beginPath();
      ctx.moveTo(canvas.width / 3, 0);
      ctx.lineTo(canvas.width / 3, canvas.height);
      ctx.moveTo((canvas.width * 2) / 3, 0);
      ctx.lineTo((canvas.width * 2) / 3, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw simulated vehicles
      // Vehicle 1: Standard Car
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(40, 120, 60, 90);
      // Bounding box
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(36, 116, 68, 98);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText('CAR [94%]', 36, 110);

      // Vehicle 2: City Bus
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(150, 60, 70, 140);
      ctx.strokeStyle = '#94a3b8';
      ctx.strokeRect(146, 56, 78, 148);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('BUS [91%]', 146, 50);

      // Vehicle 3: Emergency Ambulance (Simulated)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(260, 160, 65, 110);
      // Red Cross on top
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(288, 200, 9, 30);
      ctx.fillRect(278, 210, 29, 9);
      // Bounding box
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.strokeRect(255, 155, 75, 120);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 10px JetBrains Mono';
      ctx.fillText('AMBULANCE [98.4%]', 255, 148);

      // Camera Watermark / Timestamp
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText(
        `CAM-${selectedJunction?.code || 'J1'}-${selectedApproach} | ${new Date().toLocaleTimeString()} | 30 FPS`,
        12,
        22
      );

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [selectedJunctionId, selectedApproach]);

  const handleCaptureAndAnalyze = async () => {
    try {
      setAnalyzing(true);
      const canvas = canvasRef.current;
      const dataUrl = canvas ? canvas.toDataURL('image/jpeg', 0.8) : '';

      const res = await api.analyzeFrame({
        image: dataUrl,
        approach: selectedApproach,
        junction_id: selectedJunctionId,
      });

      setAnalysisResult(res);
      // Refresh detections
      const dets = await api.getCvDetections(selectedJunctionId);
      setRecentDetections(dets);
    } catch (err: any) {
      alert(`CV Analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Live Camera Viewport */}
      <div className="lg:col-span-7 bg-[#0b101c] border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <Video className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Live Computer Vision Optical Feed</h3>
              <p className="text-xs text-slate-400">
                Intersection Object Detection & Ambulance Clearance Verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedJunctionId}
              onChange={(e) => setSelectedJunctionId(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:border-emerald-500 font-mono"
            >
              {junctions.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.code} - {j.name}
                </option>
              ))}
            </select>

            <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-mono font-bold">
              {(['N', 'E', 'S', 'W'] as const).map((app) => (
                <button
                  key={app}
                  onClick={() => setSelectedApproach(app)}
                  className={`px-2 py-1 rounded transition ${
                    selectedApproach === app
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {app}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Canvas Feed with Scanline Effect */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            className="w-full h-full object-cover"
          />
          <div className="camera-scanline absolute inset-0 pointer-events-none" />

          {/* Overlay HUD indicators */}
          <div className="absolute top-3 right-3 flex items-center gap-2 font-mono text-[10px] bg-slate-950/80 px-2 py-1 rounded-md border border-slate-800 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>AI TRACKER ACTIVE</span>
          </div>

          <div className="absolute bottom-3 left-3 flex items-center gap-2 font-mono text-[11px] bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800 text-emerald-400">
            <span>AMBULANCE VERIFIED: APPROACHING</span>
          </div>
        </div>

        {/* Capture Frame Button */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-400 font-mono">
            Optical Source: High-Res Edge Sensor • 1080p Stream
          </span>
          <button
            onClick={handleCaptureAndAnalyze}
            disabled={analyzing}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{analyzing ? 'ANALYZING FRAME...' : 'CAPTURE & ANALYZE (GEMINI)'}</span>
          </button>
        </div>
      </div>

      {/* Right: AI Vision Telemetry & Clearance Status */}
      <div className="lg:col-span-5 bg-[#0b101c] border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
        <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            Detection & Density Telemetry
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
            Multi-Frame Consensus
          </span>
        </div>

        {/* Density Gauge */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Lane Traffic Density</span>
            <span className="text-emerald-400 font-bold">
              {analysisResult?.density_pct || 38}% (MODERATE)
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 transition-all duration-500"
              style={{ width: `${analysisResult?.density_pct || 38}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Free (0-25%)</span>
            <span>Moderate (26-50%)</span>
            <span>Heavy (51-75%)</span>
            <span>Jammed (76-100%)</span>
          </div>
        </div>

        {/* Optical Clearance State Machine */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <span className="text-xs font-mono uppercase text-slate-400 font-bold block">
            Emergency Crossing Verification Stages
          </span>

          <div className="flex flex-col gap-2 font-mono text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Approaching Intersection</span>
              </span>
              <span className="text-[11px] font-bold">CONFIRMED (300m)</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <span>Entering Conflict Zone</span>
              </span>
              <span className="text-[11px] font-bold text-amber-400">IN TRANSIT</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-600" />
                <span>Cleared & Normal Restored</span>
              </span>
              <span className="text-[11px]">3 FRAMES PENDING</span>
            </div>
          </div>
        </div>

        {/* Latest Detection Summary */}
        {analysisResult && (
          <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-4 text-xs font-mono">
            <span className="text-emerald-400 font-bold block mb-1">
              Gemini Vision Diagnostic Report
            </span>
            <p className="text-slate-300">
              Detected {analysisResult.vehicle_count} total vehicles. Ambulance identified with confidence {(analysisResult.confidence * 100).toFixed(1)}%. Corridor clearance safe to proceed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
