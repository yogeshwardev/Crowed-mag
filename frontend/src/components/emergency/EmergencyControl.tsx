import React, { useState } from 'react';
import {
  Flame,
  AlertTriangle,
  HeartPulse,
  Ban,
  Radio,
  Play,
  RotateCcw,
  Users,
  Timer,
  CheckCircle2,
  TrendingDown,
  Compass,
  Zap,
  ShieldAlert,
  Activity,
  ArrowRight
} from 'lucide-react';
import { TelemetrySnapshot, Blueprint } from '../../types';

interface EmergencyControlProps {
  telemetry: TelemetrySnapshot | null;
  blueprint: Blueprint;
  onTriggerEmergency: (data: {
    scenario_type: string;
    location_x?: number;
    location_y?: number;
    radius?: number;
    blocked_exit_id?: string;
  }) => void;
  onClearEmergency: () => void;
  onBlockExit: (exitId: string) => void;
  onUnblockExit: (exitId: string) => void;
}

export const EmergencyControl: React.FC<EmergencyControlProps> = ({
  telemetry,
  blueprint,
  onTriggerEmergency,
  onClearEmergency,
  onBlockExit,
  onUnblockExit,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<string>('stampede');
  const [fireX, setFireX] = useState<number>(blueprint.width / 2);
  const [fireY, setFireY] = useState<number>(blueprint.length / 2);
  const [fireRadius, setFireRadius] = useState<number>(18);
  const [paBroadcastMessage, setPaBroadcastMessage] = useState<string | null>(null);

  const isEmergency = telemetry?.is_emergency ?? false;
  const evac = telemetry?.evacuation;
  const blockedExits = telemetry?.blocked_exits ?? [];
  const exits = blueprint.elements.filter(e => ['exit_gate', 'emergency_exit'].includes(e.type));

  const totalPeople = evac?.total_people ?? telemetry?.active_agent_count ?? 800;
  const exitedPeople = evac?.exited_people ?? 0;
  const remainingPeople = evac?.remaining_people ?? totalPeople;
  const evacPct = evac?.evacuation_percentage ?? (totalPeople > 0 ? ((exitedPeople / totalPeople) * 100) : 0);
  const elapsedSec = evac?.elapsed_seconds ?? 0;
  const estSec = evac?.estimated_completion_seconds ?? 95;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartEmergency = (scenarioType: string = selectedScenario) => {
    onTriggerEmergency({
      scenario_type: scenarioType,
      location_x: fireX,
      location_y: fireY,
      radius: fireRadius
    });
  };

  return (
    <div className="h-full w-full bg-[#080c14] overflow-y-auto p-6 space-y-6">
      {/* Top Banner: Emergency Status Telemetry */}
      <div className={`p-6 rounded-2xl border backdrop-blur-md transition-all ${
        isEmergency
          ? 'bg-rose-950/40 border-rose-600/80 shadow-glow-red'
          : 'bg-[#0e1626]/90 border-slate-800'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${isEmergency ? 'bg-rose-600 text-white animate-bounce' : 'bg-slate-800 text-slate-400'}`}>
              <Flame className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Emergency Protocol</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono uppercase ${
                  isEmergency ? 'bg-rose-600 text-white animate-pulse' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                }`}>
                  {isEmergency ? `ACTIVE SURGE: ${telemetry?.emergency_scenario?.toUpperCase()}` : 'NORMAL READINESS'}
                </span>
              </div>
              <p className="text-lg font-bold text-slate-100 mt-1">
                {isEmergency
                  ? 'Real-time multi-agent panic contagion and stampede evacuation active. Social force compression engaged.'
                  : 'Automated alarm, panic dissipation, and evacuation routing system standing by.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isEmergency ? (
              <button
                onClick={onClearEmergency}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RESTORE NORMAL FLOW</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStartEmergency('stampede')}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-glow-red transition active:scale-95"
                >
                  <Zap className="w-4 h-4" />
                  <span>⚡ TRIGGER STAMPEDE SURGE</span>
                </button>
                <button
                  onClick={() => handleStartEmergency('fire')}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-glow-red transition active:scale-95"
                >
                  <Flame className="w-4 h-4" />
                  <span>🔥 IGNITE FIRE HAZARD</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Evacuation & Stampede Telemetry Bar */}
        {isEmergency && (
          <div className="mt-6 pt-6 border-t border-rose-900/60 grid grid-cols-4 gap-4">
            <div className="bg-black/30 p-3 rounded-xl border border-rose-900/40">
              <span className="text-[10px] uppercase font-bold text-rose-300 block">Evacuated / Cleared</span>
              <div className="text-xl font-black font-mono text-emerald-400 mt-0.5">
                {exitedPeople} <span className="text-xs text-slate-400 font-sans font-normal">/ {totalPeople}</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${Math.min(100, evacPct)}%` }} />
              </div>
            </div>

            <div className="bg-black/30 p-3 rounded-xl border border-rose-900/40">
              <span className="text-[10px] uppercase font-bold text-rose-300 block">Remaining Inside</span>
              <div className="text-xl font-black font-mono text-rose-400 mt-0.5">
                {remainingPeople}
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                {(100 - evacPct).toFixed(1)}% remaining in venue
              </span>
            </div>

            <div className="bg-black/30 p-3 rounded-xl border border-rose-900/40">
              <span className="text-[10px] uppercase font-bold text-rose-300 block">Average Stampede Velocity</span>
              <div className="text-xl font-black font-mono text-cyan-300 mt-0.5">
                3.8 m/s
              </div>
              <span className="text-[11px] text-cyan-400/80 block mt-1">
                Sprint stride ({formatTime(elapsedSec)} elapsed)
              </span>
            </div>

            <div className="bg-black/30 p-3 rounded-xl border border-rose-900/40">
              <span className="text-[10px] uppercase font-bold text-rose-300 block">Est. Complete Clearance</span>
              <div className="text-xl font-black font-mono text-amber-400 mt-0.5">
                {formatTime(Math.max(0, estSec - elapsedSec))}
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                Continuous dynamic egress routing
              </span>
            </div>
          </div>
        )}

        {/* Evacuation Completed Celebratory Banner */}
        {isEmergency && (evac?.is_completed || (remainingPeople === 0 && totalPeople > 0)) && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-950/80 border-2 border-emerald-500 shadow-glow-emerald flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  ✅ EVACUATION 100% COMPLETE — ALL {totalPeople} CITIZENS SAFELY EVACUATED
                </h4>
                <p className="text-xs text-emerald-200/90 font-medium">
                  Zero casualties. All sectors and stands have been cleared through emergency exits in {formatTime(elapsedSec)}.
                </p>
              </div>
            </div>
            <button
              onClick={onClearEmergency}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow transition active:scale-95 shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RESTORE NORMAL OPERATIONS</span>
            </button>
          </div>
        )}
      </div>

      {/* Grid: Scenario Configuration & Exit Route Controller */}
      <div className="grid grid-cols-2 gap-6">
        {/* Panel 1: Scenario Configuration */}
        <div className="bg-[#0e1626]/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Radio className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Crowd Incident Setup</h3>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 block">Incident Scenario Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'stampede', name: '🚨 Stampede & Crowd Surge', desc: 'Sudden panic sprint with physical crush forces' },
                { id: 'fire', name: '🔥 Fire & Smoke Ignition', desc: 'Localized flame zone with radial repulsion' },
                { id: 'blackout', name: '⚡ Power Grid Blackout', desc: 'Zero-lux venue darkness; drone searchlight fleet dispatched' },
                { id: 'crowd_surge', name: '🌊 Inflow Bottleneck Surge', desc: 'Mass influx causing gate compression' },
                { id: 'exit_blockage', name: '⛔ Exit Gate Lock Failure', desc: 'Exit blockage forcing crowd rerouting' },
              ].map(sc => (
                <button
                  key={sc.id}
                  onClick={() => setSelectedScenario(sc.id)}
                  className={`p-3 rounded-xl border text-left transition ${
                    selectedScenario === sc.id
                      ? 'bg-cyan-950/60 border-cyan-500/80 text-cyan-300 shadow-glow-cyan'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-100">{sc.name}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{sc.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Coordinates & Radius Sliders */}
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Incident Center X</span>
                <span className="font-mono text-cyan-400">{fireX.toFixed(1)}m</span>
              </div>
              <input
                type="range"
                min={5}
                max={blueprint.width - 5}
                step={1}
                value={fireX}
                onChange={(e) => setFireX(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Incident Center Y</span>
                <span className="font-mono text-cyan-400">{fireY.toFixed(1)}m</span>
              </div>
              <input
                type="range"
                min={5}
                max={blueprint.length - 5}
                step={1}
                value={fireY}
                onChange={(e) => setFireY(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Danger Radius</span>
                <span className="font-mono text-cyan-400">{fireRadius}m</span>
              </div>
              <input
                type="range"
                min={5}
                max={35}
                step={1}
                value={fireRadius}
                onChange={(e) => setFireRadius(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>

          <button
            onClick={() => handleStartEmergency()}
            className="w-full py-2.5 bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-glow-red transition"
          >
            Launch Selected Incident Simulation
          </button>
        </div>

        {/* Panel 2: Intelligent Exit Recommendation, Crowd Passing & Fire Proximity Radar */}
        <div className="bg-[#0e1626]/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Intelligent Exit Guidance & Egress Flow Radar
              </h3>
            </div>
            <span className="text-[11px] text-emerald-400 font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800">
              AI REAL-TIME ROUTING
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Real-time evaluation of all venue exits based on proximity to active fire hazards, gate width, and crowd clearance throughput.
          </p>

          {/* Active PA Broadcast Notification */}
          {paBroadcastMessage && (
            <div className="p-3 rounded-xl bg-cyan-950/90 border border-cyan-500/80 shadow-glow-cyan flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-200">
                <Radio className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{paBroadcastMessage}</span>
              </div>
              <button
                onClick={() => setPaBroadcastMessage(null)}
                className="text-[10px] text-cyan-400 hover:text-white px-2 py-0.5 rounded bg-cyan-900/60"
              >
                DISMISS
              </button>
            </div>
          )}

          {/* Sorted Exit List based on Fire Proximity & Safety */}
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {exits.map((exit, idx) => {
              const isBlocked = blockedExits.includes(exit.id);
              const distToFire = Math.hypot(exit.x - fireX, exit.y - fireY);
              const isFireRisk = isEmergency && distToFire < 24.0;
              const isPreferred = isEmergency && !isBlocked && !isFireRisk;
              
              // Estimated crowd passed through this gate
              const totalGateWidth = exits.reduce((acc, e) => acc + (e.width || 4), 0) || 1;
              const gateRatio = (exit.width || 4) / totalGateWidth;
              const passedThroughGate = isEmergency ? Math.round(exitedPeople * gateRatio) : 0;
              const gateFlowRate = isEmergency ? Math.round((passedThroughGate / Math.max(1, elapsedSec)) * 60) : 0;

              return (
                <div
                  key={exit.id}
                  className={`p-3.5 rounded-xl border transition space-y-2.5 ${
                    isBlocked
                      ? 'bg-rose-950/40 border-rose-600/80 text-rose-300'
                      : isFireRisk
                      ? 'bg-orange-950/40 border-rose-500/80 text-rose-200'
                      : isPreferred
                      ? 'bg-emerald-950/30 border-emerald-500/80 text-emerald-200 shadow-glow-emerald/30'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300'
                  }`}
                >
                  {/* Exit Header & Safety Verdict Tag */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                        {exit.label || exit.id}
                        {exit.type === 'emergency_exit' && (
                          <span className="px-1.5 py-0.5 bg-red-950 text-red-400 rounded text-[9px] font-mono border border-red-800">
                            EMERGENCY
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Recommendation Verdict Badge */}
                    {isBlocked ? (
                      <span className="px-2 py-0.5 bg-rose-950 border border-rose-500 text-rose-300 rounded text-[10px] font-extrabold flex items-center gap-1">
                        <Ban className="w-3 h-3" /> BLOCKED
                      </span>
                    ) : isFireRisk ? (
                      <span className="px-2 py-0.5 bg-rose-950/90 border border-rose-400 text-rose-200 rounded text-[10px] font-extrabold flex items-center gap-1 animate-pulse">
                        <Flame className="w-3 h-3 text-orange-400" /> HIGH FIRE RISK — AVOID
                      </span>
                    ) : isPreferred ? (
                      <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-400 text-emerald-300 rounded text-[10px] font-black flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> ⭐ PREFERRED (SAFE)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] font-medium">
                        NORMAL ROUTE
                      </span>
                    )}
                  </div>

                  {/* Distance to Fire Hazard & Egress Telemetry */}
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-black/40 p-2 rounded-lg border border-slate-800/80">
                    <div>
                      <span className="text-[9px] text-slate-500 block">FIRE DISTANCE</span>
                      <span className={`font-bold ${isFireRisk ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                        {distToFire.toFixed(1)}m {isFireRisk ? '(HAZARD)' : '(SAFE)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block">CROWD PASSED</span>
                      <span className="text-cyan-300 font-bold">
                        {passedThroughGate} <span className="text-[9px] text-slate-400 font-normal">cleared</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block">FLOW RATE</span>
                      <span className="text-amber-400 font-bold">
                        {gateFlowRate} <span className="text-[9px] text-slate-400 font-normal">p/min</span>
                      </span>
                    </div>
                  </div>

                  {/* Crowd Clearance Progress Bar */}
                  {isEmergency && (
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Doorway Egress Capacity ({exit.width}m width)</span>
                        <span className="text-cyan-300 font-mono">
                          {totalPeople > 0 ? ((passedThroughGate / totalPeople) * 100).toFixed(1) : 0}% of venue crowd
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isFireRisk ? 'bg-rose-500' : isPreferred ? 'bg-emerald-400' : 'bg-cyan-500'
                          }`}
                          style={{ width: `${Math.min(100, totalPeople > 0 ? (passedThroughGate / totalPeople) * 100 * 3 : 0)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons: Toggle Lock & Broadcast PA Route Guidance */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => isBlocked ? onUnblockExit(exit.id) : onBlockExit(exit.id)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        isBlocked
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-rose-600 hover:bg-rose-500 text-white'
                      }`}
                    >
                      {isBlocked ? 'UNBLOCK GATE' : 'LOCK / BLOCK GATE'}
                    </button>

                    {isPreferred && (
                      <button
                        onClick={() => setPaBroadcastMessage(`📢 [PA BROADCAST]: "Attention all occupants — please calmly proceed to ${exit.label || exit.id}. Route is 100% safe."`)}
                        className="px-3 py-1.5 bg-cyan-600/80 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>BROADCAST PA ROUTE</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Tactical Autonomous Drone Fleet Surveillance Command */}
      <div className="bg-[#0e1626]/90 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Autonomous Drone Fleet Surveillance & Blackout Searchlight Unit
              </h3>
              <p className="text-xs text-slate-400">
                Automatic aerial deployment for zero-lux blackout inspection, crowd crush detection, and searchlight exit guidance.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-lg bg-cyan-950/80 text-cyan-300 border border-cyan-800">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              2 DRONES OPERATIONAL
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Drone 1 Card */}
          <div className="bg-[#070b14]/80 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-xs text-slate-200">FALCON-1 ALPHA</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">FLIR THERMAL</span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">BATTERY: 96%</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <div>
                <span className="text-[9px] text-slate-500 block">ALTITUDE</span>
                <span className="text-cyan-300 font-bold">26.4m AGL</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block">AIRSPEED</span>
                <span className="text-cyan-300 font-bold">14.2 km/h</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block">SEARCHLIGHT</span>
                <span className="text-amber-400 font-bold">100% (ACTIVE)</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Mission: Figure-8 Grandstand & Pitch Surveillance</span>
              <span className="text-cyan-400 font-mono">AUTONOMOUS</span>
            </div>
          </div>

          {/* Drone 2 Card */}
          <div className="bg-[#070b14]/80 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-xs text-slate-200">FALCON-2 BRAVO</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">NIGHT VISION NVG</span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">BATTERY: 92%</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <div>
                <span className="text-[9px] text-slate-500 block">ALTITUDE</span>
                <span className="text-cyan-300 font-bold">28.0m AGL</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block">AIRSPEED</span>
                <span className="text-cyan-300 font-bold">11.8 km/h</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block">SEARCHLIGHT</span>
                <span className="text-amber-400 font-bold">100% (ACTIVE)</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Mission: Perimeter Gate & Emergency Egress Sweeps</span>
              <span className="text-cyan-400 font-mono">AUTONOMOUS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
