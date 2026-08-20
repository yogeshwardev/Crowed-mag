import math
import random
from typing import Optional, List, Tuple, Dict, Any
from models.schemas import AgentState

class SimulationAgent:
    def __init__(
        self,
        agent_id: int,
        x: float,
        y: float,
        target_x: float,
        target_y: float,
        speed: float = 1.25,
        state: str = "WALKING",
        zone: str = "MAIN",
        color_index: Optional[int] = None,
        height_scale: Optional[float] = None
    ):
        self.id = agent_id
        self.x = float(x)
        self.y = float(y)
        self.vx = 0.0
        self.vy = 0.0
        self.target_x = float(target_x)
        self.target_y = float(target_y)
        self.desired_speed = float(speed + random.uniform(-0.15, 0.25))
        self.base_speed = self.desired_speed
        self.state = state  # WALKING, QUEUING, WAITING, ENTERING, EXITING, EVACUATING, REROUTING, BLOCKED, PANIC, STUMBLING, FALLEN, SAFE
        self.zone = zone
        self.exit_id: Optional[str] = None
        self.color_index = color_index if color_index is not None else random.randint(0, 7)
        self.height_scale = height_scale if height_scale is not None else round(random.uniform(0.88, 1.12), 2)

        # Queue tracking
        self.queue_id: Optional[str] = None
        self.queue_position: int = 0
        self.queue_wait_time: float = 0.0

        # Physical parameters for Social Force & Hard Collision Mechanics
        self.radius = 0.32  # human shoulder radius ~32cm
        self.mass = float(random.uniform(62.0, 85.0))  # individual body mass in kg
        self.relaxation_time = 0.35
        self.panic_level = 0.0
        self.local_density = 0.0
        self.crush_pressure = 0.0  # N/m physical pressure experienced
        self.smoke_inhalation = 0.0 # 0.0 to 1.0 toxic smoke exposure

        # Stumble / Fall recovery timer
        self.fall_timer = 0.0

        # Path waypoints
        self.waypoints: List[Tuple[float, float]] = []
        self.current_waypoint_idx = 0
        self.wander_timer = random.uniform(5.0, 15.0)

    def set_target(self, tx: float, ty: float, waypoints: Optional[List[Tuple[float, float]]] = None):
        self.target_x = tx
        self.target_y = ty
        if waypoints:
            self.waypoints = waypoints
            self.current_waypoint_idx = 0
        else:
            self.waypoints = [(tx, ty)]
            self.current_waypoint_idx = 0

    def trigger_emergency(self, evacuation_target: Optional[Tuple[float, float]] = None, panic: float = 1.0):
        if self.state != "SAFE":
            self.state = "PANIC" if panic > 0.6 else "EVACUATING"
            self.panic_level = max(self.panic_level, panic)
            self.desired_speed = random.uniform(3.4, 4.8)  # rapid sprint / stampede speed
            if evacuation_target:
                self.target_x, self.target_y = evacuation_target
                self.waypoints = [evacuation_target]
                self.current_waypoint_idx = 0

    def update_social_forces(
        self,
        dt: float,
        nav_mesh,
        nearby_agents: List['SimulationAgent'],
        danger_zones: Optional[List[Dict]] = None,
        fire_grid: Optional[Any] = None,
        is_emergency: bool = False
    ):
        """
        Updates agent acceleration, velocity, and position via Social Force Model,
        incorporating Panic Contagion, Smoke Inhalation, High-Density Compression,
        and Stampede Physics.
        """
        if self.state == "SAFE":
            return

        # 0. Handle Stumble / Fall State
        if self.state in ["FALLEN", "STUMBLING"]:
            self.fall_timer -= dt
            self.vx *= 0.5
            self.vy *= 0.5
            if self.fall_timer <= 0:
                # Recover back to feet
                self.state = "PANIC" if is_emergency else "WALKING"
            return

        # 1. Fire and Smoke Grid Environmental Interaction
        f_hazard_x = 0.0
        f_hazard_y = 0.0
        if fire_grid:
            temp, flame, smoke = fire_grid.sample_at(self.x, self.y)
            # Smoke inhalation reduces speed and causes coughing
            if smoke > 0.1:
                self.smoke_inhalation = min(1.0, self.smoke_inhalation + smoke * dt * 0.2)
                self.panic_level = min(1.0, self.panic_level + smoke * dt * 0.8)
                self.desired_speed = max(0.6, self.base_speed * (1.0 - self.smoke_inhalation * 0.65))

            # Heat avoidance force (gradient away from heat)
            if temp > 60.0 or flame > 0.05:
                self.panic_level = 1.0
                self.state = "PANIC"
                self.desired_speed = random.uniform(3.6, 5.0)

                # Sample surrounding temperature to find gradient of escape
                t_right, _, _ = fire_grid.sample_at(self.x + 2.0, self.y)
                t_left, _, _ = fire_grid.sample_at(self.x - 2.0, self.y)
                t_up, _, _ = fire_grid.sample_at(self.x, self.y + 2.0)
                t_down, _, _ = fire_grid.sample_at(self.x, self.y - 2.0)

                grad_x = (t_right - t_left) / 4.0
                grad_y = (t_up - t_down) / 4.0
                g_mag = math.hypot(grad_x, grad_y) + 1e-6

                push_mag = min(5000.0, 500.0 + (temp - 60.0) * 15.0)
                f_hazard_x -= (grad_x / g_mag) * push_mag
                f_hazard_y -= (grad_y / g_mag) * push_mag
        elif danger_zones:
            for dz in danger_zones:
                dx = self.x - dz["x"]
                dy = self.y - dz["y"]
                dist = math.hypot(dx, dy)
                r = dz.get("radius", 15.0)
                if dist < r * 1.6:
                    self.panic_level = 1.0
                    self.state = "PANIC"
                    self.desired_speed = random.uniform(3.6, 4.8)
                    d_safe = max(0.1, dist)
                    push = 4500.0 * (1.0 - min(1.0, dist / (r * 1.6)))
                    f_hazard_x += (dx / d_safe) * push
                    f_hazard_y += (dy / d_safe) * push

        # 2. Check Local Density, Panic Contagion & Contact Forces
        nearby_count = 0
        max_nearby_panic = 0.0
        f_agents_x = 0.0
        f_agents_y = 0.0
        total_pressure = 0.0

        is_stampeding = is_emergency or self.state in ["EVACUATING", "PANIC"] or self.panic_level > 0.5

        A = 2800.0 if is_stampeding else 1500.0
        B = 0.16

        for other in nearby_agents:
            if other.id == self.id or other.state == "SAFE":
                continue
            dx = self.x - other.x
            dy = self.y - other.y
            dist = math.hypot(dx, dy)
            if dist < 0.001:
                dx, dy = random.uniform(-0.1, 0.1), random.uniform(-0.1, 0.1)
                dist = math.hypot(dx, dy)

            if dist < 2.5:
                nearby_count += 1
                max_nearby_panic = max(max_nearby_panic, other.panic_level)

                r_sum = self.radius + other.radius
                n_x = dx / dist
                n_y = dy / dist
                overlap = r_sum - dist

                # Social psychological repulsion
                repulsion = A * math.exp((r_sum - dist) / B)

                if overlap > 0:
                    # Physical compression stiffness (Crush pressure during stampede)
                    contact_force = 18000.0 * overlap
                    repulsion += contact_force
                    total_pressure += contact_force

                    # Tangential sliding friction
                    t_x = -n_y
                    t_y = n_x
                    delta_v = (other.vx - self.vx) * t_x + (other.vy - self.vy) * t_y
                    f_agents_x += 1600.0 * overlap * delta_v * t_x
                    f_agents_y += 1600.0 * overlap * delta_v * t_y

                f_agents_x += n_x * repulsion
                f_agents_y += n_y * repulsion

        # Local density in agents/m² (approx circle area ~ 19.6 m²)
        self.local_density = nearby_count / 19.6
        self.crush_pressure = total_pressure / max(1.0, math.pi * self.radius * 2.0)

        # Stumble check under severe crush pressure and stampede sprint
        if is_stampeding and self.crush_pressure > 3500.0 and random.random() < 0.003:
            self.state = "FALLEN"
            self.fall_timer = random.uniform(2.0, 4.5)
            return

        # Panic emotional contagion spread
        if max_nearby_panic > 0.4 and self.panic_level < max_nearby_panic:
            self.panic_level = min(1.0, self.panic_level + max_nearby_panic * dt * 2.5)
            if self.panic_level > 0.6 and self.state not in ["PANIC", "SAFE", "FALLEN"]:
                self.state = "PANIC"
                self.desired_speed = random.uniform(3.4, 4.8)

        # 3. Driving Force towards current waypoint or emergency exit gradient
        if is_stampeding:
            dir_x, dir_y = nav_mesh.get_evacuation_direction(self.x, self.y)
            if math.hypot(dir_x, dir_y) < 0.1:
                dx = self.target_x - self.x
                dy = self.target_y - self.y
                d = math.hypot(dx, dy) + 1e-6
                dir_x, dir_y = dx / d, dy / d
            self.desired_speed = random.uniform(3.4, 4.8)
        else:
            # Normal Pedestrian Waypoint Navigation & Autonomous Wandering
            self.wander_timer -= dt
            dist_to_goal = math.hypot(self.target_x - self.x, self.target_y - self.y)

            if dist_to_goal < 2.0 or self.wander_timer <= 0:
                self.wander_timer = random.uniform(8.0, 20.0)
                new_tx = random.uniform(8.0, nav_mesh.width - 8.0)
                new_ty = random.uniform(8.0, nav_mesh.length - 8.0)
                if nav_mesh.is_walkable(new_tx, new_ty):
                    self.target_x = new_tx
                    self.target_y = new_ty
                    self.waypoints = [(new_tx, new_ty)]
                    self.current_waypoint_idx = 0
                    if self.state != "QUEUING":
                        self.state = "WALKING"

            if self.current_waypoint_idx < len(self.waypoints):
                wx, wy = self.waypoints[self.current_waypoint_idx]
                dist_to_wp = math.hypot(wx - self.x, wy - self.y)
                if dist_to_wp < 1.2:
                    self.current_waypoint_idx += 1
                    if self.current_waypoint_idx < len(self.waypoints):
                        wx, wy = self.waypoints[self.current_waypoint_idx]

                dx = wx - self.x
                dy = wy - self.y
                d = math.hypot(dx, dy) + 1e-6
                dir_x, dir_y = dx / d, dy / d
            else:
                dx = self.target_x - self.x
                dy = self.target_y - self.y
                d = math.hypot(dx, dy) + 1e-6
                dir_x, dir_y = dx / d, dy / d

            self.desired_speed = self.base_speed

        # Bottleneck velocity constraint by physical crowd density
        if self.local_density > 3.5 and not is_stampeding:
            self.desired_speed = max(0.4, self.base_speed * (1.0 - (self.local_density - 3.5) * 0.2))

        desired_vx = dir_x * self.desired_speed
        desired_vy = dir_y * self.desired_speed

        # Relaxation force: (v_desired - v) / tau
        f_drive_x = (desired_vx - self.vx) / self.relaxation_time
        f_drive_y = (desired_vy - self.vy) / self.relaxation_time

        # 4. Wall / Obstacle repulsion
        f_walls_x = 0.0
        f_walls_y = 0.0
        wall_check_offsets = [(-0.7, 0), (0.7, 0), (0, -0.7), (0, 0.7), (-0.5, -0.5), (0.5, 0.5)]
        for ox, oy in wall_check_offsets:
            cx = self.x + ox
            cy = self.y + oy
            if not nav_mesh.is_walkable(cx, cy):
                dist = math.hypot(ox, oy)
                n_x = -ox / dist
                n_y = -oy / dist
                f_walls_x += n_x * 1200.0
                f_walls_y += n_y * 1200.0

        # Total acceleration: (F_total) / mass
        acc_x = (f_drive_x + (f_agents_x + f_walls_x + f_hazard_x) / self.mass)
        acc_y = (f_drive_y + (f_agents_y + f_walls_y + f_hazard_y) / self.mass)

        # Integrate velocity
        self.vx += acc_x * dt
        self.vy += acc_y * dt

        # Cap velocity
        speed = math.hypot(self.vx, self.vy)
        max_speed = self.desired_speed * 1.6
        if speed > max_speed:
            self.vx = (self.vx / speed) * max_speed
            self.vy = (self.vy / speed) * max_speed

        # Integrate position
        new_x = self.x + self.vx * dt
        new_y = self.y + self.vy * dt

        # Boundary and collision clamp
        if 0 <= new_x <= nav_mesh.width and 0 <= new_y <= nav_mesh.length:
            if nav_mesh.is_walkable(new_x, new_y):
                self.x = new_x
                self.y = new_y
            else:
                if nav_mesh.is_walkable(new_x, self.y):
                    self.x = new_x
                    self.vy *= 0.2
                elif nav_mesh.is_walkable(self.x, new_y):
                    self.y = new_y
                    self.vx *= 0.2
                else:
                    self.vx = 0.0
                    self.vy = 0.0

        # Check exit reach
        if is_stampeding:
            dist_to_exit = nav_mesh.get_distance_to_nearest_exit(self.x, self.y)
            if dist_to_exit < 2.0:
                self.state = "SAFE"
                self.vx = 0.0
                self.vy = 0.0

    def resolve_hard_collision(self, other: 'SimulationAgent') -> float:
        """
        Hard circle-circle non-penetration position constraint solver (Position-Based Dynamics).
        Returns overlap amount.
        """
        if other.id == self.id or self.state == "SAFE" or other.state == "SAFE":
            return 0.0

        dx = self.x - other.x
        dy = self.y - other.y
        dist = math.hypot(dx, dy)
        min_dist = self.radius + other.radius

        if dist < min_dist and dist > 1e-6:
            overlap = min_dist - dist
            nx = dx / dist
            ny = dy / dist

            # Mass-weighted displacement
            total_mass = self.mass + other.mass
            ratio_self = other.mass / total_mass
            ratio_other = self.mass / total_mass

            # Positional correction
            self.x += nx * overlap * ratio_self
            self.y += ny * overlap * ratio_self
            other.x -= nx * overlap * ratio_other
            other.y -= ny * overlap * ratio_other

            # Elastic impulse velocity exchange
            rel_vx = self.vx - other.vx
            rel_vy = self.vy - other.vy
            vel_along_normal = rel_vx * nx + rel_vy * ny

            if vel_along_normal < 0:
                restitution = 0.25
                impulse_mag = -(1.0 + restitution) * vel_along_normal / (1.0 / self.mass + 1.0 / other.mass)
                self.vx += (impulse_mag / self.mass) * nx
                self.vy += (impulse_mag / self.mass) * ny
                other.vx -= (impulse_mag / other.mass) * nx
                other.vy -= (impulse_mag / other.mass) * ny

            return overlap

        return 0.0

    def to_state_dict(self) -> Dict:
        return {
            "id": self.id,
            "x": round(self.x, 2),
            "y": round(self.y, 2),
            "vx": round(self.vx, 2),
            "vy": round(self.vy, 2),
            "target_x": round(self.target_x, 2),
            "target_y": round(self.target_y, 2),
            "speed": round(math.hypot(self.vx, self.vy), 2),
            "state": self.state,
            "zone": self.zone,
            "exit_id": self.exit_id,
            "color_index": self.color_index,
            "height_scale": self.height_scale,
            "panic_level": round(self.panic_level, 2),
            "local_density": round(self.local_density, 2),
            "crush_pressure": round(self.crush_pressure, 1),
            "smoke_inhalation": round(self.smoke_inhalation, 2)
        }
