import os
import asyncio
import json
import time
from typing import Dict, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import engine, Base, get_db
from models.db_models import BlueprintModel, SimulationSnapshotModel, SafetyReportModel
from models.schemas import (
    BlueprintCreate, BlueprintResponse, CapacityCalculation,
    EmergencyTrigger, AIRiskAnalysis, CrowdPrediction,
    WhatIfOptimizationResponse
)
from simulation.engine import SimulationEngine
from ai.risk_engine import AISafetyAdvisor
from ai.prediction import CrowdForecaster
from ai.optimizer import WhatIfOptimizer
from reports.pdf_generator import SafetyReportGenerator
from templates.venue_presets import ALL_PRESETS, get_stadium_preset

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CrowdSafe AI — Core Simulation & Safety Gateway",
    version="2.4.0",
    description="Intelligent Crowd Management, 3D Digital Twin, and Emergency Evacuation Engine"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize engines
sim_engine = SimulationEngine()
risk_advisor = AISafetyAdvisor()
forecaster = CrowdForecaster()
whatif_optimizer = WhatIfOptimizer()
pdf_generator = SafetyReportGenerator()

# WebSocket connections tracker
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection)

ws_manager = ConnectionManager()

# Background simulation tick loop
async def simulation_background_loop():
    while True:
        try:
            if sim_engine.is_running:
                snapshot = sim_engine.tick(0.05)  # 20 Hz smooth tick rate
                # Record sample for forecaster
                forecaster.record_crowd_sample(time.time(), snapshot.get("active_agent_count", 0))
                
                # Broadcast over WebSocket only if clients connected
                if ws_manager.active_connections:
                    payload = json.dumps({"type": "TELEMETRY", "data": snapshot})
                    await ws_manager.broadcast(payload)
            await asyncio.sleep(0.05)
        except Exception:
            await asyncio.sleep(0.05)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(simulation_background_loop())

@app.get("/")
@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "ONLINE",
        "system": "CrowdSafe AI",
        "version": "2.4.0",
        "simulation_running": sim_engine.is_running,
        "active_agents": len(sim_engine.agents),
        "timestamp": time.time()
    }

@app.post("/api/v1/auth/login")
@app.post("/api/auth/login")
def auth_login():
    return {"access_token": "crowdsafe-dev-token", "token_type": "bearer", "status": "success"}

# ================= VENUE TEMPLATES & BLUEPRINTS =================
@app.get("/api/templates")
def list_templates():
    return [
        {"id": k, "name": v().get("name"), "type": k, "description": v().get("description")}
        for k, v in ALL_PRESETS.items()
    ]

@app.get("/api/templates/{preset_name}")
def get_template(preset_name: str):
    getter = ALL_PRESETS.get(preset_name.lower())
    if not getter:
        raise HTTPException(status_code=404, detail=f"Template '{preset_name}' not found")
    return getter()

@app.post("/api/blueprint/load")
def load_blueprint_to_simulation(blueprint: Dict[str, Any]):
    sim_engine.load_blueprint(blueprint)
    return {"status": "SUCCESS", "message": f"Loaded blueprint '{sim_engine.venue_name}' into digital twin."}

@app.post("/api/blueprint/save")
def save_blueprint(bp: BlueprintCreate, db: Session = Depends(get_db)):
    import uuid
    bp_id = f"bp_{uuid.uuid4().hex[:10]}"
    db_obj = BlueprintModel(
        id=bp_id,
        name=bp.name,
        description=bp.description,
        venue_type=bp.venue_type,
        width=bp.width,
        length=bp.length,
        scale=bp.scale,
        elements=[e.model_dump() for e in bp.elements]
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return {"id": db_obj.id, "status": "SAVED"}

@app.get("/api/blueprints")
def list_saved_blueprints(db: Session = Depends(get_db)):
    items = db.query(BlueprintModel).order_by(BlueprintModel.updated_at.desc()).all()
    return [
        {
            "id": b.id,
            "name": b.name,
            "venue_type": b.venue_type,
            "width": b.width,
            "length": b.length,
            "elements_count": len(b.elements or []),
            "updated_at": b.updated_at.isoformat() if b.updated_at else None
        } for b in items
    ]

# ================= SIMULATION CONTROLS =================
@app.post("/api/simulation/spawn")
def set_crowd_size(count: int = 800):
    sim_engine.spawn_crowd(max(10, min(10000, count)))
    return {"status": "SPAWNED", "count": len(sim_engine.agents)}

@app.post("/api/simulation/speed")
def set_simulation_speed(speed: float = 1.0):
    sim_engine.speed_multiplier = max(0.1, min(10.0, speed))
    return {"status": "SPEED_UPDATED", "speed_multiplier": sim_engine.speed_multiplier}

@app.post("/api/simulation/pause")
def pause_simulation():
    sim_engine.is_running = False
    return {"status": "PAUSED"}

@app.post("/api/simulation/resume")
def resume_simulation():
    sim_engine.is_running = True
    return {"status": "RESUMED"}

@app.post("/api/simulation/step")
def step_simulation():
    sim_engine.is_running = False
    snapshot = sim_engine.tick(0.04)
    return {"status": "STEPPED", "telemetry": snapshot}

@app.get("/api/simulation/telemetry")
def get_current_telemetry():
    return sim_engine.get_telemetry_snapshot()

# ================= EMERGENCY CONTROLS =================
@app.post("/api/emergency/trigger")
def trigger_emergency(trigger: EmergencyTrigger):
    sim_engine.trigger_emergency(
        scenario_type=trigger.scenario_type,
        x=trigger.location_x,
        y=trigger.location_y,
        radius=trigger.radius or 15.0,
        blocked_exit_id=trigger.blocked_exit_id
    )
    return {"status": "EMERGENCY_TRIGGERED", "scenario": trigger.scenario_type}

@app.post("/api/emergency/clear")
def clear_emergency():
    sim_engine.clear_emergency()
    return {"status": "EMERGENCY_CLEARED"}

@app.post("/api/emergency/block_exit")
def block_exit(exit_id: str):
    sim_engine.block_exit(exit_id)
    return {"status": "EXIT_BLOCKED", "exit_id": exit_id}

@app.post("/api/emergency/unblock_exit")
def unblock_exit(exit_id: str):
    sim_engine.unblock_exit(exit_id)
    return {"status": "EXIT_UNBLOCKED", "exit_id": exit_id}

# ================= AI SAFETY & PREDICTION =================
@app.get("/api/ai/risk", response_model=AIRiskAnalysis)
def get_ai_risk_analysis():
    telemetry = sim_engine.get_telemetry_snapshot()
    analysis = risk_advisor.analyze(telemetry, sim_engine.blueprint_elements)
    return analysis

@app.get("/api/ai/prediction", response_model=CrowdPrediction)
def get_crowd_prediction():
    telemetry = sim_engine.get_telemetry_snapshot()
    capacity = sim_engine.calculate_capacity()
    # Estimate inflow/outflow from queue manager
    inflow_total = sum(q["incoming_flow_per_min"] for q in telemetry.get("queues", [])) or 180.0
    outflow_total = sum(q["processing_rate_per_min"] for q in telemetry.get("queues", [])) * 0.75 or 120.0
    
    prediction = forecaster.forecast(
        current_crowd=telemetry.get("active_agent_count", 800),
        inflow_per_min=inflow_total,
        outflow_per_min=outflow_total,
        safe_capacity=capacity.safe_capacity,
        max_capacity=capacity.maximum_capacity,
        density_matrix=telemetry.get("density_grid")
    )
    # Inject live flow rates into prediction response
    prediction.current_inflow_per_min = round(inflow_total, 1)
    prediction.current_outflow_per_min = round(outflow_total, 1)
    return prediction

# ================= AI VISION & CCTV ANALYTICS =================
@app.get("/api/ai/cctv")
def get_cctv_analytics():
    return sim_engine.last_vision_snapshot or sim_engine.vision_engine.analyze_frame(
        sim_engine.agents,
        sim_engine.danger_zones,
        sim_engine.is_emergency
    )

# ================= FIRE SIMULATION CONTROLS =================
@app.get("/api/fire/state")
def get_fire_simulation_state():
    return sim_engine.fire_grid.get_state_summary()

@app.post("/api/fire/ignite")
def ignite_fire(x: float, y: float, radius: float = 4.0, intensity: float = 1.0):
    sim_engine.trigger_emergency(scenario_type="fire", x=x, y=y, radius=radius)
    return {"status": "FIRE_IGNITED", "x": x, "y": y, "radius": radius}

@app.post("/api/fire/extinguish")
def extinguish_fire():
    sim_engine.fire_grid.clear()
    sim_engine.danger_zones = [dz for dz in sim_engine.danger_zones if dz.get("type") != "fire"]
    return {"status": "FIRE_EXTINGUISHED"}

# ================= WHAT-IF SAFETY OPTIMIZER =================
@app.post("/api/whatif/optimize", response_model=WhatIfOptimizationResponse)
def run_whatif_optimizer():
    current_bp = {
        "id": sim_engine.blueprint_id,
        "name": sim_engine.venue_name,
        "venue_type": sim_engine.venue_type,
        "width": sim_engine.width,
        "length": sim_engine.length,
        "scale": sim_engine.scale,
        "elements": sim_engine.blueprint_elements
    }
    telemetry = sim_engine.get_telemetry_snapshot()
    result = whatif_optimizer.optimize(current_bp, telemetry)
    return result

# ================= PDF SAFETY REPORTS =================
@app.post("/api/reports/generate")
def generate_safety_report():
    telemetry = sim_engine.get_telemetry_snapshot()
    capacity = sim_engine.calculate_capacity().model_dump()
    risk = risk_advisor.analyze(telemetry, sim_engine.blueprint_elements).model_dump()
    
    # Whatif data
    current_bp = {
        "id": sim_engine.blueprint_id,
        "name": sim_engine.venue_name,
        "elements": sim_engine.blueprint_elements,
        "width": sim_engine.width,
        "length": sim_engine.length
    }
    whatif = whatif_optimizer.optimize(current_bp, telemetry).model_dump()

    pdf_path = pdf_generator.generate_pdf(
        venue_name=sim_engine.venue_name,
        capacity_data=capacity,
        risk_data=risk,
        whatif_data=whatif
    )
    filename = os.path.basename(pdf_path)
    return {
        "status": "GENERATED",
        "filename": filename,
        "download_url": f"/api/reports/download/{filename}"
    }

@app.get("/api/reports/download/{filename}")
def download_report(filename: str):
    file_path = os.path.join(pdf_generator.output_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Report file not found")
    return FileResponse(file_path, media_type="application/pdf", filename=filename)

# ================= WEBSOCKET REAL-TIME STREAM =================
@app.websocket("/ws/simulation")
async def websocket_simulation_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial snapshot immediately
        init_snapshot = sim_engine.get_telemetry_snapshot()
        await websocket.send_text(json.dumps({"type": "INIT", "data": init_snapshot}))

        while True:
            raw_msg = await websocket.receive_text()
            try:
                data = json.loads(raw_msg)
                action = data.get("action")
                if action == "EMERGENCY_TRIGGER":
                    sim_engine.trigger_emergency(
                        scenario_type=data.get("scenario", "fire"),
                        x=data.get("x"),
                        y=data.get("y"),
                        radius=data.get("radius", 15.0),
                        blocked_exit_id=data.get("blocked_exit_id")
                    )
                elif action == "EMERGENCY_CLEAR":
                    sim_engine.clear_emergency()
                elif action == "SET_SPEED":
                    sim_engine.speed_multiplier = float(data.get("speed", 1.0))
                elif action == "SET_CROWD":
                    sim_engine.spawn_crowd(int(data.get("count", 800)))
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
