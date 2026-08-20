import time
import math
import random
import numpy as np
from typing import Dict, List, Optional, Set, Tuple, Any

from models.schemas import (
    CapacityCalculation, EvacuationStatus,
    QueueStatus, BottleneckAlert, AgentState
)
from simulation.pathfinding import NavigationMesh
from simulation.agent import SimulationAgent
from simulation.queue_model import GateQueueManager
from simulation.fire_sim import FireSimulationGrid
from ai.vision_detector import VisionAnalyticsEngine

class SimulationEngine:
    def __init__(self):
        self.blueprint_id: str = "stadium_default"
        self.venue_name: str = "Grand National Stadium"
        self.venue_type: str = "stadium"
        self.width: float = 120.0
        self.length: float = 80.0
        self.scale: float = 1.0

        self.nav_mesh = NavigationMesh(self.width, self.length, resolution=1.0)
        self.queue_manager = GateQueueManager()
        self.fire_grid = FireSimulationGrid(self.width, self.length, resolution=1.0)
        self.vision_engine = VisionAnalyticsEngine(self.width, self.length)

        self.agents: List[SimulationAgent] = []
        self.blueprint_elements: List[Dict] = []
        self.blocked_exits: Set[str] = set()
        self.danger_zones: List[Dict] = []

        # Simulation loop state
        self.is_running: bool = True
        self.speed_multiplier: float = 1.0
        self.tick_count: int = 0
        self.last_tick_time: float = time.time()

        # Emergency state
        self.is_emergency: bool = False
        self.emergency_scenario: Optional[str] = None
        self.emergency_start_time: Optional[float] = None
        self.total_evac_target: int = 0
        self.exited_count: int = 0

        # Density grid & spatial hash
        self.density_cols = 24
        self.density_rows = 16
        self.density_matrix = np.zeros((self.density_rows, self.density_cols), dtype=np.float32)

        # Capacity metrics
        self.safe_density_threshold = 2.0
        self.warning_density_threshold = 3.5
        self.critical_density_threshold = 4.5

        # Cached vision analytics result
        self.last_vision_snapshot: Dict[str, Any] = {}

        # Initialize with default layout
        self.load_default_venue()

    def load_blueprint(self, blueprint_data: Dict[str, Any]):
        self.blueprint_id = blueprint_data.get("id", "custom_blueprint")
        self.venue_name = blueprint_data.get("name", "Custom Venue")
        self.venue_type = blueprint_data.get("venue_type", "custom")
        self.width = float(blueprint_data.get("width", 120.0))
        self.length = float(blueprint_data.get("length", 80.0))
        self.scale = float(blueprint_data.get("scale", 1.0))
        self.blueprint_elements = blueprint_data.get("elements", [])

        self.nav_mesh = NavigationMesh(self.width, self.length, resolution=1.0)
        self.fire_grid = FireSimulationGrid(self.width, self.length, resolution=1.0)
        self.fire_grid.initialize_from_blueprint(self.blueprint_elements)
        self.vision_engine.configure_cameras(self.width, self.length)

        self.blocked_exits.clear()
        self.danger_zones.clear()
        self.is_emergency = False
        self.emergency_scenario = None
        self.emergency_start_time = None
        self.exited_count = 0

        self.nav_mesh.build_from_blueprint(self.blueprint_elements, self.danger_zones, self.blocked_exits)

        # Re-register queues for gates
        self.queue_manager = GateQueueManager()
        for el in self.blueprint_elements:
            if el.get("type") in ["entry_gate", "security", "ticket_counter"]:
                rate = el.get("capacity_rate") or 120.0
                self.queue_manager.register_gate(
                    gate_id=el.get("id", f"gate_{random.randint(100,999)}"),
                    gate_name=el.get("label") or f"Gate {el.get('id')}",
                    x=float(el.get("x", 0)),
                    y=float(el.get("y", 0)),
                    processing_rate_per_min=float(rate),
                    gate_type=el.get("type", "security")
                )

        # Spawn initial crowd
        target_count = len(self.agents) if len(self.agents) > 0 else 800
        self.spawn_crowd(target_count)

    def load_default_venue(self):
        """Loads a realistic stadium preset by default."""
        from templates.venue_presets import get_stadium_preset
        preset = get_stadium_preset()
        self.load_blueprint(preset)

    def spawn_crowd(self, count: int = 800):
        self.agents.clear()
        self.exited_count = 0
        seating_areas = [el for el in self.blueprint_elements if el.get("type") == "seating"]
        entries = [el for el in self.blueprint_elements if el.get("type") in ["entry_gate", "security"]]

        for i in range(count):
            # Spawn near entries, roads, concourses or seating
            if i % 3 == 0 and seating_areas:
                s = random.choice(seating_areas)
                sx = s["x"] + random.uniform(-s["width"]/2.5, s["width"]/2.5)
                sy = s["y"] + random.uniform(-s["height"]/2.5, s["height"]/2.5)
                tx = sx + random.uniform(-2, 2)
                ty = sy + random.uniform(-2, 2)
                state = "WAITING"
            elif entries:
                e = random.choice(entries)
                # Spawn in entry approach queue
                sx = e["x"] + random.uniform(-6, 6)
                sy = max(2.0, e["y"] - random.uniform(2, 18))
                tx = e["x"] + random.uniform(-1, 1)
                ty = e["y"] + random.uniform(5, 25)
                state = "QUEUING"
            else:
                sx = random.uniform(5, self.width - 5)
                sy = random.uniform(5, self.length - 5)
                tx = random.uniform(5, self.width - 5)
                ty = random.uniform(5, self.length - 5)
                state = "WALKING"

            agent = SimulationAgent(
                agent_id=i + 1,
                x=sx,
                y=sy,
                target_x=tx,
                target_y=ty,
                speed=random.uniform(1.1, 1.4),
                state=state,
                zone="CONCOURSE" if sy > 30 else "ENTRY"
            )
            self.agents.append(agent)

    def trigger_emergency(self, scenario_type: str, x: Optional[float] = None, y: Optional[float] = None, radius: float = 15.0, blocked_exit_id: Optional[str] = None):
        self.is_emergency = True
        self.emergency_scenario = scenario_type
        self.emergency_start_time = time.time()
        self.total_evac_target = len([a for a in self.agents if a.state != "SAFE"])
        self.exited_count = 0

        fx = x if x is not None else (self.width / 2)
        fy = y if y is not None else (self.length / 2)

        if scenario_type == "fire":
            # Real physical fire ignition and spread
            self.fire_grid.ignite(fx, fy, radius=radius * 0.4, intensity=1.0)
            self.danger_zones = self.fire_grid.get_danger_zones()
            if not self.danger_zones:
                self.danger_zones.append({"x": fx, "y": fy, "radius": radius})
        elif scenario_type in ["stampede", "crowd_surge"]:
            self.danger_zones.append({"x": fx, "y": fy, "radius": radius})
        elif scenario_type == "exit_blockage" and blocked_exit_id:
            self.blocked_exits.add(blocked_exit_id)

        # Rebuild navigation mesh with updated danger zones and blocked exits
        self.nav_mesh.build_from_blueprint(self.blueprint_elements, self.danger_zones, self.blocked_exits)

        # Notify agents and ignite realistic panic contagion
        for a in self.agents:
            if a.state != "SAFE":
                dist_to_hazard = math.hypot(a.x - fx, a.y - fy)
                init_panic = max(0.4, 1.0 - (dist_to_hazard / max(30.0, radius * 2.5)))
                a.trigger_emergency(panic=init_panic)

    def clear_emergency(self):
        self.is_emergency = False
        self.emergency_scenario = None
        self.emergency_start_time = None
        self.danger_zones.clear()
        self.blocked_exits.clear()
        self.fire_grid.clear()
        self.nav_mesh.build_from_blueprint(self.blueprint_elements, self.danger_zones, self.blocked_exits)
        for a in self.agents:
            if a.state != "SAFE":
                a.panic_level = 0.0
                a.state = "WALKING"
                a.desired_speed = random.uniform(1.1, 1.4)
                a.target_x = random.uniform(10, self.width - 10)
                a.target_y = random.uniform(10, self.length - 10)

    def block_exit(self, exit_id: str):
        self.blocked_exits.add(exit_id)
        self.nav_mesh.build_from_blueprint(self.blueprint_elements, self.danger_zones, self.blocked_exits)

    def unblock_exit(self, exit_id: str):
        self.blocked_exits.discard(exit_id)
        self.nav_mesh.build_from_blueprint(self.blueprint_elements, self.danger_zones, self.blocked_exits)

    def tick(self, custom_dt: Optional[float] = None) -> Dict[str, Any]:
        """
        Advances the simulation by dt seconds:
        - Advances 2D fire & smoke simulation
        - Calculates multi-agent social forces
        - Executes multi-pass Position-Based Dynamics (PBD) hard collision resolution
        - Runs AI Computer Vision & Anomaly Detection inference
        """
        now = time.time()
        real_dt = now - self.last_tick_time
        self.last_tick_time = now
        dt = (custom_dt if custom_dt is not None else min(0.1, max(0.016, real_dt))) * self.speed_multiplier
        self.tick_count += 1

        if not self.is_running:
            return self.get_telemetry_snapshot()

        # 1. Advance Fire & Smoke Simulation Grid
        if self.fire_grid.is_active or self.is_emergency:
            self.fire_grid.tick(dt)
            # Dynamically update active danger zones from spreading fire
            fire_danger = self.fire_grid.get_danger_zones()
            if fire_danger:
                self.danger_zones = fire_danger
                if self.tick_count % 15 == 0:
                    self.nav_mesh.build_from_blueprint(self.blueprint_elements, self.danger_zones, self.blocked_exits)

        # 2. Spatial hashing for fast O(N) neighbor lookups
        cell_size = 4.0
        grid_buckets: Dict[Tuple[int, int], List[SimulationAgent]] = {}
        for a in self.agents:
            if a.state == "SAFE":
                continue
            bx = int(a.x / cell_size)
            by = int(a.y / cell_size)
            bucket_key = (bx, by)
            if bucket_key not in grid_buckets:
                grid_buckets[bucket_key] = []
            grid_buckets[bucket_key].append(a)

        # 3. Update agent social forces, navigation & environmental interaction
        for a in self.agents:
            if a.state == "SAFE":
                continue
            bx = int(a.x / cell_size)
            by = int(a.y / cell_size)
            neighbors = []
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    neighbors.extend(grid_buckets.get((bx + dx, by + dy), []))

            a.update_social_forces(
                dt,
                self.nav_mesh,
                neighbors,
                danger_zones=self.danger_zones,
                fire_grid=self.fire_grid,
                is_emergency=self.is_emergency
            )

        # 4. Multi-pass Hard Circle-Circle Non-Penetration Constraint Solver (PBD)
        # Prevents agents from overlapping or walking through each other
        solver_iterations = 2
        for _ in range(solver_iterations):
            for bucket_key, bucket_agents in grid_buckets.items():
                bx, by = bucket_key
                # Test pairs inside current bucket
                b_len = len(bucket_agents)
                for i in range(b_len):
                    a1 = bucket_agents[i]
                    if a1.state == "SAFE":
                        continue
                    for j in range(i + 1, b_len):
                        a2 = bucket_agents[j]
                        a1.resolve_hard_collision(a2)

                # Test with right, bottom, bottom-right, bottom-left adjacent buckets
                for dx, dy in [(1, 0), (0, 1), (1, 1), (-1, 1)]:
                    neighbor_bucket = grid_buckets.get((bx + dx, by + dy))
                    if neighbor_bucket:
                        for a1 in bucket_agents:
                            if a1.state == "SAFE":
                                continue
                            for a2 in neighbor_bucket:
                                a1.resolve_hard_collision(a2)

        # 5. Count safe / exited
        safe_count = sum(1 for a in self.agents if a.state == "SAFE")
        self.exited_count = safe_count

        # 6. Inflow rates for queues
        inflow_rates = {}
        for gid, q in self.queue_manager.queues.items():
            gx, gy = q["x"], q["y"]
            approaching = sum(1 for a in self.agents if a.state != "SAFE" and math.hypot(a.x - gx, a.y - gy) < 15.0)
            inflow_rates[gid] = float(approaching * 8.5)

        self.queue_manager.update(dt, inflow_rates)

        # 7. Update density matrix
        self.update_density_grid()

        # 8. Run AI Vision Analytics (every 3 ticks for performance)
        if self.tick_count % 3 == 0:
            self.last_vision_snapshot = self.vision_engine.analyze_frame(
                self.agents,
                self.danger_zones,
                self.is_emergency
            )

        return self.get_telemetry_snapshot()

    def update_density_grid(self):
        self.density_matrix.fill(0.0)
        cell_w = self.width / self.density_cols
        cell_h = self.length / self.density_rows
        cell_area = cell_w * cell_h

        for a in self.agents:
            if a.state == "SAFE":
                continue
            c = int(np.clip(a.x / cell_w, 0, self.density_cols - 1))
            r = int(np.clip(a.y / cell_h, 0, self.density_rows - 1))
            self.density_matrix[r, c] += 1.0

        # Convert to persons / m²
        self.density_matrix /= max(1.0, cell_area)

    def calculate_capacity(self) -> CapacityCalculation:
        total_area = self.width * self.length
        obstructed_area = 0.0
        for el in self.blueprint_elements:
            if el.get("type") in ["wall", "building", "restricted", "stage"]:
                obstructed_area += float(el.get("width", 0)) * float(el.get("height", 0))

        usable_area = max(100.0, total_area - obstructed_area)
        safe_cap = int(usable_area * self.safe_density_threshold)
        warn_cap = int(usable_area * self.warning_density_threshold)
        max_cap = int(usable_area * self.critical_density_threshold)

        active_crowd = len([a for a in self.agents if a.state != "SAFE"])
        pct = round((active_crowd / max_cap) * 100.0, 2) if max_cap > 0 else 0.0

        return CapacityCalculation(
            total_area_m2=round(total_area, 1),
            usable_area_m2=round(usable_area, 1),
            obstructed_area_m2=round(obstructed_area, 1),
            safe_capacity=safe_cap,
            warning_capacity=warn_cap,
            maximum_capacity=max_cap,
            current_occupancy=active_crowd,
            occupancy_percentage=pct,
            safe_density_threshold=self.safe_density_threshold,
            warning_density_threshold=self.warning_density_threshold,
            critical_density_threshold=self.critical_density_threshold
        )

    def get_evacuation_status(self) -> EvacuationStatus:
        if not self.is_emergency or self.emergency_start_time is None:
            return EvacuationStatus(is_active=False)

        elapsed = time.time() - self.emergency_start_time
        total = max(1, self.total_evac_target)
        exited = self.exited_count
        remaining = max(0, total - exited)
        pct = round(min(100.0, (exited / total) * 100.0), 2)

        # Estimate completion time based on exit flow
        rate = (exited / max(1.0, elapsed))  # people per sec
        est_sec = (remaining / rate) if rate > 0.1 else max(10.0, remaining * 0.8)

        return EvacuationStatus(
            is_active=True,
            scenario_type=self.emergency_scenario,
            elapsed_seconds=round(elapsed, 1),
            total_people=total,
            exited_people=exited,
            remaining_people=remaining,
            evacuation_percentage=pct,
            estimated_completion_seconds=round(est_sec, 1),
            average_evacuation_speed=2.8,
            is_completed=(remaining == 0)
        )

    def get_telemetry_snapshot(self) -> Dict[str, Any]:
        capacity = self.calculate_capacity()
        evacuation = self.get_evacuation_status()
        queues = self.queue_manager.get_queue_statuses()
        bottlenecks = self.queue_manager.detect_bottlenecks({})

        active_agents = [a for a in self.agents if a.state != "SAFE"]
        panic_agents = [a for a in self.agents if getattr(a, 'panic_level', 0) > 0.4 or a.state == "PANIC"]
        stumbling_agents = [a for a in self.agents if a.state in ["FALLEN", "STUMBLING"]]
        agent_dicts = [a.to_state_dict() for a in self.agents]

        peak_crush = float(max([getattr(a, 'crush_pressure', 0.0) for a in self.agents] or [0.0]))

        return {
            "venue_name": self.venue_name,
            "blueprint_id": self.blueprint_id,
            "venue_type": self.venue_type,
            "tick": self.tick_count,
            "is_emergency": self.is_emergency,
            "emergency_scenario": self.emergency_scenario,
            "danger_zones": self.danger_zones,
            "blocked_exits": list(self.blocked_exits),
            "capacity": capacity.model_dump(),
            "evacuation": evacuation.model_dump(),
            "queues": [q.model_dump() for q in queues],
            "bottlenecks": [b.model_dump() for b in bottlenecks],
            "max_density": round(float(np.max(self.density_matrix)), 2),
            "avg_density": round(float(np.mean(self.density_matrix)), 2),
            "density_grid": self.density_matrix.round(2).tolist(),
            "active_agent_count": len(active_agents),
            "total_agent_count": len(self.agents),
            "panic_agent_count": len(panic_agents),
            "stumbling_agent_count": len(stumbling_agents),
            "peak_crush_pressure_n": round(peak_crush, 1),
            "fire_state": self.fire_grid.get_state_summary(),
            "vision_analytics": self.last_vision_snapshot,
            "agents": agent_dicts
        }
