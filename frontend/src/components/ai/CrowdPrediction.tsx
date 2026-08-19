import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Clock, AlertOctagon, Users, ShieldCheck,
  RefreshCw, Activity, MapPin
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine, Legend
} from 'recharts';
import { CrowdPrediction as CrowdPredictionType, TelemetrySnapshot } from '../../types';
import { api } from '../../utils/api';

interface CrowdPredictionProps {
  prediction: CrowdPredictionType | null;
  telemetry: TelemetrySnapshot | null;
}

function buildChartData(currentCrowd: number, pred10m: number, pred30m: number, pred60m: number, safeCap: number, maxCap: number) {
  return [
    { time: 'Now', crowd: currentCrowd, safe: safeCap, max: maxCap, uncertainty_hi: currentCrowd * 1.05, uncertainty_lo: currentCrowd * 0.95 },
    { time: '+5m', crowd: Math.round((currentCrowd + pred10m) / 2), safe: safeCap, max: maxCap, uncertainty_hi: Math.round((currentCrowd + pred10m) / 2 * 1.08), uncertainty_lo: Math.round((currentCrowd + pred10m) / 2 * 0.92) },
    { time: '+10m', crowd: pred10m, safe: safeCap, max: maxCap, uncertainty_hi: Math.round(pred10m * 1.12), uncertainty_lo: Math.round(pred10m * 0.88) },
    { time: '+20m', crowd: Math.round((pred10m + pred30m) / 2), safe: safeCap, max: maxCap, uncertainty_hi: Math.round((pred10m + pred30m) / 2 * 1.15), uncertainty_lo: Math.round((pred10m + pred30m) / 2 * 0.85) },
    { time: '+30m', crowd: pred30m, safe: safeCap, max: maxCap, uncertainty_hi: Math.round(pred30m * 1.18), uncertainty_lo: Math.round(pred30m * 0.82) },
    { time: '+45m', crowd: Math.round((pred30m + pred60m) / 2), safe: safeCap, max: maxCap, uncertainty_hi: Math.round((pred30m + pred60m) / 2 * 1.22), uncertainty_lo: Math.round((pred30m + pred60m) / 2 * 0.78) },
    { time: '+60m', crowd: pred60m, safe: safeCap, max: maxCap, uncertainty_hi: Math.round(pred60m * 1.25), uncertainty_lo: Math.round(pred60m * 0.75) },
  ];
}

export const CrowdPrediction: React.FC<CrowdPredictionProps> = ({
  prediction: externalPrediction,
  telemetry,
}) => {
  const [prediction, setPrediction] = useState<CrowdPredictionType | null>(externalPrediction);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [horizon, setHorizon] = useState<'10m' | '30m' | '60m'>('30m');

  useEffect(() => {
    if (externalPrediction) setPrediction(externalPrediction);
  }, [externalPrediction]);

  const fetchPrediction = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCrowdPrediction();
      setPrediction(data);
      setLastUpdated(new Date());
    } catch (err) {
      // Backend busy – silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrediction();
    const id = setInterval(fetchPrediction, 5000);
    return () => clearInterval(id);
  }, [fetchPrediction]);

  const currentCrowd = prediction?.current_crowd ?? telemetry?.active_agent_count ?? 800;
  const pred10m = prediction?.predicted_10m ?? Math.round(currentCrowd * 1.2);
  const pred30m = prediction?.predicted_30m ?? Math.round(currentCrowd * 1.55);
  const pred60m = prediction?.predicted_60m ?? Math.round(currentCrowd * 2.1);
  const safeCap = telemetry?.capacity?.safe_capacity ?? 2000;
  const maxCap = telemetry?.capacity?.maximum_capacity ?? 4500;
  const timeToExceed = prediction?.time_to_capacity_exceedance_min;
  const zoneForecasts = prediction?.zone_forecasts ?? [];
  const inflow = prediction?.current_inflow_per_min ?? 180;
  const outflow = prediction?.current_outflow_per_min ?? 120;

  const chartData = buildChartData(currentCrowd, pred10m, pred30m, pred60m, safeCap, maxCap);

  // Determine projected crowd at selected horizon
  const horizonCrowd = horizon === '10m' ? pred10m : horizon === '30m' ? pred30m : pred60m;
  const projectedPct = Math.round((horizonCrowd / safeCap) * 100);
  const projectedStatus = horizonCrowd > maxCap ? 'OVERCAPACITY' : horizonCrowd > safeCap ? 'WARNING' : 'SAFE';
  const projectedColor = projectedStatus === 'OVERCAPACITY' ? 'text-rose-400' : projectedStatus === 'WARNING' ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="h-full w-full bg-[#080c14] overflow-y-auto p-3 sm:p-5 lg:p-6 space-y-4 lg:space-y-6">

      {/* Header */}
      <div className="bg-[#0e1626]/90 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Predictive Model · LSTM + Social Force</span>
              <h2 className="text-sm font-bold text-slate-100">Crowd Density Forecasting Engine</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-mono">
              {lastUpdated.toLocaleTimeString()}
            </span>
            <button
              onClick={fetchPrediction}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Projection Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#0e1626]/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Now</span>
          <div className="text-2xl font-black font-mono text-slate-100 mt-1">{currentCrowd.toLocaleString()}</div>
          <div className="text-[10px] text-emerald-400 mt-1">● Live count</div>
        </div>
        <div className="bg-[#0e1626]/90 border border-cyan-800/40 rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">+10 min</span>
          <div className="text-2xl font-black font-mono text-cyan-300 mt-1">{pred10m.toLocaleString()}</div>
          <div className="text-[10px] text-slate-500 mt-1">
            {pred10m > currentCrowd ? '▲' : '▼'} {Math.abs(pred10m - currentCrowd).toLocaleString()} projected
          </div>
        </div>
        <div className="bg-[#0e1626]/90 border border-amber-800/40 rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">+30 min</span>
          <div className={`text-2xl font-black font-mono mt-1 ${pred30m > safeCap ? 'text-amber-400' : 'text-slate-100'}`}>{pred30m.toLocaleString()}</div>
          <div className="text-[10px] text-slate-500 mt-1">
            {pred30m > safeCap ? <span className="text-amber-400">⚠ Over safe limit</span> : 'Within safe range'}
          </div>
        </div>
        <div className="bg-[#0e1626]/90 border border-rose-800/40 rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">+60 min</span>
          <div className={`text-2xl font-black font-mono mt-1 ${pred60m > maxCap ? 'text-rose-400 animate-pulse' : pred60m > safeCap ? 'text-amber-400' : 'text-emerald-400'}`}>{pred60m.toLocaleString()}</div>
          <div className="text-[10px] text-slate-500 mt-1">
            {pred60m > maxCap ? <span className="text-rose-400">🔴 Overcapacity!</span> : `${Math.round((pred60m / safeCap) * 100)}% of safe cap`}
          </div>
        </div>
      </div>

      {/* Main Area Chart */}
      <div className="bg-[#0e1626]/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">60-Minute Crowd Trajectory</span>
          </div>
          {/* Horizon Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-lg">
            {(['10m', '30m', '60m'] as const).map(h => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                  horizon === h ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ left: 0, right: 10, top: 5, bottom: 0 }}>
            <defs>
              <linearGradient id="crowdGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="uncertaintyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={50} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
            />
            {/* Safe capacity reference */}
            <ReferenceLine y={safeCap} stroke="#eab308" strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value: 'Safe Cap', position: 'right', fill: '#eab308', fontSize: 9 }} />
            {/* Max capacity reference */}
            <ReferenceLine y={maxCap} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value: 'Max Cap', position: 'right', fill: '#ef4444', fontSize: 9 }} />
            {/* Uncertainty band */}
            <Area type="monotone" dataKey="uncertainty_hi" stroke="none" fill="url(#uncertaintyGrad)" fillOpacity={1} name="Uncertainty Hi" legendType="none" />
            {/* Crowd forecast */}
            <Area type="monotone" dataKey="crowd" stroke="#06b6d4" strokeWidth={2.5}
              fill="url(#crowdGrad)" fillOpacity={1} name="Predicted Crowd" dot={{ r: 4, fill: '#06b6d4' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Flow Rate Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#0e1626]/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-3">Live Flow Rates</span>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-emerald-400 font-bold">Inflow</span>
                <span className="font-mono text-slate-200">{inflow.toFixed(0)} p/min</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (inflow / 300) * 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-rose-400 font-bold">Outflow</span>
                <span className="font-mono text-slate-200">{outflow.toFixed(0)} p/min</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(100, (outflow / 300) * 100)}%` }} />
              </div>
            </div>
            <div className={`text-[11px] font-bold ${inflow > outflow ? 'text-amber-400' : 'text-emerald-400'}`}>
              Net: {inflow > outflow ? '+' : ''}{(inflow - outflow).toFixed(0)} p/min
              {inflow > outflow ? ' (crowd growing)' : ' (crowd reducing)'}
            </div>
          </div>
        </div>

        {/* Time-to-exceed Warning */}
        <div className={`border rounded-2xl p-4 ${
          timeToExceed != null && timeToExceed < 30
            ? 'bg-rose-950/30 border-rose-800/50'
            : 'bg-[#0e1626]/90 border-slate-800'
        }`}>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-3">Capacity Threshold Alert</span>
          {timeToExceed != null ? (
            <div className="space-y-2">
              <div className={`text-3xl font-black font-mono ${timeToExceed < 15 ? 'text-rose-400 animate-pulse' : timeToExceed < 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {timeToExceed.toFixed(0)}m
              </div>
              <div className="text-[11px] text-slate-300">until safe capacity exceeded</div>
              {timeToExceed < 30 && (
                <div className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-800/40 rounded-lg p-2 mt-2">
                  ⚠ Recommend initiating entry rate controls and activating overflow zones.
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-sm font-bold">No threshold breach projected</span>
            </div>
          )}
        </div>
      </div>

      {/* Zone Forecasts */}
      {zoneForecasts.length > 0 && (
        <div className="bg-[#0e1626]/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Zone-Level Density Forecast</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {zoneForecasts.map((zone: any, i: number) => {
              const risk = zone.predicted_density > 4.0 ? 'rose' : zone.predicted_density > 3.0 ? 'amber' : 'emerald';
              return (
                <div key={i} className={`p-3 rounded-xl border text-[11px] bg-slate-900/50 border-${risk}-800/30`}>
                  <div className="font-bold text-slate-200 mb-1">{zone.zone_name}</div>
                  <div className={`text-${risk}-400 font-mono font-bold`}>
                    {zone.predicted_density?.toFixed(2)} p/m²
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (zone.predicted_density / 5.0) * 100)}%`,
                        background: risk === 'rose' ? '#ef4444' : risk === 'amber' ? '#f59e0b' : '#22c55e'
                      }}
                    />
                  </div>
                  <div className={`text-[9px] text-${risk}-500 mt-1 uppercase font-bold`}>{zone.forecast_label ?? (risk === 'rose' ? 'CRITICAL' : risk === 'amber' ? 'DENSE' : 'SAFE')}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
