import math
import numpy as np
from typing import Dict, List, Any, Optional
from models.schemas import CrowdPrediction

class CrowdForecaster:
    def __init__(self):
        self.history_timestamps: List[float] = []
        self.history_counts: List[int] = []

    def record_crowd_sample(self, timestamp: float, count: int):
        self.history_timestamps.append(timestamp)
        self.history_counts.append(count)
        if len(self.history_timestamps) > 120:
            self.history_timestamps.pop(0)
            self.history_counts.pop(0)

    def forecast(
        self,
        current_crowd: int,
        inflow_per_min: float,
        outflow_per_min: float,
        safe_capacity: int,
        max_capacity: int,
        density_matrix: Optional[List[List[float]]] = None
    ) -> CrowdPrediction:
        """
        Calculates 10m, 30m, 60m projections and time to capacity exceedance.
        Uses differential inflow-outflow dynamic + polynomial trend modeling.
        """
        net_rate_per_min = inflow_per_min - outflow_per_min

        # If historical points exist, compute regression slope
        if len(self.history_counts) >= 5:
            x = np.arange(len(self.history_counts))
            y = np.array(self.history_counts)
            # Linear fit
            slope, intercept = np.polyfit(x, y, 1)
            # Blend mathematical net rate with empirical slope
            trend_rate_per_min = (net_rate_per_min * 0.6) + (slope * 6.0 * 0.4)
        else:
            trend_rate_per_min = net_rate_per_min

        # Dampen growth as capacity approaches upper physical limit
        def project(minutes: float) -> int:
            projected = current_crowd + (trend_rate_per_min * minutes)
            # Physical venue saturation factor
            if projected > max_capacity * 1.2:
                projected = max_capacity * 1.2
            return max(0, int(projected))

        pred_10m = project(10.0)
        pred_30m = project(30.0)
        pred_60m = project(60.0)

        # Time to exceed safe capacity
        time_to_exceed = None
        if trend_rate_per_min > 0:
            remaining_safe = safe_capacity - current_crowd
            if remaining_safe > 0:
                time_to_exceed = round(remaining_safe / trend_rate_per_min, 1)
            else:
                time_to_exceed = 0.0

        if time_to_exceed is not None and time_to_exceed > 0:
            summary = f"Safe venue capacity ({safe_capacity:,} people) predicted to be reached in ~{time_to_exceed:.1f} minutes at current inflow."
        elif time_to_exceed == 0.0:
            summary = f"Current crowd ({current_crowd:,}) already exceeds safe operating capacity ({safe_capacity:,}). Staggered entry recommended."
        else:
            summary = f"Crowd inflow is stable. Venue operating within safe capacity limits."

        # Zone forecasts
        zone_forecasts = []
        if density_matrix:
            arr = np.array(density_matrix)
            rows, cols = arr.shape
            zones = [
                ("North Concourse", arr[:rows//2, :cols//2]),
                ("South Concourse", arr[rows//2:, :cols//2]),
                ("East Stands", arr[:rows//2, cols//2:]),
                ("West Stands", arr[rows//2:, cols//2:]),
            ]
            for zname, sub_grid in zones:
                avg_d = float(np.mean(sub_grid))
                proj_10m_d = round(avg_d * (1.0 + (trend_rate_per_min / max(100.0, current_crowd)) * 10.0), 2)
                zone_forecasts.append({
                    "zone_name": zname,
                    "current_density": round(avg_d, 2),
                    "predicted_10m_density": proj_10m_d,
                    "status": "CRITICAL" if proj_10m_d >= 4.0 else ("ELEVATED" if proj_10m_d >= 2.5 else "SAFE")
                })

        return CrowdPrediction(
            current_crowd=current_crowd,
            predicted_10m=pred_10m,
            predicted_30m=pred_30m,
            predicted_60m=pred_60m,
            time_to_capacity_exceedance_min=time_to_exceed,
            status_summary=summary,
            zone_forecasts=zone_forecasts
        )
