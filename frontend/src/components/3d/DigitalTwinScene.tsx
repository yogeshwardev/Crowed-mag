import React, { useState, useRef } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  Eye,
  Camera,
  Layers,
  Flame,
  Activity,
  Sliders,
  Maximize2,
  Users,
  ShieldAlert,
  Compass,
  RotateCcw,
  Zap
} from 'lucide-react';

import {
  Blueprint,
  TelemetrySnapshot,
  CameraViewMode,
  ViewOverlayMode
} from '../../types';
import { ProceduralVenue } from './ProceduralVenue';
import { CrowdAgents } from './CrowdAgents';
import { DensityHeatmap } from './DensityHeatmap';
import { FlowVisualizer } from './FlowVisualizer';
import { CameraManager } from './CameraManager';

interface DigitalTwinSceneProps {
  blueprint: Blueprint;
  telemetry: TelemetrySnapshot | null;
  simSpeed?: number;
  onSetSpeed?: (speed: number) => void;
  onTriggerFire?: (x: number, y: number) => void;
  onTriggerStampede?: () => void;
  onClearEmergency?: () => void;
  onToggleBlockExit?: (exitId: string) => void;
}

export const DigitalTwinScene: React.FC<DigitalTwinSceneProps> = ({
  blueprint,
  telemetry,
  simSpeed = 1.0,
  onSetSpeed,
  onTriggerFire,
  onTriggerStampede,
  onClearEmergency,
  onToggleBlockExit,
}) => {
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('overview');
  const [overlayMode, setOverlayMode] = useState<ViewOverlayMode>('3d');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.65);
  const [isPlacingFire, setIsPlacingFire] = useState<boolean>(false);
  const [fireCursor, setFireCursor] = useState<{ x: number; z: number } | null>(null);

  const orbitControlsRef = useRef<OrbitControlsImpl>(null);

  const isEmergency = telemetry?.is_emergency ?? false;
  const agents = telemetry?.agents ?? [];
  const densityGrid = telemetry?.density_grid ?? [];
  const dangerZones = telemetry?.danger_zones ?? [];
  const blockedExits = telemetry?.blocked_exits ?? [];
  const maxDensity = telemetry?.max_density ?? 0;
  const queues = telemetry?.queues ?? [];
  const bottlenecks = telemetry?.bottlenecks ?? [];

  return (
    <div className="relative w-full h-full bg-[#050810] overflow-hidden select-none">
      {/* 3D WebGL Canvas (Optimized for 60 FPS) */}
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{ powerPreference: "high-performance", antialias: true }}
        camera={{ position: [0, 75, 85], fov: 45 }}
        className={`w-full h-full ${isPlacingFire ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
      >
        <color attach="background" args={['#070b14']} />
        <fog attach="fog" args={['#070b14', 60, 220]} />

        {/* Studio Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[40, 80, 50]}
          intensity={1.3}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={220}
          shadow-camera-left={-65}
          shadow-camera-right={65}
          shadow-camera-top={65}
          shadow-camera-bottom={-65}
        />
        <pointLight position={[-40, 30, -30]} intensity={0.4} color="#38bdf8" />
        <pointLight position={[40, 30, 30]} intensity={0.3} color="#818cf8" />

        {/* Camera Transition Controller */}
        <CameraManager
          viewMode={cameraMode}
          venueWidth={blueprint.width}
          venueLength={blueprint.length}
          orbitControlsRef={orbitControlsRef}
        />

        {/* Orbit Controls (disabled while aiming fire to prevent camera drag intercepting clicks) */}
        <OrbitControls
          ref={orbitControlsRef}
          enabled={!isPlacingFire}
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2.05} // Prevent going below ground
          minDistance={5}
          maxDistance={220}
        />

        {/* Procedural Venue Geometry */}
        <ProceduralVenue
          width={blueprint.width}
          length={blueprint.length}
          elements={blueprint.elements}
          dangerZones={dangerZones}
          blockedExits={blockedExits}
          queues={queues}
          fireState={telemetry?.fire_state}
          onToggleBlockExit={onToggleBlockExit}
        />

        {/* Interactive 3D Raycasting Ground Plane for Fire Ignition */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, isPlacingFire ? 0.35 : -0.5, 0]}
          onPointerMove={(e) => {
            if (isPlacingFire && e.point) {
              setFireCursor({ x: e.point.x, z: e.point.z });
            }
          }}
          onPointerDown={(e) => {
            if (isPlacingFire && onTriggerFire && e.point) {
              e.stopPropagation();
              const bx = e.point.x + blueprint.width / 2;
              const by = e.point.z + blueprint.length / 2;
              onTriggerFire(
                Math.max(2, Math.min(blueprint.width - 2, bx)),
                Math.max(2, Math.min(blueprint.length - 2, by))
              );
              setIsPlacingFire(false);
              setFireCursor(null);
            }
          }}
        >
          <planeGeometry args={[blueprint.width + 120, blueprint.length + 120]} />
          <meshBasicMaterial transparent opacity={0.001} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>

        {/* Holographic 3D Fire Placement Target Reticle */}
        {isPlacingFire && fireCursor && (
          <group position={[fireCursor.x, 0.08, fireCursor.z]}>
            {/* Outer Pulsing Danger Ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[5.5, 6.0, 32]} />
              <meshBasicMaterial color="#ef4444" side={THREE.DoubleSide} />
            </mesh>
            {/* Inner Translucent Zone */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[5.5, 32]} />
              <meshBasicMaterial color="#ef4444" transparent opacity={0.25} side={THREE.DoubleSide} />
            </mesh>
            {/* Center Beacon */}
            <mesh position={[0, 1.2, 0]}>
              <coneGeometry args={[0.5, 2.4, 8]} />
              <meshStandardMaterial color="#f97316" emissive="#ff4500" emissiveIntensity={3.0} />
            </mesh>
          </group>
        )}

        {/* Instanced Low-Poly Human Crowd with Autonomous 60 FPS Steering Physics */}
        {overlayMode !== 'heatmap' && (
          <CrowdAgents
            agents={agents}
            venueWidth={blueprint.width}
            venueLength={blueprint.length}
            isEmergency={isEmergency}
            dangerZones={dangerZones}
            elements={blueprint.elements}
            speedMultiplier={simSpeed}
          />
        )}

        {/* Dynamic 3D Density Heatmap */}
        {(showHeatmap || overlayMode === 'heatmap') && (
          <DensityHeatmap
            densityGrid={densityGrid}
            venueWidth={blueprint.width}
            venueLength={blueprint.length}
            opacity={overlayMode === 'heatmap' ? 0.9 : heatmapOpacity}
            visible={showHeatmap || overlayMode === 'heatmap'}
          />
        )}

        {/* Animated Flow Vector Streamlines */}
        {(overlayMode === 'flow' || overlayMode === 'evacuation') && (
          <FlowVisualizer
            agents={agents}
            venueWidth={blueprint.width}
            venueLength={blueprint.length}
            isEmergency={isEmergency}
            visible={true}
          />
        )}
      </Canvas>

      {/* Top Banner when placing fire */}
      {isPlacingFire && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-30 bg-rose-950/95 border border-rose-500/80 shadow-glow-red px-5 py-2.5 rounded-2xl flex items-center gap-3 backdrop-blur-md animate-bounce">
          <Flame className="w-5 h-5 text-rose-400 animate-pulse" />
          <span className="text-xs font-extrabold text-white tracking-wide">
            🔥 CLICK ANYWHERE ON THE 3D MAP TO IGNITE FIRE
          </span>
          <button
            onClick={() => {
              if (onTriggerFire) {
                onTriggerFire(blueprint.width / 2, blueprint.length / 2);
              }
              setIsPlacingFire(false);
              setFireCursor(null);
            }}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-extrabold rounded-lg ml-2 shadow"
          >
            ⚡ Quick Ignite at Center
          </button>
          <button
            onClick={() => { setIsPlacingFire(false); setFireCursor(null); }}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg ml-1"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Top Overlay: View & Camera Controls Toolbar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10 flex-wrap gap-2">
        {/* Left: View Mode Switcher + Speed Switcher */}
        <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
          <div className="flex items-center gap-1 bg-[#0a1122]/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-2xl">
            {[
              { id: '3d', label: '3D Realistic', icon: <Layers className="w-3.5 h-3.5" /> },
              { id: 'heatmap', label: 'Heatmap View', icon: <Activity className="w-3.5 h-3.5" /> },
              { id: 'flow', label: 'Crowd Flow', icon: <Compass className="w-3.5 h-3.5" /> },
              { id: 'evacuation', label: 'Evacuation Routes', icon: <Flame className="w-3.5 h-3.5" /> },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setOverlayMode(mode.id as ViewOverlayMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  overlayMode === mode.id
                    ? 'bg-cyan-600 text-white shadow-glow-cyan'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {mode.icon}
                <span>{mode.label}</span>
              </button>
            ))}
          </div>

          {/* Speed Controls on 3D View */}
          {onSetSpeed && (
            <div className="flex items-center gap-1 bg-[#0a1122]/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-2xl">
              <div className="flex items-center gap-1 px-1.5 text-[10px] uppercase font-extrabold text-amber-400">
                <Zap className="w-3 h-3" />
                <span>Speed</span>
              </div>
              {[1, 1.5, 2, 2.5, 3].map((s) => (
                <button
                  key={s}
                  onClick={() => onSetSpeed(s)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition ${
                    simSpeed === s
                      ? 'bg-amber-500 text-black shadow-glow-cyan font-black'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Camera Viewpoints Switcher */}
        <div className="flex items-center gap-1 bg-[#0a1122]/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-2xl pointer-events-auto overflow-x-auto">
          <div className="flex items-center gap-1 px-2 text-[10px] uppercase font-bold text-slate-500">
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>Camera</span>
          </div>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'entrance', label: 'Entrance' },
            { id: 'checkpoint', label: 'Turnstiles' },
            { id: 'top', label: 'Top View' },
            { id: 'ground', label: 'Ground' },
            { id: 'cctv_01', label: '📹 CAM-1' },
            { id: 'cctv_02', label: '📹 CAM-2' },
            { id: 'cctv_03', label: '📹 CAM-3' },
            { id: 'cctv_04', label: '📹 CAM-4' },
          ].map((cam) => (
            <button
              key={cam.id}
              onClick={() => setCameraMode(cam.id as CameraViewMode)}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                cameraMode === cam.id
                  ? 'bg-slate-700 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {cam.label}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Left: Heatmap & Layer Controls */}
      <div className="absolute top-20 left-4 bg-[#0a1122]/85 backdrop-blur-md p-3 rounded-xl border border-slate-800 shadow-xl space-y-3 z-10 w-56">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Heatmap Overlay</span>
          </span>
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`w-8 h-4 rounded-full transition-colors relative ${
              showHeatmap ? 'bg-cyan-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                showHeatmap ? 'right-0.5' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {showHeatmap && (
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Opacity:</span>
              <span className="font-mono text-cyan-300">{Math.round(heatmapOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={heatmapOpacity}
              onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        )}

        {/* Heatmap Density Legend */}
        <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[10px]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> &lt; 2.0 p/m²
            </span>
            <span className="text-slate-500">Normal</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> 2.0 - 3.5 p/m²
            </span>
            <span className="text-slate-500">Moderate</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-orange-400">
              <span className="w-2 h-2 rounded-full bg-orange-500" /> 3.5 - 4.5 p/m²
            </span>
            <span className="text-slate-500">Warning</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-rose-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" /> &gt; 4.5 p/m²
            </span>
            <span className="text-rose-400">Critical</span>
          </div>
        </div>
      </div>

      {/* Floating Right: Live Bottleneck Warning Markers */}
      {bottlenecks.length > 0 && (
        <div className="absolute top-20 right-4 bg-[#180d12]/90 backdrop-blur-md p-3 rounded-xl border border-rose-800/60 shadow-glow-red space-y-2 z-10 w-72">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 animate-bounce" />
            <span>Bottleneck Detected ({bottlenecks.length})</span>
          </div>
          {bottlenecks.slice(0, 2).map((b) => (
            <div key={b.id} className="p-2 rounded bg-rose-950/50 border border-rose-800/40 text-[11px] space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-200">
                <span>{b.location_name}</span>
                <span className="px-1.5 py-0.5 rounded bg-rose-600/60 text-white font-mono text-[9px]">
                  {b.severity}
                </span>
              </div>
              <p className="text-slate-400 leading-tight">{b.reason}</p>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Emergency Quick Action Overlay */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
        {/* Peak Density Chip */}
        <div className="pointer-events-auto bg-[#0a1120]/90 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-4 text-xs flex-wrap">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Peak Density</span>
            <span className={`font-mono font-bold text-sm ${maxDensity >= 4.0 ? 'text-rose-400' : maxDensity >= 2.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {maxDensity.toFixed(2)} <span className="text-[10px] text-slate-500">p/m²</span>
            </span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Active Agents</span>
            <span className="font-mono font-bold text-sm text-cyan-300">
              {agents.filter(a => a.state !== 'SAFE').length.toLocaleString()}
            </span>
          </div>
          {telemetry?.panic_agent_count && telemetry.panic_agent_count > 0 ? (
            <>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Panicking</span>
                <span className="font-mono font-bold text-sm text-rose-400 animate-pulse">
                  {telemetry.panic_agent_count.toLocaleString()}
                </span>
              </div>
            </>
          ) : null}
          {telemetry?.stumbling_agent_count && telemetry.stumbling_agent_count > 0 ? (
            <>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Fallen / Stumbling</span>
                <span className="font-mono font-bold text-sm text-amber-400 animate-bounce">
                  {telemetry.stumbling_agent_count}
                </span>
              </div>
            </>
          ) : null}
          {telemetry?.peak_crush_pressure_n && telemetry.peak_crush_pressure_n > 500 ? (
            <>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Crush Force</span>
                <span className="font-mono font-bold text-sm text-rose-300">
                  {telemetry.peak_crush_pressure_n.toFixed(0)} <span className="text-[9px] text-slate-500">N/m</span>
                </span>
              </div>
            </>
          ) : null}
          {telemetry?.fire_state?.is_active ? (
            <>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">🔥 Fire Peak Temp</span>
                <span className="font-mono font-bold text-sm text-orange-400 animate-pulse">
                  {telemetry.fire_state.peak_temperature_c.toFixed(0)}°C
                </span>
              </div>
            </>
          ) : null}
        </div>

        {/* Emergency & Stampede Trigger Buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          {isEmergency ? (
            <button
              onClick={onClearEmergency}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-glow-green transition active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>CLEAR EMERGENCY & RESTORE FLOW</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => onTriggerStampede && onTriggerStampede()}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-glow-red transition active:scale-95"
              >
                <Zap className="w-4 h-4" />
                <span>⚡ TRIGGER STAMPEDE</span>
              </button>

              <button
                onClick={() => setIsPlacingFire(!isPlacingFire)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95 border ${
                  isPlacingFire
                    ? 'bg-rose-600 text-white border-rose-400 shadow-glow-red animate-pulse'
                    : 'bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border-rose-800/80'
                }`}
              >
                <Flame className="w-4 h-4 text-rose-400" />
                <span>{isPlacingFire ? 'CLICK 3D MAP TO IGNITE FIRE' : 'IGNITE FIRE'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
