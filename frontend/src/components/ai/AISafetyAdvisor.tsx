import React, { useState, useEffect, useCallback } from 'react';
import {
  BrainCircuit, AlertTriangle, CheckCircle2, ShieldAlert, ArrowRight,
  TrendingUp, Clock, Users, DoorOpen, Sparkles, RefreshCw, Activity,
  Target, Cpu, BarChart2, Zap, Flame
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AIRiskAnalysis, TelemetrySnapshot } from '../../types';
import { api } from '../../utils/api';

interface AISafetyAdvisorProps {
  riskAnalysis: AIRiskAnalysis | null;
  telemetry: TelemetrySnapshot | null;
  onApplyRecommendation?: (rec: string) => void;
}

const RISK_FACTORS = [
  { key: 'density_score', label: 'Crowd Density', icon: Users, unit: '/100' },
  { key: 'flow_score', label: 'Flow Efficiency', icon: Activity, unit: '/100' },
  { key: 'bottleneck_score', label: 'Bottleneck Risk', icon: Target, unit: '/100' },
  { key: 'evacuation_score', label: 'Evac Readiness', icon: DoorOpen, unit: '/100' },
  { key: 'panic_score', label: 'Panic Index', icon: AlertTriangle, unit: '/100' },
];

function getRiskColor(score: number) {
  if (score <= 20) return { text: 'text-emerald-400', bar: '#22c55e', bg: 'bg-emerald-950/30 border-emerald-700/60', label: 'SAFE', ring: '#22c55e' };
  if (score <= 40) return { text: 'text-cyan-400', bar: '#06b6d4', bg: 'bg-cyan-950/30 border-cyan-700/60', label: 'LOW', ring: '#06b6d4' };
  if (score <= 60) return { text: 'text-amber-400', bar: '#eab308', bg: 'bg-amber-950/30 border-amber-700/60', label: 'MODERATE', ring: '#eab308' };
  if (score <= 80) return { text: 'text-orange-400', bar: '#f97316', bg: 'bg-orange-950/30 border-orange-700/60', label: 'HIGH', ring: '#f97316' };
  return { text: 'text-rose-400', bar: '#ef4444', bg: 'bg-rose-950/40 border-rose-700/60', label: 'CRITICAL', ring: '#ef4444' };
}

function buildRiskBars(riskAnalysis: AIRiskAnalysis | null, telemetry: TelemetrySnapshot | null) {
  if (riskAnalysis?.factors?.length) {
    return riskAnalysis.factors.map(f => ({
      label: f.factor_name ?? f.name,
      score: Math.round(f.score),
      color: getRiskColor(f.score).bar
    }));
  }
  // Synthesize from live telemetry
  const density = Math.min(100, (telemetry?.max_density ?? 0) / 5.0 * 100);
  const bottleneck = Math.min(100, (telemetry?.bottlenecks?.length ?? 0) * 18);
  const panic = Math.min(100, (telemetry?.panic_agent_count ?? 0) / Math.max(1, telemetry?.active_agent_count ?? 1) * 100);
  const flow = Math.max(0, 100 - density * 0.5 - bottleneck * 0.3);
  const evac = Math.max(0, 100 - (telemetry?.is_emergency ? 40 : 0) - bottleneck * 0.2);
  return [
    { label: 'Crowd Density', score: Math.round(density), color: getRiskColor(density).bar },
    { label: 'Flow Efficiency', score: Math.round(flow), color: getRiskColor(flow).bar },
    { label: 'Bottleneck Risk', score: Math.round(bottleneck), color: getRiskColor(bottleneck).bar },
    { label: 'Evac Readiness', score: Math.round(evac), color: getRiskColor(evac).bar },
    { label: 'Panic Index', score: Math.round(panic), color: getRiskColor(panic).bar },
  ];
}

export const AISafetyAdvisor: React.FC<AISafetyAdvisorProps> = ({
  riskAnalysis: externalRisk,
  telemetry,
  onApplyRecommendation,
}) => {
  const [riskAnalysis, setRiskAnalysis] = useState<AIRiskAnalysis | null>(externalRisk);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Update from external (parent polling)
  useEffect(() => {
    if (externalRisk) setRiskAnalysis(externalRisk);
  }, [externalRisk]);

  const fetchRisk = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAIRisk();
      setRiskAnalysis(data);
      setLastUpdated(new Date());
    } catch (err) {
      // Backend might be busy, silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 3 seconds
  useEffect(() => {
    fetchRisk();
    const id = setInterval(fetchRisk, 3000);
    return () => clearInterval(id);
  }, [fetchRisk]);

  const riskScore = riskAnalysis?.risk_score ?? 35.0;
  const category = riskAnalysis?.category ?? (riskAnalysis ? 'MODERATE' : 'ANALYZING');
  const reasons = riskAnalysis?.reasons ?? [];
  const recommendations = riskAnalysis?.recommendations ?? [];
  const queues = riskAnalysis?.queue_statuses ?? telemetry?.queues ?? [];
  const bottlenecks = riskAnalysis?.bottlenecks ?? telemetry?.bottlenecks ?? [];
  const isEmergency = telemetry?.is_emergency ?? false;

  const riskColors = getRiskColor(riskScore);
  const barData = buildRiskBars(riskAnalysis, telemetry);

  // Compute the gauge arc angle
  const gaugeAngle = Math.min(180, (riskScore / 100) * 180);
  const gaugeX = 100 + 80 * Math.cos(Math.PI - (gaugeAngle * Math.PI) / 180);
  const gaugeY = 90 - 80 * Math.sin(Math.PI - (gaugeAngle * Math.PI) / 180);

  return (
    <div className="h-full w-full bg-[#080c14] overflow-y-auto p-3 sm:p-5 lg:p-6 space-y-4 lg:space-y-6">

      {/* Header Banner */}
      <div className="bg-[#0e1626]/90 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Real-Time AI Analysis</span>
              <h2 className="text-sm font-bold text-slate-100">Intelligent Safety Advisor · Social Physics Engine</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-mono">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
            <button
              onClick={fetchRisk}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              title="Refresh AI Analysis"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Top Grid: Risk Score + Factor Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* SVG Risk Gauge */}
        <div className={`border rounded-2xl p-5 flex flex-col items-center ${riskColors.bg}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4">Composite Risk Score</span>

          {/* SVG Semicircle Gauge */}
          <svg viewBox="0 0 200 110" className="w-full max-w-[260px]">
            {/* Background arc */}
            <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round"/>
            {/* Colored arc */}
            <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round"/>
            <path
              d="M 20 90 A 80 80 0 0 1 180 90"
              fill="none"
              stroke={riskColors.ring}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${(riskScore / 100) * 251} 251`}
              style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
            {/* Needle dot */}
            <circle
              cx={gaugeX}
              cy={gaugeY}
              r="8"
              fill={riskColors.ring}
              style={{ filter: `drop-shadow(0 0 6px ${riskColors.ring})` }}
            />
            {/* Score text */}
            <text x="100" y="82" textAnchor="middle" fill="white" fontSize="28" fontWeight="900" fontFamily="monospace">
              {riskScore.toFixed(1)}
            </text>
            <text x="100" y="100" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">
              / 100 COMPOSITE
            </text>
          </svg>

          {/* Status Badge */}
          <div className={`mt-3 px-4 py-2 rounded-xl border font-extrabold text-sm tracking-widest uppercase font-mono ${riskColors.text} border-current`}>
            {riskColors.label} RISK
            {isEmergency && <span className="ml-2 animate-pulse">⚠️</span>}
          </div>

          {/* Active crowd info */}
          <div className="mt-4 w-full grid grid-cols-2 gap-3">
            <div className="bg-slate-900/60 rounded-xl p-3 text-center">
              <div className="text-xl font-black font-mono text-slate-100">{telemetry?.active_agent_count?.toLocaleString() ?? '—'}</div>
              <div className="text-[10px] text-slate-400 uppercase mt-0.5">Active Agents</div>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-3 text-center">
              <div className="text-xl font-black font-mono text-amber-300">{(telemetry?.max_density ?? 0).toFixed(2)}</div>
              <div className="text-[10px] text-slate-400 uppercase mt-0.5">Peak p/m²</div>
            </div>
          </div>
        </div>

        {/* Risk Factor Breakdown Bar Chart */}
        <div className="bg-[#0e1626]/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Risk Factor Breakdown</span>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                itemStyle={{ color: '#94a3b8' }}
                formatter={(val: number) => [`${val}/100`, 'Score']}
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={16}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Threshold legend */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {[
              { label: 'Safe ≤20', color: '#22c55e' },
              { label: 'Low ≤40', color: '#06b6d4' },
              { label: 'Moderate ≤60', color: '#eab308' },
              { label: 'High ≤80', color: '#f97316' },
              { label: 'Critical >80', color: '#ef4444' },
            ].map(t => (
              <div key={t.label} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: t.color }} />
                <span className="text-[9px] text-slate-400 font-mono">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Reasons */}
      {reasons.length > 0 && (
        <div className="bg-[#0e1626]/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Active Risk Indicators ({reasons.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {reasons.map((reason, i) => (
              <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/20 border border-amber-800/40">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-[11px] text-slate-300 leading-snug">{reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Emergency Incident & Precautions Protocol Card */}
      {(isEmergency || telemetry?.fire_state?.is_active) && (
        <div className="bg-gradient-to-r from-rose-950/90 via-[#180d19]/90 to-[#0e1626]/90 border-2 border-rose-500/70 shadow-glow-red rounded-2xl p-4 sm:p-5 animate-pulse">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-600/30 text-rose-400 border border-rose-500/50">
                <ShieldAlert className="w-5 h-5 text-rose-400 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-400 block">AI Incident Response Protocol</span>
                <h3 className="text-sm font-black text-white">
                  🚨 ACTIVE EMERGENCY: {telemetry?.emergency_scenario ? telemetry.emergency_scenario.toUpperCase() : 'INCIDENT DETECTED'}
                </h3>
              </div>
            </div>
            {telemetry?.fire_state?.is_active && (
              <div className="flex items-center gap-2 bg-rose-900/60 border border-rose-500/60 px-3 py-1 rounded-xl">
                <Flame className="w-4 h-4 text-orange-400 animate-spin" />
                <span className="text-xs font-mono font-bold text-orange-300">
                  {telemetry.fire_state.peak_temperature_c.toFixed(0)}°C Peak Flame
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-rose-200/90 mb-4 font-medium leading-relaxed">
            The AI Safety Engine has calculated immediate tactical precautions below. Execute priority steps to minimize stampede risk and maintain non-turbulent egress:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {recommendations.slice(0, 4).map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 hover:bg-rose-900/40 hover:border-rose-500/80 transition cursor-pointer"
                onClick={() => onApplyRecommendation?.(rec)}
              >
                <div className="w-6 h-6 rounded-lg bg-rose-600/40 border border-rose-500/60 flex items-center justify-center text-xs font-black text-white shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="text-xs text-slate-100 font-semibold leading-snug flex-1">
                  {rec}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      {recommendations.length > 0 && !isEmergency && !telemetry?.fire_state?.is_active && (
        <div className="bg-[#0e1626]/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              AI-Generated Safety Recommendations
            </span>
            <span className="ml-auto text-[9px] font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
              {recommendations.length} actions
            </span>
          </div>
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className="group flex items-start gap-3 p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-800/30 hover:border-cyan-700/60 hover:bg-cyan-950/40 cursor-pointer transition"
                onClick={() => onApplyRecommendation?.(rec)}
              >
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-600/30 border border-cyan-500/60 flex items-center justify-center text-[10px] font-bold text-cyan-400">
                  {i + 1}
                </span>
                <span className="text-[11px] text-slate-300 leading-snug flex-1">{rec}</span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-600 group-hover:text-cyan-400 shrink-0 mt-0.5 transition" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottleneck Panel */}
      {bottlenecks.length > 0 && (
        <div className="bg-rose-950/20 border border-rose-800/50 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" />
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
              Bottleneck Analysis ({bottlenecks.length} zones)
            </span>
          </div>
          <div className="space-y-2">
            {bottlenecks.map((b: any, i: number) => (
              <div key={i} className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl text-[11px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">{b.location_name}</span>
                  <span className={`px-2 py-0.5 rounded font-mono text-[9px] ${
                    b.severity === 'CRITICAL' ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-600/60 text-amber-200'
                  }`}>{b.severity}</span>
                </div>
                <p className="text-slate-400">{b.reason}</p>
                {b.current_density && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (b.current_density / 5.0) * 100)}%` }}
                      />
                    </div>
                    <span className="text-rose-300 font-mono text-[10px]">{b.current_density.toFixed(2)} p/m²</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Queue Intelligence */}
      {queues.length > 0 && (
        <div className="bg-[#0e1626]/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <DoorOpen className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Gate Queue Intelligence</span>
          </div>
          <div className="space-y-2 overflow-x-auto">
            {queues.map((q: any, i: number) => {
              const utilization = q.incoming_flow_per_min / Math.max(1, q.processing_rate_per_min);
              const isOverloaded = utilization > 1.2;
              return (
                <div key={i} className={`p-3 rounded-xl border text-[11px] space-y-1.5 ${
                  isOverloaded ? 'bg-rose-950/30 border-rose-800/50' : 'bg-slate-900/50 border-slate-800/60'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{q.gate_name || `Gate ${i + 1}`}</span>
                    <span className={`font-mono font-bold ${isOverloaded ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {(utilization * 100).toFixed(0)}% utilized
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, utilization * 100)}%`,
                        background: isOverloaded ? '#ef4444' : utilization > 0.8 ? '#f97316' : '#22c55e'
                      }}
                    />
                  </div>
                  <div className="flex gap-4 text-slate-400 font-mono text-[10px]">
                    <span>Flow: <span className="text-cyan-300">{q.incoming_flow_per_min?.toFixed(0) ?? 0}</span></span>
                    <span>Cap: <span className="text-cyan-300">{q.processing_rate_per_min?.toFixed(0) ?? 0}/min</span></span>
                    <span>Queue: <span className="text-amber-300">{q.queue_length ?? 0}</span></span>
                    <span>Wait: <span className="text-amber-300">{q.estimated_wait_time_sec?.toFixed(0) ?? 0}s</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No data fallback */}
      {!riskAnalysis && !loading && (
        <div className="text-center py-16 text-slate-500 space-y-3">
          <Cpu className="w-10 h-10 mx-auto text-slate-600 animate-spin" />
          <p className="text-sm font-semibold">Connecting to AI Safety Engine…</p>
          <p className="text-xs">Ensure the backend is running at localhost:8000</p>
        </div>
      )}
    </div>
  );
};
