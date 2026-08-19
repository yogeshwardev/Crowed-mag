from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# Blueprint CAD Elements
class BlueprintElement(BaseModel):
    id: str
    type: str  # wall, road, open_space, stage, barricade, restricted, seating, building, security, ticket_counter, entry_gate, exit_gate, emergency_exit, medical, police, parking, food_stall, restroom, vip_area
    x: float
    y: float
    width: float
    height: float
    rotation: float = 0.0
    label: Optional[str] = None
    capacity_rate: Optional[float] = None  # for gates (e.g. 120 people/min)
    properties: Optional[Dict[str, Any]] = None

class BlueprintCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    venue_type: str = "stadium"
    width: float = 120.0
    length: float = 80.0
    scale: float = 1.0
    elements: List[BlueprintElement] = []

class BlueprintResponse(BlueprintCreate):
    id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

# Capacity & Density schemas
class CapacityCalculation(BaseModel):
    total_area_m2: float
    usable_area_m2: float
    obstructed_area_m2: float
    safe_capacity: int       # e.g. 2.0 persons/m2
    warning_capacity: int    # e.g. 3.5 persons/m2
    maximum_capacity: int    # e.g. 4.5 persons/m2
    current_occupancy: int
    occupancy_percentage: float
    safe_density_threshold: float = 2.0
    warning_density_threshold: float = 3.5
    critical_density_threshold: float = 4.5

# Simulation Agent
class AgentState(BaseModel):
    id: int
    x: float
    y: float
    vx: float = 0.0
    vy: float = 0.0
    target_x: float = 0.0
    target_y: float = 0.0
    speed: float = 1.2
    state: str  # WALKING, QUEUING, WAITING, ENTERING, EXITING, EVACUATING, REROUTING, BLOCKED, PANIC, SAFE
    zone: str = "MAIN"
    exit_id: Optional[str] = None
    color_index: int = 0
    height_scale: float = 1.0

# Queue & Bottleneck
class QueueStatus(BaseModel):
    gate_id: str
    gate_name: str
    incoming_flow_per_min: float
    processing_rate_per_min: float
    queue_length: int
    estimated_wait_time_sec: float
    status: str  # NORMAL, MODERATE, CRITICAL BOTTLENECK

class BottleneckAlert(BaseModel):
    id: str
    location_name: str
    x: float
    y: float
    current_density: float
    severity: str  # ELEVATED, HIGH, CRITICAL
    reason: str
    recommended_action: str

# AI Risk & Prediction
class RiskFactor(BaseModel):
    name: str
    score: float  # 0 to 100
    weight: float
    status: str
    details: str

class AIRiskAnalysis(BaseModel):
    risk_score: float  # 0-100
    category: str  # LOW, MODERATE, ELEVATED, HIGH, CRITICAL
    reasons: List[str]
    recommendations: List[str]
    factors: List[RiskFactor]
    bottlenecks: List[BottleneckAlert]
    queue_statuses: List[QueueStatus]

class CrowdPrediction(BaseModel):
    current_crowd: int
    predicted_10m: int
    predicted_30m: int
    predicted_60m: int
    time_to_capacity_exceedance_min: Optional[float] = None
    status_summary: str
    zone_forecasts: List[Dict[str, Any]] = []
    current_inflow_per_min: float = 0.0
    current_outflow_per_min: float = 0.0

# Emergency
class EmergencyTrigger(BaseModel):
    scenario_type: str  # fire, exit_blockage, medical, stampede, power_failure, vip_movement, multi_exit_failure
    location_x: Optional[float] = None
    location_y: Optional[float] = None
    radius: Optional[float] = 15.0
    blocked_exit_id: Optional[str] = None

class EvacuationStatus(BaseModel):
    is_active: bool
    scenario_type: Optional[str] = None
    elapsed_seconds: float = 0.0
    total_people: int = 0
    exited_people: int = 0
    remaining_people: int = 0
    evacuation_percentage: float = 0.0
    estimated_completion_seconds: float = 0.0
    average_evacuation_speed: float = 1.2
    is_completed: bool = False

# What-If
class WhatIfModification(BaseModel):
    action: str  # add_exit, add_gate, close_gate, widen_corridor, add_barricade, adjust_flow, adjust_security_rate
    target_id: Optional[str] = None
    params: Dict[str, Any] = {}

class WhatIfScenarioResult(BaseModel):
    name: str
    risk_score: float
    max_density: float
    evacuation_time_sec: float
    bottlenecks_count: int
    avg_wait_time_sec: float
    throughput_per_min: float
    congestion_delta_percent: float
    recommendation: str
    is_optimal: bool = False
    modified_blueprint: Optional[Dict[str, Any]] = None

class WhatIfOptimizationResponse(BaseModel):
    baseline: WhatIfScenarioResult
    scenarios: List[WhatIfScenarioResult]
    best_recommendation: str
