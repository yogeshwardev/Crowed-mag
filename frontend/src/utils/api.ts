import {
  Blueprint,
  AIRiskAnalysis,
  CrowdPrediction,
  WhatIfOptimizationResponse,
  TelemetrySnapshot
} from '../types';

const API_BASE = 'http://localhost:8000/api';
const WS_URL = 'ws://localhost:8000/ws/simulation';

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  async getTemplates() {
    const res = await fetch(`${API_BASE}/templates`);
    return res.json();
  },

  async getTemplate(name: string): Promise<Blueprint> {
    const res = await fetch(`${API_BASE}/templates/${name}`);
    return res.json();
  },

  async loadBlueprint(blueprint: Blueprint) {
    const res = await fetch(`${API_BASE}/blueprint/load`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blueprint),
    });
    return res.json();
  },

  async saveBlueprint(blueprint: Partial<Blueprint>) {
    const res = await fetch(`${API_BASE}/blueprint/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blueprint),
    });
    return res.json();
  },

  async getSavedBlueprints() {
    const res = await fetch(`${API_BASE}/blueprints`);
    return res.json();
  },

  async setCrowdSize(count: number) {
    const res = await fetch(`${API_BASE}/simulation/spawn?count=${count}`, {
      method: 'POST',
    });
    return res.json();
  },

  async setSpeed(speed: number) {
    const res = await fetch(`${API_BASE}/simulation/speed?speed=${speed}`, {
      method: 'POST',
    });
    return res.json();
  },

  async pauseSimulation() {
    const res = await fetch(`${API_BASE}/simulation/pause`, { method: 'POST' });
    return res.json();
  },

  async resumeSimulation() {
    const res = await fetch(`${API_BASE}/simulation/resume`, { method: 'POST' });
    return res.json();
  },

  async stepSimulation() {
    const res = await fetch(`${API_BASE}/simulation/step`, { method: 'POST' });
    return res.json();
  },

  async getTelemetry(): Promise<TelemetrySnapshot> {
    const res = await fetch(`${API_BASE}/simulation/telemetry`);
    return res.json();
  },

  async triggerEmergency(data: {
    scenario_type: string;
    location_x?: number;
    location_y?: number;
    radius?: number;
    blocked_exit_id?: string;
  }) {
    const res = await fetch(`${API_BASE}/emergency/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async clearEmergency() {
    const res = await fetch(`${API_BASE}/emergency/clear`, { method: 'POST' });
    return res.json();
  },

  async blockExit(exitId: string) {
    const res = await fetch(`${API_BASE}/emergency/block_exit?exit_id=${exitId}`, {
      method: 'POST',
    });
    return res.json();
  },

  async unblockExit(exitId: string) {
    const res = await fetch(`${API_BASE}/emergency/unblock_exit?exit_id=${exitId}`, {
      method: 'POST',
    });
    return res.json();
  },

  async getAIRisk(): Promise<AIRiskAnalysis> {
    const res = await fetch(`${API_BASE}/ai/risk`);
    return res.json();
  },

  async getCrowdPrediction(): Promise<CrowdPrediction> {
    const res = await fetch(`${API_BASE}/ai/prediction`);
    return res.json();
  },

  async getCCTVAnalytics() {
    const res = await fetch(`${API_BASE}/ai/cctv`);
    return res.json();
  },

  async getFireState() {
    const res = await fetch(`${API_BASE}/fire/state`);
    return res.json();
  },

  async igniteFire(x: number, y: number, radius: number = 4.0) {
    const res = await fetch(`${API_BASE}/fire/ignite?x=${x}&y=${y}&radius=${radius}`, { method: 'POST' });
    return res.json();
  },

  async extinguishFire() {
    const res = await fetch(`${API_BASE}/fire/extinguish`, { method: 'POST' });
    return res.json();
  },

  async runWhatIfOptimization(): Promise<WhatIfOptimizationResponse> {
    const res = await fetch(`${API_BASE}/whatif/optimize`, {
      method: 'POST',
    });
    return res.json();
  },

  async generateSafetyReport() {
    const res = await fetch(`${API_BASE}/reports/generate`, {
      method: 'POST',
    });
    return res.json();
  },

  getReportDownloadUrl(filename: string) {
    return `${API_BASE}/reports/download/${filename}`;
  }
};

export function createSimulationWebSocket(onMessage: (data: any) => void) {
  let ws: WebSocket | null = null;
  let isClosed = false;

  function connect() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[CrowdSafe WS] Connected to live simulation gateway');
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        onMessage(payload);
      } catch (err) {
        console.error('[CrowdSafe WS] Error parsing telemetry', err);
      }
    };

    ws.onerror = (err) => {
      console.warn('[CrowdSafe WS] Socket connection error:', err);
    };

    ws.onclose = () => {
      if (!isClosed) {
        setTimeout(connect, 1500); // auto-reconnect
      }
    };
  }

  connect();

  return {
    send(action: string, payload: any = {}) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action, ...payload }));
      }
    },
    close() {
      isClosed = true;
      if (ws) ws.close();
    }
  };
}
