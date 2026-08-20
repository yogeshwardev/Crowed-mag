import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Layers,
  Activity,
  BrainCircuit,
  Flame,
  GitFork,
  BarChart3,
  Compass,
  Radio,
  Zap,
  Video
} from 'lucide-react';
import { NavigationTab, TelemetrySnapshot } from '../../types';

interface HeaderProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  telemetry: TelemetrySnapshot | null;
  venueName: string;
  simSpeed: number;
  onSetSpeed: (s: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  telemetry,
  venueName,
  simSpeed,
  onSetSpeed
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isEmergency = telemetry?.is_emergency ?? false;
  const isCompleted = telemetry?.evacuation?.is_completed || (isEmergency && telemetry?.evacuation?.remaining_people === 0 && telemetry?.evacuation?.total_people > 0);
  const activeCrowd = isEmergency
    ? (telemetry?.evacuation?.remaining_people ?? telemetry?.active_agent_count ?? 0)
    : (telemetry?.capacity?.current_occupancy ?? telemetry?.active_agent_count ?? 0);

  const navItems: { id: NavigationTab; label: string; short: string; icon: React.ReactNode }[] = [
    { id: 'digital_twin', label: '3D Digital Twin', short: '3D Twin', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'blueprint_studio', label: 'Blueprint Studio', short: 'CAD', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'live_simulation', label: 'Live Simulation', short: 'Simulation', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'ai_safety', label: 'AI Safety', short: 'AI', icon: <BrainCircuit className="w-3.5 h-3.5" /> },
    { id: 'cctv_surveillance', label: 'CCTV AI Vision', short: 'CCTV', icon: <Video className="w-3.5 h-3.5" /> },
    { id: 'emergency_control', label: 'Emergency', short: 'Emergency', icon: <Flame className="w-3.5 h-3.5" /> },
    { id: 'what_if_lab', label: 'What-If Lab', short: 'What-If', icon: <GitFork className="w-3.5 h-3.5" /> },
    { id: 'analytics_reports', label: 'Analytics', short: 'Reports', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ];

  const speedOptions = [1, 2, 2.5, 3];

  return (
    <header className={`bg-[#090e1a]/95 border-b backdrop-blur-md flex flex-col z-30 shrink-0 select-none transition-colors ${
      isEmergency ? 'border-red-800/80' : 'border-slate-800/80'
    }`}>
      {/* Top Row: Brand + Speed + Status */}
      <div className="px-3 md:px-5 py-2 flex items-center justify-between gap-2 min-h-[52px]">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className={`p-1.5 rounded-lg ${isEmergency ? 'bg-red-500/20 text-red-400 animate-pulse border border-red-500/40' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'}`}>
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-wider text-slate-100 uppercase">
                CrowdSafe <span className="text-cyan-400 font-black">AI</span>
              </span>
              <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700">
                v2.4
              </span>
            </div>
            <p className="text-[9px] tracking-widest text-slate-500 uppercase font-medium hidden md:block">
              Intelligent Crowd Management · Digital Twin
            </p>
          </div>
        </div>

        {/* Center: Simulation Speed Controls */}
        <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-xl px-2 py-1">
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider hidden sm:block">Speed</span>
          <div className="flex items-center gap-1">
            {speedOptions.map(s => (
              <button
                key={s}
                onClick={() => onSetSpeed(s)}
                className={`px-2 py-1 rounded-lg text-[11px] font-extrabold font-mono transition ${
                  simSpeed === s
                    ? 'bg-amber-500 text-black shadow-glow-cyan'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Right: Status + Crowd + Time */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Emergency / Online Badge */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-mono ${
            isCompleted
              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-600'
              : isEmergency
              ? 'bg-red-950/40 text-red-400 border-red-800/60'
              : 'bg-emerald-950/30 text-emerald-400 border-emerald-800/50'
          }`}>
            <Radio className={`w-3 h-3 ${isCompleted ? '' : isEmergency ? 'animate-spin' : 'animate-pulse'}`} />
            <span className="font-bold hidden sm:block">
              {isCompleted ? 'ALL EVACUATED' : isEmergency ? 'EMERGENCY' : 'ONLINE'}
            </span>
          </div>

          {/* Venue Name */}
          <div className="hidden lg:flex flex-col text-right">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider">Venue</span>
            <span className="text-[11px] font-semibold text-slate-200 max-w-[120px] truncate">{venueName}</span>
          </div>

          {/* Live Crowd Count */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border font-mono text-xs ${
            isCompleted
              ? 'bg-emerald-950/40 border-emerald-700/80 text-emerald-300'
              : isEmergency
              ? 'bg-rose-950/40 border-rose-700/80 text-rose-300'
              : 'bg-slate-900/80 border-slate-700 text-slate-200'
          }`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${isCompleted ? 'bg-emerald-400' : isEmergency ? 'bg-rose-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
            <span className="font-bold text-sm">{activeCrowd.toLocaleString()}</span>
            <span className="text-slate-400 hidden sm:block">{isEmergency ? 'remaining' : 'people'}</span>
          </div>

          {/* Clock */}
          <div className="hidden md:block px-2 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 font-mono text-xs text-cyan-300 font-bold">
            {timeStr}
          </div>
        </div>
      </div>

      {/* Bottom Row: Navigation Tabs */}
      <nav className="px-2 pb-1.5 flex items-center gap-0.5 overflow-x-auto scrollbar-none">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 whitespace-nowrap shrink-0 ${
                isActive
                  ? item.id === 'emergency_control' && isEmergency
                    ? 'bg-red-600 text-white shadow-glow-red'
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-glow-cyan'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {item.icon}
              <span className="hidden sm:block">{item.label}</span>
              <span className="sm:hidden">{item.short}</span>
              {item.id === 'emergency_control' && isEmergency && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
