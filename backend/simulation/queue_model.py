import math
from typing import Dict, List, Optional
from models.schemas import QueueStatus, BottleneckAlert

class GateQueueManager:
    def __init__(self):
        self.queues: Dict[str, Dict] = {}

    def register_gate(
        self,
        gate_id: str,
        gate_name: str,
        x: float,
        y: float,
        processing_rate_per_min: float = 120.0,
        gate_type: str = "security"
    ):
        self.queues[gate_id] = {
            "id": gate_id,
            "name": gate_name,
            "x": x,
            "y": y,
            "type": gate_type,
            "processing_rate": processing_rate_per_min,  # people per minute
            "incoming_rate": 0.0,
            "active_agent_ids": [],
            "history_lengths": [],
            "processed_count": 0,
            "wait_time_sec": 0.0
        }

    def update(self, dt: float, current_inflow_rates: Optional[Dict[str, float]] = None):
        """
        Updates queue lengths, wait times, and bottleneck status based on incoming vs service rate.
        """
        for gid, q in self.queues.items():
            if current_inflow_rates and gid in current_inflow_rates:
                q["incoming_rate"] = current_inflow_rates[gid]

            # Service rate per second
            service_per_sec = q["processing_rate"] / 60.0
            processed_this_tick = service_per_sec * dt

            # If there are agents in queue, process them
            num_in_queue = len(q["active_agent_ids"])
            
            # Compute wait time: queue_length / service_rate (in seconds)
            if service_per_sec > 0:
                q["wait_time_sec"] = (num_in_queue / service_per_sec)
            else:
                q["wait_time_sec"] = 999.0

            q["history_lengths"].append(num_in_queue)
            if len(q["history_lengths"]) > 60:
                q["history_lengths"].pop(0)

    def assign_agent_to_queue(self, gate_id: str, agent_id: int) -> int:
        if gate_id in self.queues:
            if agent_id not in self.queues[gate_id]["active_agent_ids"]:
                self.queues[gate_id]["active_agent_ids"].append(agent_id)
            return self.queues[gate_id]["active_agent_ids"].index(agent_id)
        return 0

    def remove_agent_from_queue(self, gate_id: str, agent_id: int):
        if gate_id in self.queues and agent_id in self.queues[gate_id]["active_agent_ids"]:
            self.queues[gate_id]["active_agent_ids"].remove(agent_id)
            self.queues[gate_id]["processed_count"] += 1

    def get_queue_statuses(self) -> List[QueueStatus]:
        statuses = []
        for gid, q in self.queues.items():
            q_len = len(q["active_agent_ids"])
            ratio = (q["incoming_rate"] / max(1.0, q["processing_rate"])) if q["processing_rate"] > 0 else 2.0
            
            if ratio > 1.25 or q_len > 150:
                status = "CRITICAL BOTTLENECK"
            elif ratio > 0.9 or q_len > 60:
                status = "MODERATE CONGESTION"
            else:
                status = "NORMAL FLOW"

            statuses.append(QueueStatus(
                gate_id=gid,
                gate_name=q["name"],
                incoming_flow_per_min=round(q["incoming_rate"], 1),
                processing_rate_per_min=round(q["processing_rate"], 1),
                queue_length=q_len,
                estimated_wait_time_sec=round(q["wait_time_sec"], 1),
                status=status
            ))
        return statuses

    def detect_bottlenecks(self, zone_densities: Dict[str, float]) -> List[BottleneckAlert]:
        alerts = []
        for gid, q in self.queues.items():
            q_len = len(q["active_agent_ids"])
            ratio = (q["incoming_rate"] / max(1.0, q["processing_rate"])) if q["processing_rate"] > 0 else 2.0

            if ratio > 1.2 or q_len > 120:
                alerts.append(BottleneckAlert(
                    id=f"alert_{gid}",
                    location_name=q["name"],
                    x=q["x"],
                    y=q["y"],
                    current_density=round(min(5.5, 2.0 + (q_len / 40.0)), 2),
                    severity="CRITICAL" if (ratio > 1.4 or q_len > 250) else "HIGH",
                    reason=f"Incoming crowd ({round(q['incoming_rate'])}/min) exceeds security throughput ({round(q['processing_rate'])}/min) by {round((ratio-1.0)*100)}%. Queue length: {q_len} people.",
                    recommended_action=f"Deploy secondary turnstile lane or redirect 35% of inflow to adjacent entry points."
                ))
        return alerts
