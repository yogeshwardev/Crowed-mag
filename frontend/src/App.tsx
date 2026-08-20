import React, { useState, useEffect, useRef } from 'react';
import {
  NavigationTab,
  Blueprint,
  TelemetrySnapshot,
  AIRiskAnalysis,
  CrowdPrediction as CrowdPredictionType
} from './types';
import { api, createSimulationWebSocket } from './utils/api';
import { STADIUM_PRESET, PRESET_MAP, generateInitialTelemetry } from './utils/presets';
import { Header } from './components/layout/Header';
import { DigitalTwinScene } from './components/3d/DigitalTwinScene';
import { BlueprintStudio } from './components/blueprint/BlueprintStudio';
import { LiveSimulationPanel } from './components/simulation/LiveSimulationPanel';
import { AISafetyAdvisor } from './components/ai/AISafetyAdvisor';
import { CrowdPrediction } from './components/ai/CrowdPrediction';
import { CCTVMonitorModal } from './components/cctv/CCTVMonitorModal';
import { EmergencyControl } from './components/emergency/EmergencyControl';
import { WhatIfOptimizer } from './components/whatif/WhatIfOptimizer';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('digital_twin');
  const [currentBlueprint, setCurrentBlueprint] = useState<Blueprint>(STADIUM_PRESET);
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot | null>(() => generateInitialTelemetry(STADIUM_PRESET));
  const [riskAnalysis, setRiskAnalysis] = useState<AIRiskAnalysis | null>(null);
  const [crowdPrediction, setCrowdPrediction] = useState<CrowdPredictionType | null>(null);
  const [simSpeed, setSimSpeed] = useState<number>(1);

  const socketRef = useRef<any>(null);

  // Initial Load: Load Stadium preset and start WebSocket
  useEffect(() => {
    async function init() {
      try {
        const stadiumBp = await api.getTemplate('stadium');
        if (stadiumBp && stadiumBp.elements && stadiumBp.elements.length > 0) {
          setCurrentBlueprint(stadiumBp);
          await api.loadBlueprint(stadiumBp);
        } else {
          await api.loadBlueprint(STADIUM_PRESET);
        }
      } catch (err) {
        console.warn('Backend not ready yet, using default preset', err);
        try {
          await api.loadBlueprint(STADIUM_PRESET);
        } catch (e) {
          // Local fallback active
        }
      }
    }
    init();

    // Connect WebSocket for live simulation ticks
    socketRef.current = createSimulationWebSocket((msg: any) => {
      if (msg.type === 'TELEMETRY' || msg.type === 'INIT') {
        setTelemetry(msg.data);
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  // Periodic fetch for AI risk & predictions every 2.5 seconds
  useEffect(() => {
    const fetchAI = async () => {
      try {
        const [risk, pred] = await Promise.all([
          api.getAIRisk(),
          api.getCrowdPrediction()
        ]);
        setRiskAnalysis(risk);
        setCrowdPrediction(pred);
      } catch (err) {
        // Silently continue if backend is starting
      }
    };

    fetchAI();
    const interval = setInterval(fetchAI, 2500);
    return () => clearInterval(interval);
  }, []);

  // Handle Preset Loading with instant local fallback + backend sync
  const handleLoadPreset = async (presetType: string) => {
    const localPreset = PRESET_MAP[presetType.toLowerCase()] || STADIUM_PRESET;
    setCurrentBlueprint(localPreset);
    setTelemetry(generateInitialTelemetry(localPreset));
    try {
      const preset = await api.getTemplate(presetType);
      if (preset && preset.elements) {
        setCurrentBlueprint(preset);
        await api.loadBlueprint(preset);
      } else {
        await api.loadBlueprint(localPreset);
      }
    } catch (err) {
      console.error('Error loading preset from backend, using local fallback', err);
      try {
        await api.loadBlueprint(localPreset);
      } catch (e) {}
    }
  };

  // Sync from 2D Blueprint to 3D Digital Twin
  const handleSyncDigitalTwin = async (bp: Blueprint) => {
    setCurrentBlueprint(bp);
    setTelemetry(generateInitialTelemetry(bp));
    try {
      await api.loadBlueprint(bp);
    } catch (err) {
      console.warn('Sync failed to send to backend', err);
    }
  };

  // Emergency triggers
  const handleTriggerFire = async (x: number, y: number) => {
    const totalCount = telemetry?.total_agent_count || telemetry?.active_agent_count || 800;
    // 1. Instant optimistic local state update for zero-latency UI reaction
    if (telemetry) {
      setTelemetry({
        ...telemetry,
        is_emergency: true,
        emergency_scenario: 'fire',
        danger_zones: [{ x, y, radius: 15.0 }],
        evacuation: {
          is_active: true,
          scenario_type: 'fire',
          elapsed_seconds: 0,
          total_people: totalCount,
          exited_people: 0,
          remaining_people: totalCount,
          evacuation_percentage: 0,
          estimated_completion_seconds: 45,
          average_evacuation_speed: 3.8,
          is_completed: false
        }
      });
    }

    // 2. Send via WebSocket if active
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send('EMERGENCY_TRIGGER', {
          scenario: 'fire',
          x,
          y,
          radius: 15.0
        });
      } catch (e) {}
    }

    // 3. Send via REST API
    try {
      await api.triggerEmergency({
        scenario_type: 'fire',
        location_x: x,
        location_y: y,
        radius: 15.0
      });
    } catch (err) {
      console.warn('Emergency triggered via local/WebSocket stream', err);
    }
  };

  const handleTriggerStampede = async () => {
    const totalCount = telemetry?.total_agent_count || telemetry?.active_agent_count || 800;
    if (telemetry) {
      setTelemetry({
        ...telemetry,
        is_emergency: true,
        emergency_scenario: 'stampede',
        danger_zones: [{ x: currentBlueprint.width / 2, y: currentBlueprint.length / 2, radius: 20.0 }],
        evacuation: {
          is_active: true,
          scenario_type: 'stampede',
          elapsed_seconds: 0,
          total_people: totalCount,
          exited_people: 0,
          remaining_people: totalCount,
          evacuation_percentage: 0,
          estimated_completion_seconds: 45,
          average_evacuation_speed: 3.8,
          is_completed: false
        }
      });
    }
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send('EMERGENCY_TRIGGER', {
          scenario: 'stampede',
          x: currentBlueprint.width / 2,
          y: currentBlueprint.length / 2,
          radius: 20.0
        });
      } catch (e) {}
    }
    try {
      await api.triggerEmergency({
        scenario_type: 'stampede',
        location_x: currentBlueprint.width / 2,
        location_y: currentBlueprint.length / 2,
        radius: 20.0
      });
    } catch (err) {}
  };

  const handleEvacuationProgress = (stats: { exited: number; total: number; remaining: number; pct: number }) => {
    setTelemetry((prev) => {
      if (!prev || !prev.is_emergency) return prev;
      const isComp = stats.remaining === 0 || stats.pct >= 100;
      return {
        ...prev,
        active_agent_count: stats.remaining,
        evacuation: {
          is_active: true,
          scenario_type: prev.emergency_scenario || 'evacuation',
          elapsed_seconds: Number(((prev.evacuation?.elapsed_seconds || 0) + 0.3).toFixed(1)),
          total_people: stats.total,
          exited_people: stats.exited,
          remaining_people: stats.remaining,
          evacuation_percentage: stats.pct,
          estimated_completion_seconds: isComp ? 0 : Math.max(3, Math.round(stats.remaining * 0.35)),
          average_evacuation_speed: 3.8,
          is_completed: isComp
        }
      };
    });
  };

  const handleClearEmergency = async () => {
    try {
      await api.clearEmergency();
    } catch (err) {}
    if (telemetry) {
      setTelemetry({
        ...telemetry,
        is_emergency: false,
        emergency_scenario: undefined,
        danger_zones: [],
        blocked_exits: [],
        evacuation: {
          is_active: false,
          elapsed_seconds: 0,
          total_people: 0,
          exited_people: 0,
          remaining_people: 0,
          evacuation_percentage: 0,
          estimated_completion_seconds: 0,
          average_evacuation_speed: 0,
          is_completed: false
        }
      });
    }
  };

  const handleBlockExit = async (exitId: string) => {
    try {
      await api.blockExit(exitId);
    } catch (err) {}
    if (telemetry) {
      setTelemetry({
        ...telemetry,
        blocked_exits: [...telemetry.blocked_exits, exitId]
      });
    }
  };

  const handleUnblockExit = async (exitId: string) => {
    try {
      await api.unblockExit(exitId);
    } catch (err) {}
    if (telemetry) {
      setTelemetry({
        ...telemetry,
        blocked_exits: telemetry.blocked_exits.filter(id => id !== exitId)
      });
    }
  };

  const handleSetCrowdSize = async (count: number) => {
    const updatedTelemetry = generateInitialTelemetry(currentBlueprint, count);
    setTelemetry(updatedTelemetry);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send('SET_CROWD', { count });
      } catch (e) {}
    }

    try {
      await api.setCrowdSize(count);
    } catch (err) {}
  };

  const handleSetSpeed = async (speed: number) => {
    setSimSpeed(speed);
    try {
      await api.setSpeed(speed);
    } catch (err) {}
  };

  const handlePause = async () => {
    try {
      await api.pauseSimulation();
    } catch (err) {}
  };

  const handleResume = async () => {
    try {
      await api.resumeSimulation();
    } catch (err) {}
  };

  const handleStep = async () => {
    try {
      const res = await api.stepSimulation();
      if (res.telemetry) setTelemetry(res.telemetry);
    } catch (err) {}
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070b12] text-slate-100 overflow-hidden font-sans select-none">
      {/* Command Center Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        telemetry={telemetry}
        venueName={currentBlueprint.name}
        simSpeed={simSpeed}
        onSetSpeed={handleSetSpeed}
      />

      {/* Main Viewport Workspace */}
      <main className="flex-1 relative overflow-hidden">
        {/* Tab 1: 3D Digital Twin (Prioritized Default Main View) */}
        {activeTab === 'digital_twin' && (
          <DigitalTwinScene
            blueprint={currentBlueprint}
            telemetry={telemetry}
            simSpeed={simSpeed}
            onSetSpeed={handleSetSpeed}
            onEvacuationProgress={handleEvacuationProgress}
            onTriggerFire={handleTriggerFire}
            onTriggerStampede={handleTriggerStampede}
            onClearEmergency={handleClearEmergency}
            onToggleBlockExit={(id) => telemetry?.blocked_exits?.includes(id) ? handleUnblockExit(id) : handleBlockExit(id)}
          />
        )}

        {/* Tab 2: 2D Blueprint Studio */}
        {activeTab === 'blueprint_studio' && (
          <BlueprintStudio
            currentBlueprint={currentBlueprint}
            onSyncDigitalTwin={handleSyncDigitalTwin}
            onLoadPreset={handleLoadPreset}
            onOpen3DView={() => setActiveTab('digital_twin')}
          />
        )}

        {/* Tab 3: Live Simulation Controls & Turnstiles */}
        {activeTab === 'live_simulation' && (
          <LiveSimulationPanel
            telemetry={telemetry}
            blueprint={currentBlueprint}
            onSetCrowdSize={handleSetCrowdSize}
            onSetSpeed={handleSetSpeed}
            onPause={handlePause}
            onResume={handleResume}
            onStep={handleStep}
            simSpeed={simSpeed}
          />
        )}


        {/* Tab 4: AI Safety Advisor */}
        {activeTab === 'ai_safety' && (
          <AISafetyAdvisor
            riskAnalysis={riskAnalysis}
            telemetry={telemetry}
          />
        )}

        {/* Tab 5: Real-time CCTV AI Surveillance Wall */}
        {activeTab === 'cctv_surveillance' && (
          <CCTVMonitorModal
            telemetry={telemetry}
            onSelectCameraView={() => setActiveTab('digital_twin')}
          />
        )}

        {/* Tab 6: Emergency Response Control */}
        {activeTab === 'emergency_control' && (
          <EmergencyControl
            telemetry={telemetry}
            blueprint={currentBlueprint}
            onTriggerEmergency={api.triggerEmergency}
            onClearEmergency={handleClearEmergency}
            onBlockExit={handleBlockExit}
            onUnblockExit={handleUnblockExit}
          />
        )}

        {/* Tab 6: What-If Safety Lab */}
        {activeTab === 'what_if_lab' && (
          <WhatIfOptimizer
            currentBlueprint={currentBlueprint}
            onApplyOptimizedBlueprint={handleSyncDigitalTwin}
          />
        )}

        {/* Tab 7: Analytics & PDF Reports */}
        {activeTab === 'analytics_reports' && (
          <AnalyticsDashboard
            telemetry={telemetry}
            blueprint={currentBlueprint}
            riskAnalysis={riskAnalysis}
          />
        )}
      </main>
    </div>
  );
};

export default App;
