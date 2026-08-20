import math
import random
from typing import Optional, List, Tuple, Dict, Any

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
        height_scale: Optional[float] = None,
        home_exit_id: Optional[str] = None,
        assigned_role: str = "PEDESTRIAN"
    ):
        self.id = agent_id
        self.x = float(x)
        self.y = float(y)
        self.vx = 0.0
        self.vy = 0.0
        self.target_x = float(target_x)
        self.target_y = float(target_y)
        self.home_x = float(x)
        self.home_y = float(y)
        self.desired_speed = float(speed + random.uniform(-0.15, 0.25))
        self.base_speed = self.desired_speed
        self.state = state  # WALKING, QUEUING, WAITING, ENTERING, EXITING, EVACUATING, REROUTING, BLOCKED, PANIC, STUMBLING, FALLEN, SAFE
        self.zone = zone
        self.exit_id: Optional[str] = None
        self.home_exit_id = home_exit_id
        self.assigned_role = assigned_role  # SEATED, QUEUING, CONCESSION, PEDESTRIAN
        self.color_index = color_index if color_index is not None else random.randint(0, 9)
        self.height_scale = height_scale if height_scale is not None else round(random.uniform(0.88, 1.12), 2)

        # Activity lifecycle & autonomous decision making
        self.activity_timer = random.uniform(8.0, 25.0)
        self.activity_state = "IDLE"  # IDLE, TO_CONCESSION, TO_RESTROOM, RETURNING_SEAT, CIRCULATING
        self.seat_target = (float(x), float(y))

        # Queue tracking
        self.queue_id: Optional[str] = None
        self.queue_progress = random.uniform(0.0, 5.0)

        # Physical parameters for Social Force & Hard Collision Mechanics
        self.radius = 0.32  # human shoulder radius ~32cm
        self.mass = float(random.uniform(62.0, 85.0))  # individual body mass in kg
        self.relaxation_time = 0.35
        self.panic_level = 0.0
        self.local_density = 0.0
        self.crush_pressure = 0.0  # N/m physical pressure experienced
        self.smoke_inhalation = 0.0 # 0.0 to 1.0 toxic smoke exposure

        # Psychological reaction delay (freezing / orienting reflex before moving)
        self.reaction_delay = 0.0

        # Stumble / Fall recovery timer
        self.fall_timer = 0.0

        # Path waypoints
        self.waypoints: List[Tuple[float, float]] = [(target_x, target_y)]
        self.current_waypoint_idx = 0
        self.wander_timer = random.uniform(4.0, 12.0)

    def set_target(self, tx: float, ty: float, waypoints: Optional[List[Tuple[float, float]]] = None):
        self.target_x = float(tx)
        self.target_y = float(ty)
        if waypoints:
            self.waypoints = waypoints
            self.current_waypoint_idx = 0
        else:
            self.waypoints = [(float(tx), float(ty))]
            self.current_waypoint_idx = 0

    def trigger_emergency(self, evacuation_target: Optional[Tuple[float, float]] = None, panic: float = 1.0, fire_origin: Optional[Tuple[float, float]] = None):
        if self.state == "SAFE":
            return

        # Calculate reaction delay based on distance to danger
        if fire_origin:
            dist = math.hypot(self.x - fire_origin[0], self.y - fire_origin[1])
            self.reaction_delay = min(1.8, dist * 0.03 + random.uniform(0.05, 0.3))
        else:
            self.reaction_delay = random.uniform(0.05, 0.6)

        self.panic_level = max(self.panic_level, panic)
        self.state = "PANIC" if panic > 0.55 else "EVACUATING"
        self.desired_speed = random.uniform(3.8, 5.2)

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
        is_emergency: bool = False,
        amenities: Optional[List[Dict]] = None
    ):
        """
        Updates agent acceleration, velocity, and position via Social Force Model,
        incorporating Reaction Delay, Radial Fire Repulsion, Panic Contagion,
        Herding Behavior, Autonomous Pedestrian Circulation, and PBD Hard Collisions.
        """
        if self.state == "SAFE":
            return

        # 0. Handle Stumble / Fall State
        if self.state in ["FALLEN", "STUMBLING"]:
            self.fall_timer -= dt
            self.vx *= 0.3
            self.vy *= 0.3
            if self.fall_timer <= 0:
                self.state = "PANIC" if is_emergency else "WALKING"
            return

        # 0.1 Reaction Delay (Human Freezing / Hesitation when alarm rings)
        if self.reaction_delay > 0:
            self.reaction_delay -= dt
            self.vx *= 0.7
            self.vy *= 0.7
            return

        # 1. Fire and Smoke Grid Environmental Interaction & Direct Radial Flee
        f_hazard_x = 0.0
        f_hazard_y = 0.0

        if fire_grid:
            temp, flame, smoke = fire_grid.sample_at(self.x, self.y)
            if smoke > 0.08:
                self.smoke_inhalation = min(1.0, self.smoke_inhalation + smoke * dt * 0.3)
                self.panic_level = min(1.0, self.panic_level + smoke * dt * 1.0)
                self.desired_speed = max(0.6, self.base_speed * (1.0 - self.smoke_inhalation * 0.65))

            if temp > 45.0 or flame > 0.02:
                self.panic_level = 1.0
                self.state = "PANIC"
                self.desired_speed = random.uniform(3.8, 5.2)

                # Gradient away from heat
                t_right, _, _ = fire_grid.sample_at(self.x + 2.0, self.y)
                t_left, _, _ = fire_grid.sample_at(self.x - 2.0, self.y)
                t_up, _, _ = fire_grid.sample_at(self.x, self.y + 2.0)
                t_down, _, _ = fire_grid.sample_at(self.x, self.y - 2.0)

                grad_x = (t_right - t_left) / 4.0
                grad_y = (t_up - t_down) / 4.0
                g_mag = math.hypot(grad_x, grad_y) + 1e-6

                push_mag = min(6500.0, 700.0 + (temp - 45.0) * 25.0)
                f_hazard_x -= (grad_x / g_mag) * push_mag
                f_hazard_y -= (grad_y / g_mag) * push_mag

        if danger_zones:
            for dz in danger_zones:
                dx = self.x - dz["x"]
                dy = self.y - dz["y"]
                dist = math.hypot(dx, dy)
                r = dz.get("radius", 15.0)

                # Radial flee force pushes directly away from the fire epicenter
                if dist < r * 2.4:
                    self.panic_level = max(self.panic_level, min(1.0, 1.4 - (dist / (r * 2.4))))
                    if self.panic_level > 0.45:
                        self.state = "PANIC"
                        self.desired_speed = random.uniform(3.8, 5.2)

                    d_safe = max(0.2, dist)
                    push = 6000.0 * (1.0 - min(1.0, dist / (r * 2.4)))
                    f_hazard_x += (dx / d_safe) * push
                    f_hazard_y += (dy / d_safe) * push

        # 2. Check Local Density, Panic Contagion, Herding, & Inter-Agent Forces
        nearby_count = 0
        max_nearby_panic = 0.0
        f_agents_x = 0.0
        f_agents_y = 0.0
        total_pressure = 0.0

        herding_vx = 0.0
        herding_vy = 0.0
        herding_weight = 0.0

        is_stampeding = is_emergency or self.state in ["EVACUATING", "PANIC"] or self.panic_level > 0.4

        A = 3200.0 if is_stampeding else 1600.0
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

            if dist < 3.0:
                nearby_count += 1
                max_nearby_panic = max(max_nearby_panic, other.panic_level)

                # Herding: look at forward neighbors (cosine angle > 0)
                dot = (other.x - self.x) * self.vx + (other.y - self.y) * self.vy
                if is_stampeding and dot > 0 and (other.vx != 0 or other.vy != 0):
                    herding_vx += other.vx
                    herding_vy += other.vy
                    herding_weight += 1.0

                r_sum = self.radius + other.radius
                n_x = dx / dist
                n_y = dy / dist
                overlap = r_sum - dist

                # Social psychological repulsion
                repulsion = A * math.exp((r_sum - dist) / B)

                if overlap > 0:
                    # Physical compression stiffness (Crush pressure during stampede)
                    contact_force = 22000.0 * overlap
                    repulsion += contact_force
                    total_pressure += contact_force

                    # Tangential sliding friction
                    t_x = -n_y
                    t_y = n_x
                    delta_v = (other.vx - self.vx) * t_x + (other.vy - self.vy) * t_y
                    f_agents_x += 2000.0 * overlap * delta_v * t_x
                    f_agents_y += 2000.0 * overlap * delta_v * t_y

                f_agents_x += n_x * repulsion
                f_agents_y += n_y * repulsion

        self.local_density = nearby_count / 19.6
        self.crush_pressure = total_pressure / max(1.0, math.pi * self.radius * 2.0)

        # Stumble check under severe crush pressure and stampede sprint
        if is_stampeding and self.crush_pressure > 3200.0 and random.random() < 0.004:
            self.state = "FALLEN"
            self.fall_timer = random.uniform(2.0, 4.5)
            return

        # Panic emotional contagion spread
        if max_nearby_panic > 0.35 and self.panic_level < max_nearby_panic:
            self.panic_level = min(1.0, self.panic_level + max_nearby_panic * dt * 3.0)
            if self.panic_level > 0.55 and self.state not in ["PANIC", "SAFE", "FALLEN"]:
                self.state = "PANIC"
                self.desired_speed = random.uniform(3.8, 5.2)

        # 3. Navigation Driving Force
        if is_stampeding:
            # Dijkstra gradient direction to nearest safe exit
            dir_x, dir_y = nav_mesh.get_evacuation_direction(self.x, self.y)

            # Blend with herding behavior (following the flock)
            if herding_weight > 0:
                h_spd = math.hypot(herding_vx, herding_vy) + 1e-6
                h_dir_x = herding_vx / h_spd
                h_dir_y = herding_vy / h_spd
                dir_x = dir_x * 0.7 + h_dir_x * 0.3
                dir_y = dir_y * 0.7 + h_dir_y * 0.3
                d_mag = math.hypot(dir_x, dir_y) + 1e-6
                dir_x /= d_mag
                dir_y /= d_mag

            if math.hypot(dir_x, dir_y) < 0.1:
                dx = self.target_x - self.x
                dy = self.target_y - self.y
                d = math.hypot(dx, dy) + 1e-6
                dir_x, dir_y = dx / d, dy / d

            self.desired_speed = random.uniform(3.8, 5.2)

            if self.local_density > 4.0:
                clog_factor = max(0.25, 1.0 - (self.local_density - 4.0) * 0.35)
                self.desired_speed *= clog_factor
        else:
            # Autonomous Pedestrian Circulation & Dynamic Venue Activities
            self.activity_timer -= dt

            # 3.1 Queue Advancement
            if self.state == "QUEUING":
                dist_to_target = math.hypot(self.target_x - self.x, self.target_y - self.y)
                if dist_to_target < 1.4:
                    # Pass through turnstile into venue
                    self.state = "WALKING"
                    self.assigned_role = "PEDESTRIAN"
                    # Walk towards concourse or stands
                    self.target_x = random.uniform(30.0, nav_mesh.width - 30.0)
                    self.target_y = random.uniform(25.0, nav_mesh.length - 20.0)
                    self.waypoints = [(self.target_x, self.target_y)]
                    self.current_waypoint_idx = 0
                else:
                    self.desired_speed = 0.85
            # 3.2 Seated Spectator Activity (Get up to buy food/drinks, then return)
            elif self.assigned_role == "SEATED":
                if self.activity_timer <= 0:
                    self.activity_timer = random.uniform(20.0, 60.0)
                    if self.activity_state == "IDLE" and random.random() < 0.35 and amenities:
                        # Walk to a concession booth or restroom
                        am = random.choice(amenities)
                        self.activity_state = "TO_CONCESSION"
                        self.state = "WALKING"
                        self.set_target(
                            float(am.get("x", self.x)) + random.uniform(-2, 2),
                            float(am.get("y", self.y)) + random.uniform(-2, 2)
                        )
                    elif self.activity_state in ["TO_CONCESSION", "TO_RESTROOM"]:
                        # Return back to original seat
                        self.activity_state = "RETURNING_SEAT"
                        self.state = "WALKING"
                        self.set_target(self.home_x, self.home_y)
                    elif self.activity_state == "RETURNING_SEAT":
                        dist_to_seat = math.hypot(self.home_x - self.x, self.home_y - self.y)
                        if dist_to_seat < 1.0:
                            self.activity_state = "IDLE"
                            self.state = "WAITING"
                            self.vx *= 0.1
                            self.vy *= 0.1

                if self.state == "WAITING":
                    self.desired_speed = 0.0
                    self.vx *= 0.5
                    self.vy *= 0.5
                else:
                    self.desired_speed = self.base_speed
            # 3.3 Roaming Concourse Pedestrians
            else:
                self.wander_timer -= dt
                dist_to_goal = math.hypot(self.target_x - self.x, self.target_y - self.y)

                if dist_to_goal < 2.5 or self.wander_timer <= 0:
                    self.wander_timer = random.uniform(6.0, 16.0)
                    # Pick a new point along concourses or amenities
                    for _ in range(5):
                        new_tx = random.uniform(10.0, nav_mesh.width - 10.0)
                        new_ty = random.uniform(10.0, nav_mesh.length - 10.0)
                        if nav_mesh.is_walkable(new_tx, new_ty):
                            self.set_target(new_tx, new_ty)
                            self.state = "WALKING"
                            break

                self.desired_speed = self.base_speed

            # Compute direction to target
            if self.current_waypoint_idx < len(self.waypoints):
                wx, wy = self.waypoints[self.current_waypoint_idx]
                if math.hypot(wx - self.x, wy - self.y) < 1.2:
                    self.current_waypoint_idx += 1
                    if self.current_waypoint_idx < len(self.waypoints):
                        wx, wy = self.waypoints[self.current_waypoint_idx]
                dx = wx - self.x
                dy = wy - self.y
            else:
                dx = self.target_x - self.x
                dy = self.target_y - self.y

            d = math.hypot(dx, dy) + 1e-6
            dir_x, dir_y = dx / d, dy / d

        # Bottleneck velocity constraint
        if self.local_density > 3.5 and not is_stampeding:
            self.desired_speed = max(0.35, self.base_speed * (1.0 - (self.local_density - 3.5) * 0.2))

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
                f_walls_x += n_x * 1500.0
                f_walls_y += n_y * 1500.0

        # Total acceleration: (F_total) / mass
        acc_x = (f_drive_x + (f_agents_x + f_walls_x + f_hazard_x) / self.mass)
        acc_y = (f_drive_y + (f_agents_y + f_walls_y + f_hazard_y) / self.mass)

        # Integrate velocity
        self.vx += acc_x * dt
        self.vy += acc_y * dt

        # Cap velocity
        speed = math.hypot(self.vx, self.vy)
        max_speed = max(0.1, self.desired_speed * 1.5)
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
            if dist_to_exit < 2.2:
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

            total_mass = self.mass + other.mass
            ratio_self = other.mass / total_mass
            ratio_other = self.mass / total_mass

            self.x += nx * overlap * ratio_self
            self.y += ny * overlap * ratio_self
            other.x -= nx * overlap * ratio_other
            other.y -= ny * overlap * ratio_other

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
            "smoke_inhalation": round(self.smoke_inhalation, 2),
            "assigned_role": self.assigned_role
        }
