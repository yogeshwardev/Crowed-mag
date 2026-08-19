import React, { useState } from 'react';
import {
  GitFork,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Clock,
  ShieldCheck,
  Zap,
  Sliders,
  Maximize2
} from 'lucide-react';
import { WhatIfOptimizationResponse, WhatIfScenarioResult, Blueprint } from '../../types';
import { api } from '../../utils/api';

interface WhatIfOptimizerProps {
  currentBlueprint: Blueprint;
  onApplyOptimizedBlueprint: (blueprint: Blueprint) => void;
}

export const WhatIfOptimizer: React.FC<WhatIfOptimizerProps> = ({
  currentBlueprint,
  onApplyOptimizedBlueprint,
}) => {
  const [optimizationData, setOptimizationData] = useState<WhatIfOptimizationResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<string>('');

  const handleRunOptimization = async () => {
    setIsLoading(true);
    try {
      const res = await api.runWhatIfOptimization();
      setOptimizationData(res);
      setSelectedScenarioIdx(0);
    } catch (err) {
      console.error('What-If run failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyDesign = (scenario: WhatIfScenarioResult) => {
    if (scenario.modified_blueprint) {
      onApplyOptimizedBlueprint(scenario.modified_blueprint);
      setStatusMsg(`✓ Applied '${scenario.name}' to Digital Twin!`);
      setTimeout(() => setStatusMsg(''), 3500);
    }
  };

  const baseline = optimizationData?.baseline;
  const scenarios = optimizationData?.scenarios ?? [];
  const selectedScenario = scenarios[selectedScenarioIdx] || scenarios[0];

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="h-full w-full bg-[#080c14] overflow-y-auto p-6 space-y-6">
      {/* Top Banner: What-If Engine Launcher */}
      <div className="bg-[#0e1626]/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <GitFork className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">What-If Safety Lab</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800">
                A/B LAYOUT OPTIMIZER
              </span>
            </div>
            <p className="text-base font-bold text-slate-100 mt-1">
              Simulate architectural variations, turnstile upgrades, and emergency exit expansions before deployment.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {statusMsg && (
            <span className="text-xs font-mono font-bold text-emerald-400 animate-pulse">
              {statusMsg}
            </span>
          )}
          <button
            onClick={handleRunOptimization}
            disabled={isLoading}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-glow-cyan transition active:scale-95 disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'SIMULATING PERMUTATIONS...' : 'RUN WHAT-IF OPTIMIZATION'}</span>
          </button>
        </div>
      </div>

      {optimizationData ? (
        <>
          {/* Side-by-Side Comparison: Current Baseline vs Selected Optimized Design */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Baseline Layout Card */}
            <div className="bg-[#0e1626]/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Current Layout (Baseline)
                </span>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                  STANDARD
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">AI Risk Score</span>
                  <span className="text-2xl font-black font-mono text-rose-400 mt-0.5 block">
                    {baseline?.risk_score.toFixed(0)} <span className="text-xs text-slate-500">/ 100</span>
                  </span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Evacuation Time</span>
                  <span className="text-2xl font-black font-mono text-slate-200 mt-0.5 block">
                    {formatSec(baseline?.evacuation_time_sec || 0)}
                  </span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Peak Density</span>
                  <span className="text-xl font-bold font-mono text-amber-400 mt-0.5 block">
                    {baseline?.max_density.toFixed(2)} p/m²
                  </span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Throughput Rate</span>
                  <span className="text-xl font-bold font-mono text-slate-300 mt-0.5 block">
                    {baseline?.throughput_per_min} p/min
                  </span>
                </div>
              </div>
            </div>

            {/* Selected Optimized Layout Card */}
            {selectedScenario && (
              <div className="bg-[#0e1626]/90 border border-cyan-800/80 rounded-2xl p-6 backdrop-blur-md space-y-4 shadow-glow-cyan">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{selectedScenario.name}</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {selectedScenario.congestion_delta_percent.toFixed(1)}% CONGESTION
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-cyan-900/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Optimized Risk Score</span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl font-black font-mono text-emerald-400">
                        {selectedScenario.risk_score.toFixed(0)}
                      </span>
                      <span className="text-xs font-bold text-emerald-400">
                        (-{(baseline ? baseline.risk_score - selectedScenario.risk_score : 0).toFixed(0)} pts)
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-xl border border-cyan-900/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Optimized Evac Time</span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl font-black font-mono text-cyan-300">
                        {formatSec(selectedScenario.evacuation_time_sec)}
                      </span>
                      <span className="text-xs font-bold text-emerald-400">
                        (-{formatSec((baseline?.evacuation_time_sec || 0) - selectedScenario.evacuation_time_sec)})
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-xl border border-cyan-900/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Optimized Peak Density</span>
                    <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5 block">
                      {selectedScenario.max_density.toFixed(2)} p/m²
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-xl border border-cyan-900/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Throughput Rate</span>
                    <span className="text-xl font-bold font-mono text-cyan-300 mt-0.5 block">
                      {selectedScenario.throughput_per_min} p/min
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <p className="text-xs text-slate-300 font-medium">
                    {selectedScenario.recommendation}
                  </p>
                  <button
                    onClick={() => handleApplyDesign(selectedScenario)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-glow-green transition active:scale-95 shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>APPLY OPTIMAL DESIGN</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Scenarios Permutation List */}
          <div className="bg-[#0e1626]/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Tested Strategy Permutations (Ranked by Safety Gain)</span>
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scenarios.map((sc, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedScenarioIdx(idx)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedScenarioIdx === idx
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-glow-cyan'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-200">{sc.name}</span>
                    {sc.is_optimal && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-cyan-600 text-white">
                        RECOMMENDED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Risk: <strong className="text-emerald-400">{sc.risk_score}</strong></span>
                    <span>Evac: <strong className="text-cyan-300">{formatSec(sc.evacuation_time_sec)}</strong></span>
                    <span>Congestion: <strong className="text-emerald-400">{sc.congestion_delta_percent}%</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="p-12 text-center bg-[#0e1626]/60 border border-dashed border-slate-800 rounded-2xl space-y-3">
          <GitFork className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No Optimization Run Active</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click <strong>RUN WHAT-IF OPTIMIZATION</strong> above to simulate automated structural permutations, queue throughput upgrades, and emergency egress corridors.
          </p>
        </div>
      )}
    </div>
  );
};
