import numpy as np
from typing import Dict, List, Any
from models.schemas import AIRiskAnalysis, RiskFactor, BottleneckAlert, QueueStatus

class AISafetyAdvisor:
    def analyze(self, telemetry: Dict[str, Any], blueprint_elements: List[Dict[str, Any]]) -> AIRiskAnalysis:
        """
        Computes composite 0-100 AI Safety Risk Score, decomposes risk factors,
        and generates actionable recommendations.
        """
        capacity = telemetry.get("capacity", {})
        queues = telemetry.get("queues", [])
        bottlenecks_data = telemetry.get("bottlenecks", [])
        max_density = telemetry.get("max_density", 0.0)
        avg_density = telemetry.get("avg_density", 0.0)
        is_emergency = telemetry.get("is_emergency", False)
        occupancy_pct = capacity.get("occupancy_percentage", 0.0)

        # Count exits and entry gates
        exit_count = sum(1 for el in blueprint_elements if el.get("type") in ["exit_gate", "emergency_exit"])
        entry_count = sum(1 for el in blueprint_elements if el.get("type") in ["entry_gate", "security"])
        blocked_exits_count = len(telemetry.get("blocked_exits", []))
        usable_exits = max(0, exit_count - blocked_exits_count)

        # 1. Factor: Density Score (0-100)
        # Safe is <2.0, warning 3.5, critical >4.5
        if max_density < 2.0:
            density_score = (max_density / 2.0) * 30.0
        elif max_density < 3.5:
            density_score = 30.0 + ((max_density - 2.0) / 1.5) * 35.0
        else:
            density_score = 65.0 + min(35.0, ((max_density - 3.5) / 1.5) * 35.0)

        # 2. Factor: Gate Queue & Inflow Congestion Score (0-100)
        queue_scores = []
        for q in queues:
            inflow = q.get("incoming_flow_per_min", 0.0)
            proc = max(1.0, q.get("processing_rate_per_min", 120.0))
            ratio = inflow / proc
            q_len = q.get("queue_length", 0)
            q_score = min(100.0, (ratio * 40.0) + (q_len / 3.0))
            queue_scores.append(q_score)
        gate_score = float(np.mean(queue_scores)) if queue_scores else 20.0

        # 3. Factor: Evacuation Readiness & Exit Capacity Score (0-100)
        if usable_exits == 0:
            exit_score = 98.0
        else:
            # Ratio of active crowd per usable exit
            crowd_per_exit = capacity.get("current_occupancy", 500) / max(1, usable_exits)
            if crowd_per_exit < 300:
                exit_score = 15.0
            elif crowd_per_exit < 800:
                exit_score = 45.0
            else:
                exit_score = min(95.0, 45.0 + (crowd_per_exit - 800) / 30.0)

        # 4. Factor: Occupancy Pressure Score (0-100)
        occupancy_score = min(100.0, (occupancy_pct / 100.0) * 85.0)

        # 5. Factor: Emergency Penalty
        emergency_penalty = 25.0 if is_emergency else 0.0

        # Weighted composite score
        weights = {
            "density": 0.30,
            "gate_queues": 0.25,
            "exit_readiness": 0.25,
            "occupancy": 0.20
        }
        composite_score = (
            density_score * weights["density"] +
            gate_score * weights["gate_queues"] +
            exit_score * weights["exit_readiness"] +
            occupancy_score * weights["occupancy"] +
            emergency_penalty
        )
        composite_score = round(float(np.clip(composite_score, 0.0, 100.0)), 1)

        # Classification
        if composite_score <= 20:
            category = "LOW"
        elif composite_score <= 40:
            category = "MODERATE"
        elif composite_score <= 60:
            category = "ELEVATED"
        elif composite_score <= 80:
            category = "HIGH"
        else:
            category = "CRITICAL"

        # Diagnostic reasons
        reasons = []
        if is_emergency:
            reasons.append(f"EMERGENCY ACTIVE ({telemetry.get('emergency_scenario', 'Alert').upper()}): High stampede risk.")
        if max_density >= 3.5:
            reasons.append(f"Peak zone density exceeds safe threshold ({max_density:.1f} persons/m² > 3.5 persons/m²).")
        if gate_score > 60:
            reasons.append("Incoming crowd flow significantly exceeds security gate throughput.")
        if blocked_exits_count > 0:
            reasons.append(f"{blocked_exits_count} emergency exit(s) are blocked or unavailable.")
        if usable_exits < 3:
            reasons.append("Exit redundancy is low for the current venue scale.")
        if occupancy_pct > 80:
            reasons.append(f"Venue occupancy is at {occupancy_pct:.1f}% of critical capacity.")
        if not reasons:
            reasons.append("Crowd distribution, queue flow, and exit clearance are within safe operating limits.")

        # Prescriptive recommendations
        recommendations = []
        if max_density >= 3.5:
            recommendations.append("Deploy queue marshals to disperse high-density clusters in the concourse.")
        if gate_score > 60:
            recommendations.append("Activate secondary security turnstiles or redirect 30% of incoming flow to adjacent gates.")
        if blocked_exits_count > 0:
            recommendations.append("Clear blocked exit corridors immediately and display reroute signboards.")
        if usable_exits <= 2 or exit_score > 65:
            recommendations.append("Add or open additional emergency exit E4 to reduce evacuation distance.")
        if occupancy_pct > 85:
            recommendations.append("Initiate staggered entry gating at main entrance road.")
        if not recommendations:
            recommendations.append("Maintain current security throughput and continue automated sensor monitoring.")

        factors = [
            RiskFactor(
                name="Crowd Density",
                score=round(density_score, 1),
                weight=weights["density"],
                status="CRITICAL" if density_score > 75 else ("HIGH" if density_score > 50 else "NORMAL"),
                details=f"Peak: {max_density:.2f} p/m², Avg: {avg_density:.2f} p/m²"
            ),
            RiskFactor(
                name="Security Queue Flow",
                score=round(gate_score, 1),
                weight=weights["gate_queues"],
                status="CRITICAL" if gate_score > 75 else ("HIGH" if gate_score > 50 else "NORMAL"),
                details=f"Evaluated {len(queues)} entry points"
            ),
            RiskFactor(
                name="Exit & Evacuation Readiness",
                score=round(exit_score, 1),
                weight=weights["exit_readiness"],
                status="CRITICAL" if exit_score > 75 else ("HIGH" if exit_score > 50 else "NORMAL"),
                details=f"{usable_exits} usable of {exit_count} exits"
            ),
            RiskFactor(
                name="Occupancy Pressure",
                score=round(occupancy_score, 1),
                weight=weights["occupancy"],
                status="HIGH" if occupancy_score > 70 else "NORMAL",
                details=f"{occupancy_pct:.1f}% of max capacity"
            )
        ]

        bottlenecks = [BottleneckAlert(**b) for b in bottlenecks_data]
        queue_statuses = [QueueStatus(**q) for q in queues]

        return AIRiskAnalysis(
            risk_score=composite_score,
            category=category,
            reasons=reasons,
            recommendations=recommendations,
            factors=factors,
            bottlenecks=bottlenecks,
            queue_statuses=queue_statuses
        )
