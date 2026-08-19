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
    try {
      await api.triggerEmergency({
        scenario_type: 'fire',
        location_x: x,
        location_y: y,
        radius: 15.0
      });
    } catch (err) {
      // Local fallback emergency state
      if (telemetry) {
        setTelemetry({
          ...telemetry,
          is_emergency: true,
          emergency_scenario: 'fire',
          danger_zones: [{ x, y, radius: 15.0 }]
        });
      }
    }
  };

  const handleTriggerStampede = async () => {
    try {
      await api.triggerEmergency({
        scenario_type: 'stampede',
        location_x: currentBlueprint.width / 2,
        location_y: currentBlueprint.length / 2,
        radius: 20.0
      });
    } catch (err) {
      if (telemetry) {
        setTelemetry({
          ...telemetry,
          is_emergency: true,
          emergency_scenario: 'stampede',
          danger_zones: [{ x: currentBlueprint.width / 2, y: currentBlueprint.length / 2, radius: 20.0 }]
        });
      }
    }
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
        blocked_exits: []
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

        {/* Tab 5: Emergency Response Control */}
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
