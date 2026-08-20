import math
import numpy as np
from typing import List, Tuple, Dict, Optional, Set
import heapq

class NavigationMesh:
    def __init__(self, width: float, length: float, resolution: float = 1.0):
        """
        Grid-based navigation mesh for venue pathfinding and fast continuous vector fields.
        Resolution: meters per grid cell (default 1.0m for fast evaluation).
        """
        self.width = float(width)
        self.length = float(length)
        self.resolution = float(resolution)
        self.grid_w = int(math.ceil(self.width / self.resolution))
        self.grid_l = int(math.ceil(self.length / self.resolution))

        # 0 = walkable, 1 = obstacle/wall, 2 = restricted/danger
        self.grid = np.zeros((self.grid_l, self.grid_w), dtype=np.int8)
        self.cost_field = np.ones((self.grid_l, self.grid_w), dtype=np.float32)

        # Distance fields for each exit for instant O(1) gradient vector queries
        self.exit_distance_fields: Dict[str, np.ndarray] = {}
        self.evacuation_distance_field: Optional[np.ndarray] = None
        self.evacuation_gradient_x: Optional[np.ndarray] = None
        self.evacuation_gradient_y: Optional[np.ndarray] = None

        self.exits: List[Dict] = []
        self.entry_gates: List[Dict] = []
        self.danger_zones: List[Dict] = []
        self.blocked_exits: Set[str] = set()

    def world_to_grid(self, x: float, y: float) -> Tuple[int, int]:
        gx = int(np.clip(x / self.resolution, 0, self.grid_w - 1))
        gy = int(np.clip(y / self.resolution, 0, self.grid_l - 1))
        return gx, gy

    def grid_to_world(self, gx: int, gy: int) -> Tuple[float, float]:
        x = (gx + 0.5) * self.resolution
        y = (gy + 0.5) * self.resolution
        return x, y

    def is_walkable(self, x: float, y: float) -> bool:
        gx, gy = self.world_to_grid(x, y)
        # 1 = solid wall/obstacle; 0 = open walkable; 2 = danger zone (walkable but high cost)
        return bool(self.grid[gy, gx] != 1)

    def set_obstacle_rect(self, x: float, y: float, w: float, h: float, value: int = 1):
        min_gx, min_gy = self.world_to_grid(x - w / 2, y - h / 2)
        max_gx, max_gy = self.world_to_grid(x + w / 2, y + h / 2)
        self.grid[min_gy:max_gy + 1, min_gx:max_gx + 1] = value
        if value == 1:
            self.cost_field[min_gy:max_gy + 1, min_gx:max_gx + 1] = 9999.0

    def add_danger_circle(self, cx: float, cy: float, radius: float):
        self.danger_zones.append({"x": cx, "y": cy, "radius": radius})
        min_gx, min_gy = self.world_to_grid(cx - radius, cy - radius)
        max_gx, max_gy = self.world_to_grid(cx + radius, cy + radius)
        for gy in range(min_gy, max_gy + 1):
            for gx in range(min_gx, max_gx + 1):
                wx, wy = self.grid_to_world(gx, gy)
                dist = math.hypot(wx - cx, wy - cy)
                if dist <= radius:
                    self.grid[gy, gx] = 2  # danger
                    self.cost_field[gy, gx] = 500.0 + (radius - dist) * 100.0

    def compute_dijkstra_field(self, target_points: List[Tuple[float, float]]) -> np.ndarray:
        """
        Computes an all-pairs distance field from multiple target points (e.g. active exits)
        using Dijkstra / Fast Marching on the grid.
        """
        dist_field = np.full((self.grid_l, self.grid_w), 1e6, dtype=np.float32)
        pq = []

        for tx, ty in target_points:
            gx, gy = self.world_to_grid(tx, ty)
            dist_field[gy, gx] = 0.0
            heapq.heappush(pq, (0.0, gx, gy))

        # 8-direction neighbors
        neighbors = [
            (-1, 0, 1.0), (1, 0, 1.0), (0, -1, 1.0), (0, 1, 1.0),
            (-1, -1, 1.414), (1, -1, 1.414), (-1, 1, 1.414), (1, 1, 1.414)
        ]

        while pq:
            d, gx, gy = heapq.heappop(pq)
            if d > dist_field[gy, gx]:
                continue

            for dx, dy, cost_mult in neighbors:
                nx, ny = gx + dx, gy + dy
                if 0 <= nx < self.grid_w and 0 <= ny < self.grid_l:
                    if self.grid[ny, nx] == 1:  # solid wall
                        continue
                    
                    step_cost = self.resolution * cost_mult * self.cost_field[ny, nx]
                    new_dist = d + step_cost
                    if new_dist < dist_field[ny, nx]:
                        dist_field[ny, nx] = new_dist
                        heapq.heappush(pq, (new_dist, nx, ny))

        return dist_field

    def build_from_blueprint(self, blueprint_elements: List[Dict], danger_zones: Optional[List[Dict]] = None, blocked_exits: Optional[Set[str]] = None):
        """
        Builds navigation grid and precomputes evacuation distance fields.
        """
        self.grid.fill(0)
        self.cost_field.fill(1.0)
        self.exits = []
        self.entry_gates = []
        self.danger_zones = danger_zones or []
        self.blocked_exits = blocked_exits or set()

        for el in blueprint_elements:
            el_type = el.get("type", "")
            x = float(el.get("x", 0))
            y = float(el.get("y", 0))
            w = float(el.get("width", 2))
            h = float(el.get("height", 2))
            el_id = el.get("id", "")

            if el_type in ["wall", "building", "restricted", "stage", "barricade", "food_stall", "restroom"]:
                self.set_obstacle_rect(x, y, w, h, value=1)
            elif el_type in ["exit_gate", "emergency_exit"]:
                if el_id not in self.blocked_exits:
                    self.exits.append({"id": el_id, "x": x, "y": y, "width": w, "height": h, "type": el_type})
            elif el_type in ["entry_gate", "security", "ticket_counter"]:
                self.entry_gates.append({"id": el_id, "x": x, "y": y, "width": w, "height": h, "type": el_type})

        # Apply danger zones (fires/stampede zones)
        for dz in self.danger_zones:
            self.add_danger_circle(dz["x"], dz["y"], dz["radius"])

        # Compute combined evacuation distance field
        active_exit_coords = [(e["x"], e["y"]) for e in self.exits]
        if active_exit_coords:
            self.evacuation_distance_field = self.compute_dijkstra_field(active_exit_coords)
            # Compute negative gradient (-dD/dx, -dD/dy) for instant vector steering
            gy, gx = np.gradient(self.evacuation_distance_field)
            norm = np.hypot(gx, gy) + 1e-6
            self.evacuation_gradient_x = -(gx / norm)
            self.evacuation_gradient_y = -(gy / norm)
        else:
            self.evacuation_distance_field = None
            self.evacuation_gradient_x = None
            self.evacuation_gradient_y = None

    def get_nearest_exit_pos(self, x: float, y: float) -> Tuple[float, float]:
        if not self.exits:
            return self.width / 2, self.length - 2.0
        best_exit = min(self.exits, key=lambda e: math.hypot(e["x"] - x, e["y"] - y))
        return float(best_exit["x"]), float(best_exit["y"])

    def get_evacuation_direction(self, x: float, y: float) -> Tuple[float, float]:
        """
        Returns normalized (dir_x, dir_y) pointing towards the nearest accessible exit in O(1) time.
        """
        if self.evacuation_gradient_x is not None:
            gx, gy = self.world_to_grid(x, y)
            dx = float(self.evacuation_gradient_x[gy, gx])
            dy = float(self.evacuation_gradient_y[gy, gx])
            if not (math.isnan(dx) or math.isnan(dy)) and math.hypot(dx, dy) > 0.05:
                return dx, dy

        # Fallback: direct vector to nearest exit
        ex, ey = self.get_nearest_exit_pos(x, y)
        dx = ex - x
        dy = ey - y
        d = math.hypot(dx, dy) + 1e-6
        return dx / d, dy / d

    def get_distance_to_nearest_exit(self, x: float, y: float) -> float:
        if self.evacuation_distance_field is not None:
            gx, gy = self.world_to_grid(x, y)
            d = float(self.evacuation_distance_field[gy, gx])
            if not math.isnan(d) and d < 1e5:
                return d
        ex, ey = self.get_nearest_exit_pos(x, y)
        return math.hypot(ex - x, ey - y)

    def find_path_astar(self, start_x: float, start_y: float, goal_x: float, goal_y: float) -> List[Tuple[float, float]]:
        """
        A* pathfinder for targeted point-to-point routes (e.g. entering gate -> seating seat).
        """
        sgx, sgy = self.world_to_grid(start_x, start_y)
        egx, egy = self.world_to_grid(goal_x, goal_y)

        if (sgx, sgy) == (egx, egy):
            return [(goal_x, goal_y)]

        open_set = []
        heapq.heappush(open_set, (0.0 + math.hypot(egx - sgx, egy - sgy), 0.0, (sgx, sgy), None))
        came_from = {}
        cost_so_far = {(sgx, sgy): 0.0}

        neighbors = [(-1,0), (1,0), (0,-1), (0,1), (-1,-1), (1,-1), (-1,1), (1,1)]

        steps = 0
        max_steps = 1500  # fast bound

        while open_set and steps < max_steps:
            steps += 1
            _, current_cost, current, parent = heapq.heappop(open_set)
            came_from[current] = parent

            if current == (egx, egy):
                break

            for dx, dy in neighbors:
                nx, ny = current[0] + dx, current[1] + dy
                if 0 <= nx < self.grid_w and 0 <= ny < self.grid_l:
                    if self.grid[ny, nx] == 1:
                        continue
                    step_len = 1.414 if (dx != 0 and dy != 0) else 1.0
                    new_cost = current_cost + step_len * self.cost_field[ny, nx]
                    if (nx, ny) not in cost_so_far or new_cost < cost_so_far[(nx, ny)]:
                        cost_so_far[(nx, ny)] = new_cost
                        priority = new_cost + math.hypot(egx - nx, egy - ny)
                        heapq.heappush(open_set, (priority, new_cost, (nx, ny), current))

        # Reconstruct path
        path = []
        curr = (egx, egy) if (egx, egy) in came_from else min(came_from.keys(), key=lambda p: math.hypot(egx - p[0], egy - p[1]))
        while curr is not None:
            wx, wy = self.grid_to_world(curr[0], curr[1])
            path.append((wx, wy))
            curr = came_from.get(curr)
        path.reverse()
        return path
