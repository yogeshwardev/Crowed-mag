export type ElementType =
  | 'wall'
  | 'road'
  | 'open_space'
  | 'stage'
  | 'barricade'
  | 'restricted'
  | 'seating'
  | 'building'
  | 'security'
  | 'ticket_counter'
  | 'entry_gate'
  | 'exit_gate'
  | 'emergency_exit'
  | 'medical'
  | 'police'
  | 'parking'
  | 'food_stall'
  | 'restroom'
  | 'vip_area';

export interface BlueprintElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  label?: string;
  capacity_rate?: number;
  properties?: Record<string, any>;
}

export interface Blueprint {
  id: string;
  name: string;
  description?: string;
  venue_type: string;
  width: number;
  length: number;
  scale: number;
  elements: BlueprintElement[];
}

export interface CapacityCalculation {
  total_area_m2: number;
  usable_area_m2: number;
  obstructed_area_m2: number;
  safe_capacity: number;
  warning_capacity: number;
  maximum_capacity: number;
  current_occupancy: number;
  occupancy_percentage: number;
  safe_density_threshold: number;
  warning_density_threshold: number;
  critical_density_threshold: number;
}

export interface AgentData {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  target_x: number;
  target_y: number;
  speed: number;
  state: string;
  zone: string;
  exit_id?: string;
  color_index: number;
  height_scale: number;
}

export interface QueueStatus {
  gate_id: string;
  gate_name: string;
  incoming_flow_per_min: number;
  processing_rate_per_min: number;
  queue_length: number;
  estimated_wait_time_sec: number;
  status: string;
}

export interface BottleneckAlert {
  id: string;
  location_name: string;
  x: number;
  y: number;
  current_density: number;
  severity: 'ELEVATED' | 'HIGH' | 'CRITICAL';
  reason: string;
  recommended_action: string;
}

export interface EvacuationStatus {
  is_active: boolean;
  scenario_type?: string;
  elapsed_seconds: number;
  total_people: number;
  exited_people: number;
  remaining_people: number;
  evacuation_percentage: number;
  estimated_completion_seconds: number;
  average_evacuation_speed: number;
  is_completed: boolean;
}

export interface TelemetrySnapshot {
  venue_name: string;
  blueprint_id: string;
  venue_type: string;
  tick: number;
  is_emergency: boolean;
  emergency_scenario?: string;
  danger_zones: Array<{ x: number; y: number; radius: number }>;
  blocked_exits: string[];
  capacity: CapacityCalculation;
  evacuation: EvacuationStatus;
  queues: QueueStatus[];
  bottlenecks: BottleneckAlert[];
  max_density: number;
  avg_density: number;
  density_grid: number[][];
  active_agent_count: number;
  total_agent_count: number;
  agents: AgentData[];
  panic_agent_count?: number;
}

export interface RiskFactor {
  name: string;
  factor_name?: string; // alias for backend compatibility
  score: number;
  weight: number;
  status: string;
  details: string;
}

export interface AIRiskAnalysis {
  risk_score: number;
  category: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  reasons: string[];
  recommendations: string[];
  factors: RiskFactor[];
  bottlenecks: BottleneckAlert[];
  queue_statuses: QueueStatus[];
}

export interface ZoneForecast {
  zone_name: string;
  current_density: number;
  predicted_density?: number;
  predicted_10m_density: number;
  status: string;
  forecast_label?: string;
}

export interface CrowdPrediction {
  current_crowd: number;
  predicted_10m: number;
  predicted_30m: number;
  predicted_60m: number;
  time_to_capacity_exceedance_min?: number;
  status_summary: string;
  zone_forecasts: ZoneForecast[];
  current_inflow_per_min?: number;
  current_outflow_per_min?: number;
}

export interface WhatIfScenarioResult {
  name: string;
  risk_score: number;
  max_density: number;
  evacuation_time_sec: number;
  bottlenecks_count: number;
  avg_wait_time_sec: number;
  throughput_per_min: number;
  congestion_delta_percent: number;
  recommendation: string;
  is_optimal: boolean;
  modified_blueprint?: Blueprint;
}

export interface WhatIfOptimizationResponse {
  baseline: WhatIfScenarioResult;
  scenarios: WhatIfScenarioResult[];
  best_recommendation: string;
}

export type CameraViewMode =
  | 'overview'
  | 'entrance'
  | 'checkpoint'
  | 'top'
  | 'ground'
  | 'first_person'
  | 'evacuation';

export type ViewOverlayMode =
  | '3d'
  | 'heatmap'
  | 'agents'
  | 'top'
  | 'flow'
  | 'evacuation';

export type NavigationTab =
  | 'digital_twin'
  | 'blueprint_studio'
  | 'live_simulation'
  | 'ai_safety'
  | 'emergency_control'
  | 'what_if_lab'
  | 'analytics_reports';
