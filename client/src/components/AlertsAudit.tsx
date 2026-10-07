import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  FileCode,
  Clock,
  Filter,
  RefreshCw
} from 'lucide-react';
import { api } from '../lib/api';

interface AlertsAuditProps {
  alerts: any[];
  onRefresh: () => void;
  userRole: string;
}

export const AlertsAudit: React.FC<AlertsAuditProps> = ({
  alerts,
  onRefresh,
  userRole,
}) => {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchAudit();
    } else {
      setAuditLogs([]);
    }
  }, [userRole]);

  const fetchAudit = async () => {
    if (userRole !== 'admin') return;
    try {
      setLoadingAudit(true);
      const res = await api.getAuditLogs(1, 30);
      setAuditLogs(Array.isArray(res) ? res : []);
    } catch {
      // ignore
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleAck = async (id: string) => {
    try {
      await api.acknowledgeAlert(id);
      onRefresh();
    } catch (err: any) {
      alert(`Error acknowledging alert: ${err.message}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Active System Alerts */}
      <div className="lg:col-span-6 bg-[#0b101c] border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Active System Safety Alerts</h3>
              <p className="text-xs text-slate-400">
                Automated Fail-Safe, Camera Sensor & Signal Preemption Alarms
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
            {alerts.filter((a) => !a.acknowledged).length} Unacknowledged
          </span>
        </div>

        <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
          {alerts.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
              <span>All systems optimal. No active safety alarms.</span>
            </div>
          ) : (
            alerts.map((al) => (
              <div
                key={al.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                  al.acknowledged
                    ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                    : al.severity === 'critical'
                    ? 'bg-red-950/30 border-red-500/40 text-red-200'
                    : al.severity === 'warning'
                    ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                    : 'bg-blue-950/20 border-blue-500/30 text-blue-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        al.severity === 'critical'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : al.severity === 'warning'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {al.severity?.toUpperCase() || 'INFO'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(al.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="font-medium">{al.message}</p>
                </div>

                {!al.acknowledged && ['admin', 'operator'].includes(userRole) && (
                  <button
                    onClick={() => handleAck(al.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-mono text-[10px] font-bold border border-slate-700 transition shrink-0"
                  >
                    ACKNOWLEDGE
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Immutable Audit Trail */}
      <div className="lg:col-span-6 bg-[#0b101c] border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <FileCode className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Immutable Event & Override Audit Log</h3>
              <p className="text-xs text-slate-400">
                Complete cryptographically traceable ledger of signal overrides and AI decisions
              </p>
            </div>
          </div>
          {userRole === 'admin' && (
            <button
              onClick={fetchAudit}
              disabled={loadingAudit}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="Refresh Audit Logs"
            >
              <RefreshCw className={`w-4 h-4 ${loadingAudit ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-1 font-mono text-xs">
          {userRole !== 'admin' ? (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-8 text-center text-slate-500 flex flex-col items-center justify-center">
              <FileCode className="w-8 h-8 text-slate-600 mb-2" />
              <span>Immutable cryptographic event log access is restricted to Administrator role.</span>
            </div>
          ) : auditLogs.length === 0 ? (
            <p className="text-slate-500 py-8 text-center">No audit records found.</p>
          ) : (
            auditLogs.map((log, idx) => (
              <div
                key={log.id || idx}
                className="bg-slate-950 border border-slate-800/80 p-2.5 rounded-lg flex items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">{log.action}</span>
                    <span className="text-[10px] text-slate-500">{log.entity}</span>
                  </div>
                  {log.details && (
                    <span className="text-[11px] text-slate-400 truncate max-w-sm block">
                      {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">
                  {new Date(log.created_at || Date.now()).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
