import React, { useState } from 'react';
import {
  Crosshair,
  Radio,
  Eye,
  Zap,
  BatteryCharging,
  Compass,
  ShieldAlert,
  Sun,
  Moon,
  Activity,
  Layers,
  RotateCcw,
  Camera,
  Maximize2
} from 'lucide-react';
import { DroneData } from '../../types';

interface DroneTacticalHUDProps {
  droneId: 'drone_01' | 'drone_02';
  drones?: DroneData[];
  isBlackout?: boolean;
  onExitDroneView: () => void;
  onToggleSearchlight?: () => void;
  onToggleBlackout?: () => void;
}

export const DroneTacticalHUD: React.FC<DroneTacticalHUDProps> = ({
  droneId,
  drones = [],
  isBlackout = false,
  onExitDroneView,
  onToggleSearchlight,
  onToggleBlackout,
}) => {
  const [thermalMode, setThermalMode] = useState<'WHITE_HOT' | 'NVG_GREEN' | 'IRONBOW' | 'OPTICAL'>('WHITE_HOT');
  const [searchlightOn, setSearchlightOn] = useState<boolean>(true);

  const activeDrone = drones.find(d => d.id === droneId) || {
    id: droneId,
    name: droneId === 'drone_01' ? 'Falcon-1 Alpha (Tactical FLIR)' : 'Falcon-2 Bravo (Perimeter NVG)',
    callsign: droneId === 'drone_01' ? 'FALCON-1' : 'FALCON-2',
    x: 60,
    y: 40,
    altitude: 26.4,
    speed: 12.8,
    heading: 42,
    battery_pct: 94,
    status: isBlackout ? 'SEARCHLIGHT_ACTIVE' : 'PATROLLING',
    mode: isBlackout ? 'BLACKOUT_SURVEILLANCE' : 'AUTONOMOUS',
    flir_mode: 'THERMAL_WHITE_HOT',
    searchlight_on: true,
    detected_anomalies: []
  };

  const thermalFilterStyle = () => {
    switch (thermalMode) {
      case 'NVG_GREEN':
        return 'mix-blend-screen bg-emerald-500/15';
      case 'WHITE_HOT':
        return 'mix-blend-color-dodge bg-cyan-400/10';
      case 'IRONBOW':
        return 'mix-blend-overlay bg-gradient-to-b from-purple-500/20 via-orange-500/20 to-blue-500/20';
      default:
        return 'bg-transparent';
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 font-mono select-none">
      {/* Thermal & NVG Color Grading Screen Filter */}
      <div className={`absolute inset-0 pointer-events-none transition-all duration-300 ${thermalFilterStyle()}`} />

      {/* Subtle Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-40" />

      {/* Top Header: Tactical Status Ribbon */}
      <div className="flex items-center justify-between gap-4 pointer-events-auto bg-[#070b14]/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-cyan-500/40 shadow-2xl">
        {/* Left: Call-sign & Mode */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 animate-pulse">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-100 uppercase tracking-widest">
                {activeDrone.callsign} // {activeDrone.name}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 text-[10px] font-bold border border-cyan-800">
                {isBlackout ? '⚡ BLACKOUT OPS' : 'AIRBORNE'}
              </span>
            </div>
            <p className="text-[9px] text-slate-400 tracking-wider">
              LAT: 12.9716°N · LON: 77.5946°E · GPS LOCK: 14 SATS · ENCRYPTED UAV LINK
            </p>
          </div>
        </div>

        {/* Center: FLIR Thermal Filter Switcher */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
          {[
            { id: 'WHITE_HOT', label: 'FLIR Thermal', color: 'text-cyan-300' },
            { id: 'NVG_GREEN', label: 'NVG Night Vision', color: 'text-emerald-400' },
            { id: 'IRONBOW', label: 'Ironbow Heatmap', color: 'text-amber-400' },
            { id: 'OPTICAL', label: 'Optical RGB', color: 'text-slate-300' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setThermalMode(mode.id as any)}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                thermalMode === mode.id
                  ? 'bg-cyan-600 text-white shadow-glow-cyan'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Right: Telemetry Chips & Close Button */}
        <div className="flex items-center gap-2">
          {/* Battery */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs">
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold text-emerald-400">{activeDrone.battery_pct}%</span>
          </div>

          {/* Searchlight Toggle */}
          <button
            onClick={() => {
              setSearchlightOn(!searchlightOn);
              if (onToggleSearchlight) onToggleSearchlight();
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              searchlightOn
                ? 'bg-amber-500 text-black shadow-glow-cyan'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3 h-3 fill-current" />
            <span>Searchlight</span>
          </button>

          {/* Exit Drone View */}
          <button
            onClick={onExitDroneView}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition border border-slate-700"
          >
            Exit FPV
          </button>
        </div>
      </div>

      {/* Center Tactical Crosshair Reticle & Flight Horizon */}
      <div className="relative flex-1 flex items-center justify-center pointer-events-none">
        {/* Center Target Box */}
        <div className="relative w-48 h-48 border border-cyan-500/40 rounded-xl flex items-center justify-center">
          {/* Corner tick marks */}
          <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
          <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />

          {/* Crosshair Center */}
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <div className="absolute w-8 h-px bg-cyan-400/60" />
          <div className="absolute h-8 w-px bg-cyan-400/60" />

          {/* Dynamic AI Target Tracking Indicator */}
          <div className="absolute -bottom-7 bg-cyan-950/90 text-cyan-300 text-[9px] px-2 py-0.5 rounded border border-cyan-500/50 font-mono whitespace-nowrap">
            FLIR AUTO-TRACK // PEDESTRIAN CROWD LOCK
          </div>
        </div>

        {/* Pitch / Roll Artificial Horizon Lines */}
        <div className="absolute left-8 top-1/2 -translate-y-1/2 space-y-3 text-[10px] text-cyan-400/80">
          <div className="flex items-center gap-2"><span>+20°</span><div className="w-12 h-px bg-cyan-500/60" /></div>
          <div className="flex items-center gap-2"><span>+10°</span><div className="w-8 h-px bg-cyan-500/40" /></div>
          <div className="flex items-center gap-2 font-bold text-cyan-300"><span>00°</span><div className="w-16 h-0.5 bg-cyan-400" /></div>
          <div className="flex items-center gap-2"><span>-10°</span><div className="w-8 h-px bg-cyan-500/40" /></div>
          <div className="flex items-center gap-2"><span>-20°</span><div className="w-12 h-px bg-cyan-500/60" /></div>
        </div>

        {/* Altitude & Speed Side Ladders */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 bg-[#090e1a]/85 backdrop-blur-md p-3 rounded-xl border border-cyan-500/30 text-xs space-y-2">
          <div>
            <span className="text-[9px] text-slate-500 uppercase font-bold block">ALTITUDE (AGL)</span>
            <span className="text-cyan-300 font-bold text-base">{activeDrone.altitude} <span className="text-xs font-normal">m</span></span>
          </div>
          <div className="h-px bg-slate-800" />
          <div>
            <span className="text-[9px] text-slate-500 uppercase font-bold block">AIRSPEED</span>
            <span className="text-cyan-300 font-bold text-base">{activeDrone.speed} <span className="text-xs font-normal">km/h</span></span>
          </div>
          <div className="h-px bg-slate-800" />
          <div>
            <span className="text-[9px] text-slate-500 uppercase font-bold block">HEADING</span>
            <span className="text-cyan-300 font-bold text-base">{activeDrone.heading}°</span>
          </div>
        </div>
      </div>

      {/* Bottom Footer: Mission Control & Waypoint Dispatch */}
      <div className="flex items-center justify-between gap-4 pointer-events-auto bg-[#070b14]/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-cyan-500/40 shadow-2xl">
        {/* Left: Tactical Mission Status */}
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-cyan-400">MISSION:</span>
          <span>
            {isBlackout
              ? 'GRID POWER CUT DETECTED · AERIAL SEARCHLIGHT ILLUMINATION & CROWD MONITORING ENGAGED'
              : 'AUTONOMOUS VENUE PATROL · SCANNING BOTTLENECKS & CONCOURSE FLOW'}
          </span>
        </div>

        {/* Right: Blackout Quick Toggle */}
        {onToggleBlackout && (
          <button
            onClick={onToggleBlackout}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              isBlackout
                ? 'bg-rose-600 text-white shadow-glow-red animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isBlackout ? '⚡ RESTORE GRID POWER' : '⚡ SIMULATE POWER CUT'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
