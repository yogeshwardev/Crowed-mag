import React, { useState, useEffect } from 'react';
import {
  Video,
  ShieldAlert,
  Activity,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Radio,
  Eye,
  Crosshair,
  TrendingUp,
  RotateCcw,
  Zap,
  Users,
  Compass
} from 'lucide-react';
import { TelemetrySnapshot, CCTVCameraFeed, VisionAnomaly } from '../../types';
import { api } from '../../utils/api';

interface CCTVMonitorModalProps {
  telemetry: TelemetrySnapshot | null;
  onSelectCameraView?: (camId: string) => void;
}

export const CCTVMonitorModal: React.FC<CCTVMonitorModalProps> = ({
  telemetry,
  onSelectCameraView,
}) => {
  const [visionData, setVisionData] = useState<any>(telemetry?.vision_analytics || null);
  const [selectedCamId, setSelectedCamId] = useState<string | null>(null);
  const [showOpticalFlow, setShowOpticalFlow] = useState<boolean>(true);
  const [showBBoxes, setShowBBoxes] = useState<boolean>(true);

  // Poll vision analytics or use telemetry stream
  useEffect(() => {
    if (telemetry?.vision_analytics) {
      setVisionData(telemetry.vision_analytics);
    }
  }, [telemetry]);

  useEffect(() => {
    const fetchCCTV = async () => {
      try {
        const data = await api.getCCTVAnalytics();
        if (data && data.cameras) {
          setVisionData(data);
        }
      } catch (err) {}
    };
    fetchCCTV();
    const interval = setInterval(fetchCCTV, 2500);
    return () => clearInterval(interval);
  }, []);

  const cameras: CCTVCameraFeed[] = visionData?.cameras || [
    {
      id: 'cam_01',
      name: 'CAM-01: North Gate & Security Turnstiles',
      x: 20,
      y: 14,
      height: 7.5,
      fov_deg: 75,
      range: 25,
      fps: 30,
      resolution: '1080p',
      tracked_count: 32,
      average_speed: 1.25,
      turbulence_index: 0.42,
      optical_flow_div: 0.12,
      optical_flow_curl: 0.05,
      status: 'NORMAL',
      bounding_boxes: []
    },
    {
      id: 'cam_02',
      name: 'CAM-02: Grand Central Concourse',
      x: 60,
      y: 40,
      height: 9.0,
      fov_deg: 90,
      range: 35,
      fps: 30,
      resolution: '4K',
      tracked_count: 58,
      average_speed: 1.18,
      turbulence_index: 0.65,
      optical_flow_div: -0.22,
      optical_flow_curl: 0.14,
      status: 'NORMAL',
      bounding_boxes: []
    },
    {
      id: 'cam_03',
      name: 'CAM-03: East Stand Grandstand Corridor',
      x: 98,
      y: 40,
      height: 8.0,
      fov_deg: 80,
      range: 28,
      fps: 30,
      resolution: '1080p',
      tracked_count: 24,
      average_speed: 1.35,
      turbulence_index: 0.38,
      optical_flow_div: 0.08,
      optical_flow_curl: 0.02,
      status: 'NORMAL',
      bounding_boxes: []
    },
    {
      id: 'cam_04',
      name: 'CAM-04: Emergency Exit Gate Bravo',
      x: 60,
      y: 72,
      height: 7.0,
      fov_deg: 70,
      range: 22,
      fps: 30,
      resolution: '1080p',
      tracked_count: 16,
      average_speed: 1.10,
      turbulence_index: 0.25,
      optical_flow_div: 0.04,
      optical_flow_curl: 0.01,
      status: 'NORMAL',
      bounding_boxes: []
    }
  ];

  const anomalies: VisionAnomaly[] = visionData?.anomalies || [];
  const globalTurbulence = visionData?.global_turbulence ?? 0.45;
  const isEmergency = telemetry?.is_emergency ?? false;

  return (
    <div className="h-full w-full bg-[#080c14] overflow-y-auto p-3 sm:p-5 lg:p-6 space-y-4 lg:space-y-6 select-none">
      {/* Header Banner */}
      <div className="bg-[#0e1626]/90 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  AI Computer Vision & Surveillance Grid
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 animate-pulse">
                  LIVE 30 FPS
                </span>
              </div>
              <h2 className="text-sm font-bold text-slate-100">
                Multi-Camera Optical Flow & Anomaly Detection Wall
              </h2>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBBoxes(!showBBoxes)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                showBBoxes
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-glow-cyan'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5 inline mr-1.5" />
              AI Bounding Boxes
            </button>
            <button
              onClick={() => setShowOpticalFlow(!showOpticalFlow)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                showOpticalFlow
                  ? 'bg-amber-600 text-white border-amber-400 shadow-glow-amber'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5 inline mr-1.5" />
              Optical Flow
            </button>
          </div>
        </div>
      </div>

      {/* 4-Quadrant CCTV Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cameras.map((cam, idx) => {
          const isCritical = cam.status === 'STAMPEDE_SURGE' || cam.status === 'FALLEN_OBSTRUCTION';
          const isWarning = cam.status === 'TURBULENT_COUNTERFLOW' || cam.status === 'HIGH_CONGESTION';

          return (
            <div
              key={cam.id}
              className={`rounded-2xl border overflow-hidden transition-all bg-[#090f1d] ${
                isCritical
                  ? 'border-rose-600/80 shadow-glow-red'
                  : isWarning
                  ? 'border-amber-600/60'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Camera Header Bar */}
              <div className="px-3.5 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isCritical ? 'bg-rose-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
                  <span className="text-xs font-bold text-slate-200">{cam.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500">{cam.resolution} · {cam.fps}fps</span>
                  {onSelectCameraView && (
                    <button
                      onClick={() => onSelectCameraView(cam.id)}
                      className="p-1 bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white rounded transition"
                      title="Switch 3D View to this CCTV Camera"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Simulated Camera Viewport */}
              <div className="relative h-56 bg-slate-950 flex items-center justify-center overflow-hidden">
                {/* Scanlines & Grid Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40" />
                <div className="absolute inset-0 border-[0.5px] border-cyan-500/10 pointer-events-none" />

                {/* Perspective Arena Simulation Preview */}
                <div className="w-full h-full p-4 relative flex flex-col justify-between">
                  {/* Top telemetry text inside video */}
                  <div className="flex justify-between text-[10px] font-mono text-emerald-400/90 z-10">
                    <span>REC ● {new Date().toLocaleTimeString()}</span>
                    <span>TRACKED: {cam.tracked_count} PERSONS</span>
                  </div>

                  {/* Simulated Vision Bounding Boxes */}
                  {showBBoxes && (
                    <div className="absolute inset-6 flex flex-wrap items-center justify-around pointer-events-none">
                      {cam.bounding_boxes && cam.bounding_boxes.length > 0 ? (
                        cam.bounding_boxes.slice(0, 8).map((box, bIdx) => (
                          <div
                            key={bIdx}
                            className={`p-1 border rounded text-[8px] font-mono flex flex-col gap-0.5 backdrop-blur-sm ${
                              box.tag === 'PERSON_SPRINTING'
                                ? 'border-rose-500 bg-rose-950/40 text-rose-300 animate-pulse'
                                : box.tag === 'PERSON_FALLEN'
                                ? 'border-amber-500 bg-amber-950/60 text-amber-300 font-bold'
                                : 'border-cyan-500/70 bg-cyan-950/30 text-cyan-300'
                            }`}
                          >
                            <span>ID#{box.id} {box.tag.replace('PERSON_', '')}</span>
                            <span className="opacity-70">{box.speed} m/s ({(box.confidence * 100).toFixed(0)}%)</span>
                          </div>
                        ))
                      ) : (
                        Array.from({ length: Math.min(6, Math.max(2, Math.floor(cam.tracked_count / 4))) }).map((_, bIdx) => (
                          <div
                            key={bIdx}
                            className="p-1 border border-cyan-500/60 bg-cyan-950/20 rounded text-[8px] font-mono text-cyan-300"
                          >
                            <span>ID#{100 + bIdx} PERSON</span>
                            <span className="opacity-70">1.28 m/s (96%)</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Optical Flow Indicators */}
                  {showOpticalFlow && (
                    <div className="absolute bottom-3 right-3 bg-slate-900/90 border border-slate-800 rounded-lg p-2 text-[9px] font-mono space-y-0.5 z-10">
                      <div className="text-slate-400">FLOW DIVERGENCE: <span className={cam.optical_flow_div > 0.5 ? 'text-rose-400 font-bold' : 'text-cyan-300'}>{cam.optical_flow_div.toFixed(2)}</span></div>
                      <div className="text-slate-400">FLOW VORTICITY: <span className={cam.optical_flow_curl > 0.5 ? 'text-amber-400' : 'text-cyan-300'}>{cam.optical_flow_curl.toFixed(2)}</span></div>
                      <div className="text-slate-400">TURBULENCE INDEX: <span className={cam.turbulence_index > 1.2 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>{cam.turbulence_index.toFixed(2)}</span></div>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="z-10 flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      isCritical
                        ? 'bg-rose-600 text-white animate-pulse'
                        : isWarning
                        ? 'bg-amber-600/80 text-amber-100'
                        : 'bg-slate-800/80 text-emerald-400'
                    }`}>
                      {cam.status}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">AVG SPD: {cam.average_speed} m/s</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-Time Vision Anomaly Feed */}
      <div className="bg-[#0e1626]/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Real-Time AI Vision Anomaly Log ({anomalies.length} active events)
          </span>
        </div>

        {anomalies.length > 0 ? (
          <div className="space-y-2">
            {anomalies.map((anom, aIdx) => (
              <div
                key={aIdx}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs gap-3"
              >
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className={`w-4 h-4 mt-0.5 ${anom.severity === 'CRITICAL' ? 'text-rose-400 animate-bounce' : 'text-amber-400'}`} />
                  <div>
                    <div className="font-bold text-slate-200 flex items-center gap-2">
                      <span>{anom.camera_name}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono ${
                        anom.severity === 'CRITICAL' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-amber-100'
                      }`}>
                        {anom.type}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5">{anom.description}</p>
                  </div>
                </div>
                <div className="text-right font-mono text-[10px] text-slate-500 shrink-0">
                  <div>Confidence: <span className="text-cyan-300 font-bold">{(anom.confidence * 100).toFixed(0)}%</span></div>
                  <div>Detected at {new Date(anom.timestamp * 1000).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs font-mono">
            No critical computer vision anomalies detected. Optical flow and crowd velocity fields are nominal.
          </div>
        )}
      </div>
    </div>
  );
};
