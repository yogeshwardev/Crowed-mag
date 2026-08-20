import math
import random
import numpy as np
from typing import Dict, List, Tuple, Optional, Any

class FireSimulationGrid:
    """
    Physical 2D Cellular Automata and Advection-Diffusion Fire & Smoke Simulation.
    Models:
    - Fuel density & flammability per venue tile
    - Temperature field diffusion and radiant heat transfer
    - Combustion dynamics and fuel depletion (ash/scorch formation)
    - Smoke plume generation, advection with wind, and diffusion
    - Dynamic danger front and perimeter calculation
    """
    def __init__(self, venue_width: float = 120.0, venue_length: float = 80.0, resolution: float = 1.0):
        self.width = float(venue_width)
        self.length = float(venue_length)
        self.resolution = float(resolution)
        self.cols = int(math.ceil(self.width / self.resolution))
        self.rows = int(math.ceil(self.length / self.resolution))

        # Grid fields
        # Fuel: 0.0 (incombustible) to 1.0 (highly flammable, e.g. wood, tent, stage)
        self.fuel = np.zeros((self.rows, self.cols), dtype=np.float32)
        # Initial ambient temperature ~ 22°C
        self.temperature = np.full((self.rows, self.cols), 22.0, dtype=np.float32)
        # Flame intensity: 0.0 (no fire) to 1.0 (raging flame)
        self.flame = np.zeros((self.rows, self.cols), dtype=np.float32)
        # Smoke concentration: 0.0 (clear) to 1.0 (dense black toxic smoke)
        self.smoke = np.zeros((self.rows, self.cols), dtype=np.float32)
        # Burned / Scorch mark: 0.0 (unburned) to 1.0 (fully charred)
        self.scorch = np.zeros((self.rows, self.cols), dtype=np.float32)

        # Environmental factors
        self.ambient_temp = 22.0
        self.ignition_temp = 180.0  # °C required to ignite fuel
        self.max_fire_temp = 850.0   # °C peak flame temperature
        self.burn_rate = 0.08       # Fuel consumed per second at full flame
        self.heat_diffusivity = 0.45
        self.smoke_diffusivity = 0.35
        self.smoke_dissipation = 0.04

        # Wind vector (m/s) in world coordinates (X, Y)
        self.wind_x = 2.0
        self.wind_y = 1.0

        self.is_active = False
        self.active_sources: List[Dict[str, float]] = []

    def initialize_from_blueprint(self, elements: List[Dict[str, Any]]):
        """Populates fuel map based on material types of venue elements."""
        # Default ground has low-moderate fuel (grass/turf or concourse debris)
        self.fuel.fill(0.15)

        for el in elements:
            el_type = el.get("type", "")
            x = float(el.get("x", 0))
            y = float(el.get("y", 0))
            w = float(el.get("width", 1))
            h = float(el.get("height", 1))

            min_c = max(0, int((x - w / 2) / self.resolution))
            max_c = min(self.cols - 1, int((x + w / 2) / self.resolution))
            min_r = max(0, int((y - h / 2) / self.resolution))
            max_r = min(self.rows - 1, int((y + h / 2) / self.resolution))

            # Material flammability weighting
            if el_type in ["stage", "vip_area", "food_stall"]:
                flammability = 0.95  # Wooden staging, fabric canopies, cooking oils
            elif el_type in ["seating", "building"]:
                flammability = 0.70  # Plastic bucket seats, interior fittings
            elif el_type in ["barricade", "security", "ticket_counter"]:
                flammability = 0.35
            elif el_type in ["wall", "road"]:
                flammability = 0.05  # Concrete, asphalt, brick
            elif el_type == "open_space":
                flammability = 0.20
            else:
                flammability = 0.25

            self.fuel[min_r:max_r + 1, min_c:max_c + 1] = flammability

    def ignite(self, x: float, y: float, radius: float = 3.5, intensity: float = 1.0):
        """Ignites a real fire source at coordinates (x, y)."""
        self.is_active = True
        self.active_sources.append({"x": x, "y": y, "radius": radius})

        min_c = max(0, int((x - radius) / self.resolution))
        max_c = min(self.cols - 1, int((x + radius) / self.resolution))
        min_r = max(0, int((y - radius) / self.resolution))
        max_r = min(self.rows - 1, int((y + radius) / self.resolution))

        for r in range(min_r, max_r + 1):
            for c in range(min_c, max_c + 1):
                wx = (c + 0.5) * self.resolution
                wy = (r + 0.5) * self.resolution
                dist = math.hypot(wx - x, wy - y)
                if dist <= radius:
                    factor = 1.0 - (dist / radius)
                    self.temperature[r, c] = max(self.temperature[r, c], self.ambient_temp + (self.max_fire_temp - self.ambient_temp) * factor * intensity)
                    self.flame[r, c] = max(self.flame[r, c], intensity * factor)
                    self.smoke[r, c] = max(self.smoke[r, c], intensity * factor * 0.8)
                    self.fuel[r, c] = max(0.4, self.fuel[r, c])  # Ensure initial fuel to burn

    def clear(self):
        """Extinguishes all fire and clears smoke."""
        self.is_active = False
        self.active_sources.clear()
        self.temperature.fill(self.ambient_temp)
        self.flame.fill(0.0)
        self.smoke.fill(0.0)

    def tick(self, dt: float):
        """
        Advances the 2D fire and smoke simulation by dt seconds.
        Solves combustion, heat advection-diffusion, and smoke transport.
        """
        if not self.is_active and np.max(self.flame) < 0.01:
            return

        dt = min(0.1, max(0.01, dt))

        # 1. Combustion Reaction Step
        # Cells with temperature > ignition_temp and fuel > 0 start burning
        burning_mask = (self.temperature > self.ignition_temp) & (self.fuel > 0.01)
        
        # Grow flame intensity
        self.flame[burning_mask] = np.clip(self.flame[burning_mask] + 1.2 * dt, 0.0, 1.0)
        # Non-burning cells extinguish
        self.flame[~burning_mask] = np.clip(self.flame[~burning_mask] - 0.8 * dt, 0.0, 1.0)

        # Fuel consumption
        fuel_consumed = self.flame * self.burn_rate * dt
        self.fuel = np.clip(self.fuel - fuel_consumed, 0.0, 1.0)
        self.scorch = np.clip(self.scorch + fuel_consumed * 1.5, 0.0, 1.0)

        # Heat generation from burning
        heat_generated = self.flame * (self.max_fire_temp - self.ambient_temp) * 0.7 * dt
        self.temperature += heat_generated

        # Smoke generation from burning fuel
        smoke_generated = self.flame * (0.6 + self.fuel * 0.4) * 0.9 * dt
        self.smoke = np.clip(self.smoke + smoke_generated, 0.0, 1.0)

        # 2. Heat Conduction / Diffusion (Laplacian operator)
        padded_temp = np.pad(self.temperature, 1, mode='edge')
        laplacian_t = (
            padded_temp[:-2, 1:-1] + padded_temp[2:, 1:-1] +
            padded_temp[1:-1, :-2] + padded_temp[1:-1, 2:] -
            4.0 * self.temperature
        )

        # 3. Wind Advection for Heat and Smoke (Upwind differencing)
        wx_cells = self.wind_x / self.resolution
        wy_cells = self.wind_y / self.resolution

        advection_smoke = np.zeros_like(self.smoke)
        advection_temp = np.zeros_like(self.temperature)

        if wx_cells > 0:
            advection_smoke[:, 1:] += wx_cells * (self.smoke[:, :-1] - self.smoke[:, 1:]) * dt
            advection_temp[:, 1:] += wx_cells * 0.4 * (self.temperature[:, :-1] - self.temperature[:, 1:]) * dt
        elif wx_cells < 0:
            advection_smoke[:, :-1] += -wx_cells * (self.smoke[:, 1:] - self.smoke[:, :-1]) * dt
            advection_temp[:, :-1] += -wx_cells * 0.4 * (self.temperature[:, 1:] - self.temperature[:, :-1]) * dt

        if wy_cells > 0:
            advection_smoke[1:, :] += wy_cells * (self.smoke[:-1, :] - self.smoke[1:, :]) * dt
            advection_temp[1:, :] += wy_cells * 0.4 * (self.temperature[:-1, :] - self.temperature[1:, :]) * dt
        elif wy_cells < 0:
            advection_smoke[:-1, :] += -wy_cells * (self.smoke[1:, :] - self.smoke[:-1, :]) * dt
            advection_temp[:-1, :] += -wy_cells * 0.4 * (self.temperature[1:, :] - self.temperature[:-1, :]) * dt

        # Smoke Diffusion (Laplacian)
        padded_smoke = np.pad(self.smoke, 1, mode='edge')
        laplacian_s = (
            padded_smoke[:-2, 1:-1] + padded_smoke[2:, 1:-1] +
            padded_smoke[1:-1, :-2] + padded_smoke[1:-1, 2:] -
            4.0 * self.smoke
        )

        # Update Temperature
        cooling = (self.temperature - self.ambient_temp) * 0.12 * dt
        self.temperature += (self.heat_diffusivity * laplacian_t * dt + advection_temp - cooling)
        self.temperature = np.clip(self.temperature, self.ambient_temp, self.max_fire_temp)

        # Update Smoke
        smoke_decay = self.smoke * self.smoke_dissipation * dt
        self.smoke += (self.smoke_diffusivity * laplacian_s * dt + advection_smoke - smoke_decay)
        self.smoke = np.clip(self.smoke, 0.0, 1.0)

        # Random wind turbulence
        self.wind_x += random.uniform(-0.1, 0.1)
        self.wind_y += random.uniform(-0.1, 0.1)
        self.wind_x = float(np.clip(self.wind_x, -5.0, 5.0))
        self.wind_y = float(np.clip(self.wind_y, -5.0, 5.0))

    def get_danger_zones(self) -> List[Dict[str, Any]]:
        """
        Extracts active flame clusters and high-temperature danger fronts
        to dynamically feed navigation mesh and agent avoidance.
        """
        active_cells = np.argwhere((self.flame > 0.15) | (self.temperature > 120.0))
        if len(active_cells) == 0:
            return []

        clusters: List[Dict[str, Any]] = []
        rows, cols = active_cells[:, 0], active_cells[:, 1]
        
        center_r = float(np.mean(rows))
        center_c = float(np.mean(cols))
        max_r_dist = float(np.max(np.abs(rows - center_r)))
        max_c_dist = float(np.max(np.abs(cols - center_c)))
        radius = max(3.0, math.hypot(max_c_dist * self.resolution, max_r_dist * self.resolution) + 2.0)

        cx = (center_c + 0.5) * self.resolution
        cy = (center_r + 0.5) * self.resolution

        max_temp = float(np.max(self.temperature))
        max_smoke = float(np.max(self.smoke))

        clusters.append({
            "x": round(cx, 1),
            "y": round(cy, 1),
            "radius": round(radius, 1),
            "max_temperature": round(max_temp, 1),
            "max_smoke": round(max_smoke, 2),
            "flame_cells_count": int(len(active_cells)),
            "wind_direction": [round(self.wind_x, 1), round(self.wind_y, 1)]
        })

        return clusters

    def sample_at(self, x: float, y: float) -> Tuple[float, float, float]:
        """Returns (temperature, flame_intensity, smoke_density) at world (x, y)."""
        c = int(np.clip(x / self.resolution, 0, self.cols - 1))
        r = int(np.clip(y / self.resolution, 0, self.rows - 1))
        return float(self.temperature[r, c]), float(self.flame[r, c]), float(self.smoke[r, c])

    def get_state_summary(self) -> Dict[str, Any]:
        """Compact summary of fire state for telemetry and 3D shader updates."""
        burning_count = int(np.sum(self.flame > 0.1))
        peak_temp = float(np.max(self.temperature)) if self.is_active else self.ambient_temp
        peak_smoke = float(np.max(self.smoke)) if self.is_active else 0.0

        hotspots = []
        if burning_count > 0:
            indices = np.argwhere(self.flame > 0.25)
            step = max(1, len(indices) // 40)
            for idx in indices[::step]:
                r, c = idx[0], idx[1]
                hotspots.append({
                    "x": round((c + 0.5) * self.resolution, 1),
                    "y": round((r + 0.5) * self.resolution, 1),
                    "intensity": round(float(self.flame[r, c]), 2),
                    "smoke": round(float(self.smoke[r, c]), 2),
                    "temp": round(float(self.temperature[r, c]), 1)
                })

        return {
            "is_active": self.is_active or burning_count > 0,
            "burning_cells": burning_count,
            "peak_temperature_c": round(peak_temp, 1),
            "peak_smoke_density": round(peak_smoke, 2),
            "wind_vector": [round(self.wind_x, 2), round(self.wind_y, 2)],
            "hotspots": hotspots
        }
