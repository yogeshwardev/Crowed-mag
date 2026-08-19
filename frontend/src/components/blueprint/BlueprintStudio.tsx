import React, { useState, useRef, useEffect } from 'react';
import {
  Square,
  Shield,
  Ticket,
  DoorOpen,
  LogOut,
  AlertTriangle,
  PlusCircle,
  Trash2,
  RotateCw,
  Copy,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Grid,
  Save,
  Play,
  Crosshair,
  Building,
  Footprints,
  HeartPulse,
  Flame,
  Maximize2,
  Sparkles,
  Layers,
  Compass,
  Sliders,
  Settings,
  Split,
  Eye,
  Check,
  FolderOpen,
  ArrowRight
} from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Blueprint, BlueprintElement, ElementType, TelemetrySnapshot } from '../../types';
import { api } from '../../utils/api';
import { ProceduralVenue } from '../3d/ProceduralVenue';
import { CrowdAgents } from '../3d/CrowdAgents';
import { generateInitialTelemetry } from '../../utils/presets';

interface BlueprintStudioProps {
  currentBlueprint: Blueprint;
  onSyncDigitalTwin: (blueprint: Blueprint) => void;
  onLoadPreset: (presetType: string) => void;
  onOpen3DView?: () => void;
}

const TOOL_CONFIG: Record<
  ElementType,
  { label: string; color: string; stroke: string; defaultW: number; defaultH: number; icon: React.ReactNode }
> = {
  wall: { label: 'Wall / Barrier', color: 'rgba(71, 85, 105, 0.9)', stroke: '#94a3b8', defaultW: 20, defaultH: 2, icon: <Square className="w-3.5 h-3.5" /> },
  road: { label: 'Road / Avenue', color: 'rgba(30, 41, 59, 0.7)', stroke: '#475569', defaultW: 30, defaultH: 10, icon: <Footprints className="w-3.5 h-3.5" /> },
  open_space: { label: 'Open Space / Pitch', color: 'rgba(16, 185, 129, 0.25)', stroke: '#10b981', defaultW: 46, defaultH: 30, icon: <Maximize2 className="w-3.5 h-3.5" /> },
  stage: { label: 'Performance Stage', color: 'rgba(234, 88, 12, 0.4)', stroke: '#ea580c', defaultW: 25, defaultH: 12, icon: <Sparkles className="w-3.5 h-3.5" /> },
  barricade: { label: 'Queue Barricade', color: 'rgba(234, 179, 8, 0.7)', stroke: '#facc15', defaultW: 10, defaultH: 0.8, icon: <Square className="w-3.5 h-3.5" /> },
  restricted: { label: 'Restricted Zone', color: 'rgba(220, 38, 38, 0.3)', stroke: '#ef4444', defaultW: 15, defaultH: 10, icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  seating: { label: 'Seating Stand (Tiered)', color: 'rgba(59, 130, 246, 0.4)', stroke: '#3b82f6', defaultW: 50, defaultH: 10, icon: <Layers className="w-3.5 h-3.5" /> },
  building: { label: 'Building / Hall', color: 'rgba(51, 65, 85, 0.8)', stroke: '#64748b', defaultW: 25, defaultH: 18, icon: <Building className="w-3.5 h-3.5" /> },
  security: { label: 'Security Checkpoint', color: 'rgba(6, 182, 212, 0.4)', stroke: '#06b6d4', defaultW: 18, defaultH: 3, icon: <Shield className="w-3.5 h-3.5" /> },
  ticket_counter: { label: 'Ticket Counter', color: 'rgba(139, 92, 246, 0.4)', stroke: '#8b5cf6', defaultW: 12, defaultH: 3, icon: <Ticket className="w-3.5 h-3.5" /> },
  entry_gate: { label: 'Entry Turnstile', color: 'rgba(34, 197, 94, 0.5)', stroke: '#22c55e', defaultW: 10, defaultH: 2, icon: <DoorOpen className="w-3.5 h-3.5" /> },
  exit_gate: { label: 'Exit Gate', color: 'rgba(249, 115, 22, 0.5)', stroke: '#f97316', defaultW: 10, defaultH: 2, icon: <LogOut className="w-3.5 h-3.5" /> },
  emergency_exit: { label: 'Emergency Exit', color: 'rgba(239, 68, 68, 0.7)', stroke: '#ef4444', defaultW: 8, defaultH: 2, icon: <Flame className="w-3.5 h-3.5" /> },
  medical: { label: 'Medical Camp', color: 'rgba(244, 63, 94, 0.4)', stroke: '#f43f5e', defaultW: 10, defaultH: 6, icon: <HeartPulse className="w-3.5 h-3.5" /> },
  police: { label: 'Police Post', color: 'rgba(37, 99, 235, 0.4)', stroke: '#2563eb', defaultW: 10, defaultH: 6, icon: <Shield className="w-3.5 h-3.5" /> },
  parking: { label: 'Parking Area', color: 'rgba(75, 85, 99, 0.4)', stroke: '#6b7280', defaultW: 25, defaultH: 15, icon: <Square className="w-3.5 h-3.5" /> },
  food_stall: { label: 'Food Stall / Cafe', color: 'rgba(217, 119, 6, 0.4)', stroke: '#d97706', defaultW: 10, defaultH: 5, icon: <Square className="w-3.5 h-3.5" /> },
  restroom: { label: 'Restroom Facility', color: 'rgba(20, 184, 166, 0.4)', stroke: '#14b8a6', defaultW: 8, defaultH: 5, icon: <Square className="w-3.5 h-3.5" /> },
  vip_area: { label: 'VIP Enclosure', color: 'rgba(168, 85, 247, 0.4)', stroke: '#a855f7', defaultW: 20, defaultH: 10, icon: <Shield className="w-3.5 h-3.5" /> }
};

export const BlueprintStudio: React.FC<BlueprintStudioProps> = ({
  currentBlueprint,
  onSyncDigitalTwin,
  onLoadPreset,
  onOpen3DView
}) => {
  const [blueprint, setBlueprint] = useState<Blueprint>(currentBlueprint);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ElementType | 'select'>('select');
  const [zoom, setZoom] = useState<number>(6.5); // pixels per meter
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 30, y: 30 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [gridSize, setGridSize] = useState<number>(2.0); // 2 meters grid
  const [history, setHistory] = useState<Blueprint[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [showSplit3D, setShowSplit3D] = useState<boolean>(false);
  const [showVenueSettings, setShowVenueSettings] = useState<boolean>(false);

  // Live preview telemetry for 3D split screen
  const [previewTelemetry, setPreviewTelemetry] = useState<TelemetrySnapshot>(() => generateInitialTelemetry(currentBlueprint));

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Drag and Resize State
  const [dragState, setDragState] = useState<{
    elementId: string;
    startX: number;
    startY: number;
    elemOrigX: number;
    elemOrigY: number;
  } | null>(null);

  const [resizeState, setResizeState] = useState<{
    elementId: string;
    handle: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  useEffect(() => {
    setBlueprint(currentBlueprint);
    setPreviewTelemetry(generateInitialTelemetry(currentBlueprint));
  }, [currentBlueprint]);

  const pushHistory = (newBp: Blueprint) => {
    const updated = history.slice(0, historyIdx + 1);
    updated.push(JSON.parse(JSON.stringify(newBp)));
    setHistory(updated);
    setHistoryIdx(updated.length - 1);
    setPreviewTelemetry(generateInitialTelemetry(newBp));
  };

  const handleUndo = () => {
    if (historyIdx > 0) {
      setHistoryIdx(historyIdx - 1);
      const prev = JSON.parse(JSON.stringify(history[historyIdx - 1]));
      setBlueprint(prev);
      setPreviewTelemetry(generateInitialTelemetry(prev));
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(historyIdx + 1);
      const next = JSON.parse(JSON.stringify(history[historyIdx + 1]));
      setBlueprint(next);
      setPreviewTelemetry(generateInitialTelemetry(next));
    }
  };

  // Convert screen coordinates to world meters
  const screenToWorld = (screenX: number, screenY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = (screenX - rect.left - pan.x) / zoom;
    const y = (screenY - rect.top - pan.y) / zoom;
    return {
      x: snapToGrid ? Math.round(x / gridSize) * gridSize : x,
      y: snapToGrid ? Math.round(y / gridSize) * gridSize : y
    };
  };

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 1 || e.altKey) {
      // Middle click or Alt -> Pan
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (activeTool === 'select') {
      if (e.target === svgRef.current) {
        setSelectedElementId(null);
      }
      return;
    }

    // Place element with active tool
    const worldPos = screenToWorld(e.clientX, e.clientY);
    const cfg = TOOL_CONFIG[activeTool];
    const newElement: BlueprintElement = {
      id: `el_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: activeTool,
      x: Math.max(cfg.defaultW / 2, Math.min(blueprint.width - cfg.defaultW / 2, worldPos.x)),
      y: Math.max(cfg.defaultH / 2, Math.min(blueprint.length - cfg.defaultH / 2, worldPos.y)),
      width: cfg.defaultW,
      height: cfg.defaultH,
      rotation: 0,
      label: `${cfg.label} ${blueprint.elements.length + 1}`,
      capacity_rate: activeTool === 'entry_gate' || activeTool === 'security' ? 120 : undefined
    };

    const updatedBp = {
      ...blueprint,
      elements: [...blueprint.elements, newElement]
    };
    setBlueprint(updatedBp);
    pushHistory(updatedBp);
    setSelectedElementId(newElement.id);
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (dragState) {
      const currentWorld = screenToWorld(e.clientX, e.clientY);
      const startWorld = screenToWorld(dragState.startX, dragState.startY);
      const dx = currentWorld.x - startWorld.x;
      const dy = currentWorld.y - startWorld.y;

      const updated = blueprint.elements.map(el => {
        if (el.id === dragState.elementId) {
          let newX = dragState.elemOrigX + dx;
          let newY = dragState.elemOrigY + dy;
          if (snapToGrid) {
            newX = Math.round(newX / gridSize) * gridSize;
            newY = Math.round(newY / gridSize) * gridSize;
          }
          return {
            ...el,
            x: Math.max(el.width / 2, Math.min(blueprint.width - el.width / 2, newX)),
            y: Math.max(el.height / 2, Math.min(blueprint.length - el.height / 2, newY))
          };
        }
        return el;
      });
      setBlueprint({ ...blueprint, elements: updated });
      return;
    }

    if (resizeState) {
      const currentWorld = screenToWorld(e.clientX, e.clientY);
      const startWorld = screenToWorld(resizeState.startX, resizeState.startY);
      const dx = currentWorld.x - startWorld.x;
      const dy = currentWorld.y - startWorld.y;

      const updated = blueprint.elements.map(el => {
        if (el.id === resizeState.elementId) {
          let newW = resizeState.origW;
          let newH = resizeState.origH;
          let newX = resizeState.origX;
          let newY = resizeState.origY;

          if (resizeState.handle.includes('e')) {
            newW = Math.max(2, resizeState.origW + dx * 2);
          }
          if (resizeState.handle.includes('w')) {
            newW = Math.max(2, resizeState.origW - dx * 2);
          }
          if (resizeState.handle.includes('s')) {
            newH = Math.max(1, resizeState.origH + dy * 2);
          }
          if (resizeState.handle.includes('n')) {
            newH = Math.max(1, resizeState.origH - dy * 2);
          }

          if (snapToGrid) {
            newW = Math.round(newW / gridSize) * gridSize;
            newH = Math.round(newH / gridSize) * gridSize;
          }

          return {
            ...el,
            width: newW,
            height: newH,
            x: newX,
            y: newY
          };
        }
        return el;
      });
      setBlueprint({ ...blueprint, elements: updated });
    }
  };

  const handleSvgMouseUp = () => {
    if (isPanning) setIsPanning(false);
    if (dragState) {
      pushHistory(blueprint);
      setDragState(null);
    }
    if (resizeState) {
      pushHistory(blueprint);
      setResizeState(null);
    }
  };

  const handleElementMouseDown = (e: React.MouseEvent, el: BlueprintElement) => {
    e.stopPropagation();
    setSelectedElementId(el.id);
    if (activeTool === 'select') {
      setDragState({
        elementId: el.id,
        startX: e.clientX,
        startY: e.clientY,
        elemOrigX: el.x,
        elemOrigY: el.y
      });
    }
  };

  const handleResizeHandleMouseDown = (e: React.MouseEvent, el: BlueprintElement, handle: any) => {
    e.stopPropagation();
    setResizeState({
      elementId: el.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      origX: el.x,
      origY: el.y,
      origW: el.width,
      origH: el.height
    });
  };

  const handleDeleteSelected = () => {
    if (!selectedElementId) return;
    const updated = {
      ...blueprint,
      elements: blueprint.elements.filter(e => e.id !== selectedElementId)
    };
    setBlueprint(updated);
    pushHistory(updated);
    setSelectedElementId(null);
  };

  const handleDuplicateSelected = () => {
    if (!selectedElementId) return;
    const el = blueprint.elements.find(e => e.id === selectedElementId);
    if (!el) return;
    const dup: BlueprintElement = {
      ...JSON.parse(JSON.stringify(el)),
      id: `el_${Date.now()}`,
      x: Math.min(blueprint.width - el.width / 2, el.x + 4),
      y: Math.min(blueprint.length - el.height / 2, el.y + 4),
      label: `${el.label || el.type} (Copy)`
    };
    const updated = {
      ...blueprint,
      elements: [...blueprint.elements, dup]
    };
    setBlueprint(updated);
    pushHistory(updated);
    setSelectedElementId(dup.id);
  };

  const handleRotateSelected = () => {
    if (!selectedElementId) return;
    const updated = {
      ...blueprint,
      elements: blueprint.elements.map(el => {
        if (el.id === selectedElementId) {
          return {
            ...el,
            width: el.height,
            height: el.width,
            rotation: ((el.rotation || 0) + 90) % 360
          };
        }
        return el;
      })
    };
    setBlueprint(updated);
    pushHistory(updated);
  };

  const updateSelectedElement = (partial: Partial<BlueprintElement>) => {
    if (!selectedElementId) return;
    const updated = {
      ...blueprint,
      elements: blueprint.elements.map(el => {
        if (el.id === selectedElementId) {
          return { ...el, ...partial };
        }
        return el;
      })
    };
    setBlueprint(updated);
    pushHistory(updated);
  };

  const handleBuildDigitalTwin = async () => {
    setIsSyncing(true);
    setStatusMsg('Compiling 2D blueprint to 3D Digital Twin...');
    try {
      await api.loadBlueprint(blueprint);
      onSyncDigitalTwin(blueprint);
      setStatusMsg('✓ Digital Twin successfully updated!');
      setTimeout(() => {
        setStatusMsg('');
        if (onOpen3DView) onOpen3DView();
      }, 1200);
    } catch (err) {
      onSyncDigitalTwin(blueprint);
      setStatusMsg('✓ Local 3D Twin Updated!');
      setTimeout(() => setStatusMsg(''), 2500);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveToDb = async () => {
    try {
      await api.saveBlueprint(blueprint);
      setStatusMsg('✓ Blueprint saved to database');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      setStatusMsg('Failed to save blueprint');
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all blueprint elements?')) {
      const cleared = { ...blueprint, elements: [] };
      setBlueprint(cleared);
      pushHistory(cleared);
      setSelectedElementId(null);
    }
  };

  // Area & capacity metrics
  const totalArea = blueprint.width * blueprint.length;
  const obstructedArea = blueprint.elements.reduce((acc, el) => {
    if (['wall', 'building', 'restricted', 'stage'].includes(el.type)) {
      return acc + (el.width * el.height);
    }
    return acc;
  }, 0);
  const usableArea = Math.max(50, totalArea - obstructedArea);
  const safeCapacity = Math.floor(usableArea * 2.0);
  const maxCapacity = Math.floor(usableArea * 4.5);

  const selectedElement = blueprint.elements.find(e => e.id === selectedElementId);

  return (
    <div className="flex h-full w-full bg-[#080c14] overflow-hidden select-none">
      {/* 1. Left Architecture Tool Palette */}
      <div className="w-64 bg-[#0a101d] border-r border-slate-800 flex flex-col shrink-0 z-10">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">CAD Blueprint Studio</span>
          </div>
          <button
            onClick={() => setActiveTool('select')}
            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
              activeTool === 'select'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-glow-cyan'
                : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Select</span>
          </button>
        </div>

        {/* Tools scrollable list */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-2 block mb-1">
            Structures & Spaces
          </span>
          {(['wall', 'road', 'open_space', 'stage', 'barricade', 'seating', 'building', 'restricted'] as ElementType[]).map(t => {
            const cfg = TOOL_CONFIG[t];
            const isAct = activeTool === t;
            return (
              <button
                key={t}
                onClick={() => setActiveTool(t)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                  isAct
                    ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/60 shadow-glow-cyan'
                    : 'bg-slate-900/50 text-slate-300 border border-transparent hover:bg-slate-800/60 hover:text-slate-100'
                }`}
              >
                <div className="w-3.5 h-3.5 flex items-center justify-center" style={{ color: cfg.stroke }}>
                  {cfg.icon}
                </div>
                <span className="truncate">{cfg.label}</span>
              </button>
            );
          })}

          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-2 block mt-3 mb-1">
            Access, Gates & Safety
          </span>
          {(['security', 'ticket_counter', 'entry_gate', 'exit_gate', 'emergency_exit', 'medical', 'police', 'parking', 'food_stall', 'restroom', 'vip_area'] as ElementType[]).map(t => {
            const cfg = TOOL_CONFIG[t];
            const isAct = activeTool === t;
            return (
              <button
                key={t}
                onClick={() => setActiveTool(t)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                  isAct
                    ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/60 shadow-glow-cyan'
                    : 'bg-slate-900/50 text-slate-300 border border-transparent hover:bg-slate-800/60 hover:text-slate-100'
                }`}
              >
                <div className="w-3.5 h-3.5 flex items-center justify-center" style={{ color: cfg.stroke }}>
                  {cfg.icon}
                </div>
                <span className="truncate">{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Demo Templates Preset Buttons */}
        <div className="p-2.5 border-t border-slate-800 bg-slate-950/60 space-y-1.5">
          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
            Load Preset Venue Template
          </span>
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            {['Stadium', 'Railway', 'Temple', 'Rally', 'Mall', 'Festival'].map(preset => (
              <button
                key={preset}
                onClick={() => onLoadPreset(preset.toLowerCase())}
                className="px-2 py-1 bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700/60 text-center font-medium transition"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Main Center Workspace (2D CAD Canvas + Optional 3D Split Screen) */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Control Bar */}
        <div className="h-12 bg-[#090f1d] border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={historyIdx <= 0}
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIdx >= history.length - 1}
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            <button
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 border ${
                snapToGrid
                  ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800/60'
                  : 'bg-slate-800/40 text-slate-400 border-slate-700'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Snap ({gridSize}m)</span>
            </button>

            <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded px-2 py-1">
              <span>Zoom:</span>
              <button onClick={() => setZoom(Math.max(3, zoom - 1))} className="p-0.5 hover:text-white">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-slate-200">{zoom.toFixed(1)}x</span>
              <button onClick={() => setZoom(Math.min(15, zoom + 1))} className="p-0.5 hover:text-white">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => setShowSplit3D(!showSplit3D)}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 border ${
                showSplit3D
                  ? 'bg-purple-950/50 text-purple-300 border-purple-600/80 shadow-glow-cyan'
                  : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              <span>3D Live Preview {showSplit3D ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => setShowVenueSettings(!showVenueSettings)}
              className="px-2 py-1 bg-slate-800/60 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1"
              title="Venue Dimensions & Grid"
            >
              <Settings className="w-3.5 h-3.5 text-cyan-400" />
              <span>Venue Setup</span>
            </button>

            <button
              onClick={handleClearAll}
              className="px-2 py-1 bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-400 rounded text-xs"
              title="Clear Canvas"
            >
              Clear
            </button>
          </div>

          {/* Right Action: Sync 2D -> 3D Digital Twin */}
          <div className="flex items-center gap-3">
            {statusMsg && (
              <span className="text-xs font-semibold text-emerald-400 animate-pulse font-mono">
                {statusMsg}
              </span>
            )}
            <button
              onClick={handleSaveToDb}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
            >
              <Save className="w-3.5 h-3.5 text-slate-400" />
              <span>Save Blueprint</span>
            </button>
            <button
              onClick={handleBuildDigitalTwin}
              disabled={isSyncing}
              className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-glow-cyan transition active:scale-95"
            >
              <Layers className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>BUILD & OPEN 3D TWIN</span>
            </button>
          </div>
        </div>

        {/* Viewport Workspace: 2D Canvas + (Optional) 3D Split Screen */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* 2D Canvas SVG Viewport */}
          <div className={`${showSplit3D ? 'w-1/2 border-r border-slate-800' : 'w-full'} h-full bg-[#050810] relative overflow-hidden cursor-crosshair`}>
            <svg
              ref={svgRef}
              className="w-full h-full"
              onMouseDown={handleSvgMouseDown}
              onMouseMove={handleSvgMouseMove}
              onMouseUp={handleSvgMouseUp}
            >
              <defs>
                <pattern
                  id="cad-grid-pattern"
                  width={gridSize * zoom}
                  height={gridSize * zoom}
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d={`M ${gridSize * zoom} 0 L 0 0 0 ${gridSize * zoom}`}
                    fill="none"
                    stroke="rgba(30, 41, 59, 0.4)"
                    strokeWidth="0.8"
                  />
                </pattern>
              </defs>

              {/* Background Grid */}
              <rect width="100%" height="100%" fill="#060a14" />
              <g transform={`translate(${pan.x}, ${pan.y})`}>
                {/* Venue Boundary Floor */}
                <rect
                  x={0}
                  y={0}
                  width={blueprint.width * zoom}
                  height={blueprint.length * zoom}
                  fill="url(#cad-grid-pattern)"
                  stroke="#334155"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />

                {/* Metric Rulers / Boundary Dimensions */}
                <text x={10} y={-10} fill="#64748b" fontSize="11" fontFamily="monospace">
                  ← {blueprint.width}m WIDTH →
                </text>
                <text
                  x={-10}
                  y={blueprint.length * zoom - 10}
                  fill="#64748b"
                  fontSize="11"
                  fontFamily="monospace"
                  transform={`rotate(-90, -10, ${blueprint.length * zoom - 10})`}
                >
                  ← {blueprint.length}m LENGTH →
                </text>

                {/* Render Elements */}
                {blueprint.elements.map((el) => {
                  const cfg = TOOL_CONFIG[el.type] || TOOL_CONFIG.wall;
                  const isSel = el.id === selectedElementId;
                  const x = (el.x - el.width / 2) * zoom;
                  const y = (el.y - el.height / 2) * zoom;
                  const w = el.width * zoom;
                  const h = el.height * zoom;

                  return (
                    <g
                      key={el.id}
                      onMouseDown={(e) => handleElementMouseDown(e, el)}
                      className="cursor-move"
                    >
                      <rect
                        x={x}
                        y={y}
                        width={Math.max(4, w)}
                        height={Math.max(4, h)}
                        fill={cfg.color}
                        stroke={isSel ? '#22d3ee' : cfg.stroke}
                        strokeWidth={isSel ? 2.5 : 1.2}
                        rx={3}
                      />
                      {/* Element Label */}
                      {w > 25 && h > 14 && (
                        <text
                          x={x + w / 2}
                          y={y + h / 2 + 3}
                          fill="#f8fafc"
                          fontSize="9.5"
                          fontWeight="600"
                          fontFamily="sans-serif"
                          textAnchor="middle"
                          pointerEvents="none"
                        >
                          {el.label || cfg.label}
                        </text>
                      )}

                      {/* Resize Handles for Selected Element */}
                      {isSel && (
                        <>
                          <circle
                            cx={x}
                            cy={y}
                            r={4.5}
                            fill="#22d3ee"
                            stroke="#0f172a"
                            strokeWidth={1.5}
                            className="cursor-nwse-resize"
                            onMouseDown={(e) => handleResizeHandleMouseDown(e, el, 'nw')}
                          />
                          <circle
                            cx={x + w}
                            cy={y}
                            r={4.5}
                            fill="#22d3ee"
                            stroke="#0f172a"
                            strokeWidth={1.5}
                            className="cursor-nesw-resize"
                            onMouseDown={(e) => handleResizeHandleMouseDown(e, el, 'ne')}
                          />
                          <circle
                            cx={x + w}
                            cy={y + h}
                            r={4.5}
                            fill="#22d3ee"
                            stroke="#0f172a"
                            strokeWidth={1.5}
                            className="cursor-nwse-resize"
                            onMouseDown={(e) => handleResizeHandleMouseDown(e, el, 'se')}
                          />
                          <circle
                            cx={x}
                            cy={y + h}
                            r={4.5}
                            fill="#22d3ee"
                            stroke="#0f172a"
                            strokeWidth={1.5}
                            className="cursor-nesw-resize"
                            onMouseDown={(e) => handleResizeHandleMouseDown(e, el, 'sw')}
                          />
                        </>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* 3D Live Preview Split-Screen Panel (When Toggled) */}
          {showSplit3D && (
            <div className="w-1/2 h-full bg-[#050810] relative">
              <Canvas shadows camera={{ position: [0, 65, 75], fov: 45 }}>
                <color attach="background" args={['#070b14']} />
                <ambientLight intensity={0.7} />
                <directionalLight position={[40, 80, 50]} intensity={1.4} castShadow />
                <OrbitControls enableDamping dampingFactor={0.05} maxPolarAngle={Math.PI / 2.05} />
                <ProceduralVenue
                  width={blueprint.width}
                  length={blueprint.length}
                  elements={blueprint.elements}
                  dangerZones={[]}
                  blockedExits={[]}
                />
                <CrowdAgents
                  agents={previewTelemetry.agents}
                  venueWidth={blueprint.width}
                  venueLength={blueprint.length}
                  isEmergency={false}
                />
              </Canvas>
              <div className="absolute top-3 left-3 bg-[#0a1120]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-purple-500/50 text-[11px] font-bold text-purple-300 flex items-center gap-1.5 shadow-glow-cyan pointer-events-none">
                <Eye className="w-3.5 h-3.5 text-purple-400" />
                <span>Live 3D Digital Twin Synchronization</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Overlay: Capacity Engine Live Calculation */}
        <div className="bg-[#0a1120]/95 border-t border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs z-10 shrink-0">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Area</span>
              <span className="font-mono font-bold text-slate-200">{totalArea.toLocaleString()} m²</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Usable Surface</span>
              <span className="font-mono font-bold text-emerald-400">{usableArea.toLocaleString()} m²</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Obstructed Area</span>
              <span className="font-mono font-bold text-amber-400">{obstructedArea.toLocaleString()} m²</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Safe Capacity (2.0 p/m²)</span>
              <span className="font-mono font-bold text-cyan-400">{safeCapacity.toLocaleString()} people</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Maximum Capacity (4.5 p/m²)</span>
              <span className="font-mono font-bold text-rose-400">{maxCapacity.toLocaleString()} people</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono">
              {blueprint.elements.length} Structural Elements
            </span>
          </div>
        </div>
      </div>

      {/* 3. Right Properties & Venue Inspector Sidebar */}
      <div className="w-72 bg-[#0a101d] border-l border-slate-800 flex flex-col shrink-0 z-10 overflow-y-auto">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Properties Inspector</span>
          </span>
        </div>

        {selectedElement ? (
          <div className="p-4 space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Element Label / Name</label>
              <input
                type="text"
                value={selectedElement.label || ''}
                onChange={(e) => updateSelectedElement({ label: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Type</label>
              <select
                value={selectedElement.type}
                onChange={(e) => updateSelectedElement({ type: e.target.value as ElementType })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-medium"
              >
                {Object.keys(TOOL_CONFIG).map((k) => (
                  <option key={k} value={k}>
                    {TOOL_CONFIG[k as ElementType].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Width (m)</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={selectedElement.width}
                  onChange={(e) => updateSelectedElement({ width: parseFloat(e.target.value) || 1 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Height / Length (m)</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={selectedElement.height}
                  onChange={(e) => updateSelectedElement({ height: parseFloat(e.target.value) || 1 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Pos X (m)</label>
                <input
                  type="number"
                  step="1"
                  value={selectedElement.x}
                  onChange={(e) => updateSelectedElement({ x: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Pos Y (m)</label>
                <input
                  type="number"
                  step="1"
                  value={selectedElement.y}
                  onChange={(e) => updateSelectedElement({ y: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono"
                />
              </div>
            </div>

            {['entry_gate', 'security'].includes(selectedElement.type) && (
              <div className="space-y-1 bg-cyan-950/30 p-2.5 rounded-lg border border-cyan-800/40">
                <label className="text-[10px] uppercase font-bold text-cyan-400 block">Processing Throughput (p/min)</label>
                <input
                  type="number"
                  min="30"
                  max="600"
                  step="10"
                  value={selectedElement.capacity_rate || 120}
                  onChange={(e) => updateSelectedElement({ capacity_rate: parseFloat(e.target.value) || 120 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 font-mono"
                />
              </div>
            )}

            {/* Actions for Selected Element */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <button
                onClick={handleRotateSelected}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center justify-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Rotate 90°</span>
              </button>
              <button
                onClick={handleDuplicateSelected}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>Clone Element</span>
              </button>
              <button
                onClick={handleDeleteSelected}
                className="w-full py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/50 rounded text-xs flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Element</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Venue Name</label>
              <input
                type="text"
                value={blueprint.name}
                onChange={(e) => {
                  const updated = { ...blueprint, name: e.target.value };
                  setBlueprint(updated);
                  pushHistory(updated);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Venue Boundary Width (m)</label>
              <input
                type="number"
                min="40"
                max="300"
                step="10"
                value={blueprint.width}
                onChange={(e) => {
                  const updated = { ...blueprint, width: parseFloat(e.target.value) || 120 };
                  setBlueprint(updated);
                  pushHistory(updated);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Venue Boundary Length (m)</label>
              <input
                type="number"
                min="40"
                max="300"
                step="10"
                value={blueprint.length}
                onChange={(e) => {
                  const updated = { ...blueprint, length: parseFloat(e.target.value) || 80 };
                  setBlueprint(updated);
                  pushHistory(updated);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 font-mono"
              />
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">Quick Tips:</p>
              <p>• Click any tool on left, then click on canvas to place.</p>
              <p>• Drag elements to reposition.</p>
              <p>• Drag corner handles to resize.</p>
              <p>• Toggle <strong>3D Live Preview</strong> above to see instant 3D changes.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
