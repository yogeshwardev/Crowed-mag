import math
import time
import numpy as np
from typing import Dict, List, Any, Tuple, Optional
from sklearn.cluster import DBSCAN

class VisionAnalyticsEngine:
    """
    Real-time AI Vision & Anomaly Detection Engine.
    Simulates intelligent multi-camera CCTV analytics:
    - Multi-camera FOV frustum tracking
    - Bounding box generation with tracking IDs & classifications
    - Optical Flow & Velocity Vector Divergence/Curl calculation
    - Crowd Turbulence Index (Reynolds-like)
    - DBSCAN Spatial Density Clustering for dynamic hotspot discovery
    - Automated real-time anomaly event classification
    """
    def __init__(self, venue_width: float = 120.0, venue_length: float = 80.0):
        self.width = float(venue_width)
        self.length = float(venue_length)

        # Pre-configured virtual CCTV cameras placed at strategic vantage points
        self.cameras: List[Dict[str, Any]] = [
            {
                "id": "cam_01",
                "name": "CAM-01: North Gate & Security Turnstiles",
                "x": 20.0,
                "y": 14.0,
                "height": 7.5,
                "fov_deg": 75.0,
                "target_x": 20.0,
                "target_y": 28.0,
                "range": 25.0,
                "fps": 30.0,
                "resolution": "1080p"
            },
            {
                "id": "cam_02",
                "name": "CAM-02: Grand Central Concourse",
                "x": 60.0,
                "y": 40.0,
                "height": 9.0,
                "fov_deg": 90.0,
                "target_x": 60.0,
                "target_y": 45.0,
                "range": 35.0,
                "fps": 30.0,
                "resolution": "4K"
            },
            {
                "id": "cam_03",
                "name": "CAM-03: East Stand Grandstand Corridor",
                "x": 98.0,
                "y": 40.0,
                "height": 8.0,
                "fov_deg": 80.0,
                "target_x": 85.0,
                "target_y": 40.0,
                "range": 28.0,
                "fps": 30.0,
                "resolution": "1080p"
            },
            {
                "id": "cam_04",
                "name": "CAM-04: Emergency Exit Gate Bravo",
                "x": 60.0,
                "y": 72.0,
                "height": 7.0,
                "fov_deg": 70.0,
                "target_x": 60.0,
                "target_y": 60.0,
                "range": 22.0,
                "fps": 30.0,
                "resolution": "1080p"
            }
        ]

        self.last_analysis_time = time.time()
        self.anomaly_history: List[Dict[str, Any]] = []

    def configure_cameras(self, width: float, length: float):
        self.width = width
        self.length = length
        self.cameras[0]["x"] = width * 0.2
        self.cameras[0]["y"] = length * 0.18
        self.cameras[0]["target_x"] = width * 0.2
        self.cameras[0]["target_y"] = length * 0.35

        self.cameras[1]["x"] = width * 0.5
        self.cameras[1]["y"] = length * 0.5
        self.cameras[1]["target_x"] = width * 0.5
        self.cameras[1]["target_y"] = length * 0.55

        self.cameras[2]["x"] = width * 0.82
        self.cameras[2]["y"] = length * 0.5
        self.cameras[2]["target_x"] = width * 0.7
        self.cameras[2]["target_y"] = length * 0.5

        self.cameras[3]["x"] = width * 0.5
        self.cameras[3]["y"] = length * 0.88
        self.cameras[3]["target_x"] = width * 0.5
        self.cameras[3]["target_y"] = length * 0.75

    def analyze_frame(self, agents: List[Any], danger_zones: List[Dict], is_emergency: bool) -> Dict[str, Any]:
        """
        Runs live AI vision inference on active agent positions and velocities.
        """
        now = time.time()
        active_agents = [a for a in agents if getattr(a, 'state', '') != 'SAFE']
        total_active = len(active_agents)

        if total_active == 0:
            return {
                "cameras": [],
                "anomalies": [],
                "clusters": [],
                "global_turbulence": 0.0,
                "detection_confidence": 0.99
            }

        # 1. Extract agent positions and velocities as NumPy arrays
        pos_list = []
        vel_list = []
        state_list = []
        id_list = []

        for a in active_agents:
            pos_list.append([a.x, a.y])
            vel_list.append([a.vx, a.vy])
            state_list.append(a.state)
            id_list.append(a.id)

        positions = np.array(pos_list, dtype=np.float32)
        velocities = np.array(vel_list, dtype=np.float32)
        speeds = np.hypot(velocities[:, 0], velocities[:, 1])

        # 2. Compute Global & Local Crowd Turbulence Index (Reynolds-like)
        # T_c = Var(v) / (mean(v)^2 + 0.1)
        mean_vx = float(np.mean(velocities[:, 0]))
        mean_vy = float(np.mean(velocities[:, 1]))
        mean_speed = float(np.mean(speeds))
        var_vx = float(np.var(velocities[:, 0]))
        var_vy = float(np.var(velocities[:, 1]))
        global_turbulence = (var_vx + var_vy) / (mean_speed ** 2 + 0.2)
        global_turbulence = float(np.clip(global_turbulence, 0.0, 10.0))

        # 3. DBSCAN Spatial Density Clustering to detect dense crush pockets
        clusters_detected: List[Dict[str, Any]] = []
        try:
            # Epsilon = 3.0 meters, min_samples = 8 people
            db = DBSCAN(eps=3.0, min_samples=8).fit(positions)
            labels = db.labels_
            unique_labels = set(labels) - {-1}

            for k in unique_labels:
                class_member_mask = (labels == k)
                cluster_pts = positions[class_member_mask]
                cluster_vels = velocities[class_member_mask]
                cluster_speeds = speeds[class_member_mask]

                center_x = float(np.mean(cluster_pts[:, 0]))
                center_y = float(np.mean(cluster_pts[:, 1]))
                member_count = int(np.sum(class_member_mask))

                # Approximate radius
                dists = np.hypot(cluster_pts[:, 0] - center_x, cluster_pts[:, 1] - center_y)
                r = float(max(1.5, np.percentile(dists, 90)))
                area = math.pi * (r ** 2)
                cluster_density = member_count / max(1.0, area)

                # Velocity dispersion inside cluster
                v_dispersion = float(np.std(cluster_speeds))

                severity = "CRITICAL" if cluster_density > 4.2 else ("HIGH" if cluster_density > 2.8 else "MODERATE")

                clusters_detected.append({
                    "cluster_id": f"cluster_{k}",
                    "x": round(center_x, 1),
                    "y": round(center_y, 1),
                    "radius": round(r, 1),
                    "agent_count": member_count,
                    "density_pm2": round(cluster_density, 2),
                    "velocity_dispersion": round(v_dispersion, 2),
                    "severity": severity
                })
        except Exception:
            pass

        # 4. Multi-Camera Simulated CCTV Feeds & Optical Flow
        camera_results: List[Dict[str, Any]] = []
        detected_anomalies: List[Dict[str, Any]] = []

        for cam in self.cameras:
            cam_x, cam_y = cam["x"], cam["y"]
            tgt_x, tgt_y = cam["target_x"], cam["target_y"]
            cam_range = cam["range"]

            # Compute camera direction vector
            cdx = tgt_x - cam_x
            cdy = tgt_y - cam_y
            cdist = math.hypot(cdx, cdy) + 1e-6
            c_dir = np.array([cdx / cdist, cdy / cdist])

            # Find agents in camera FOV
            agent_vecs = positions - np.array([cam_x, cam_y])
            agent_dists = np.hypot(agent_vecs[:, 0], agent_vecs[:, 1])
            in_range = agent_dists <= cam_range

            if np.sum(in_range) == 0:
                camera_results.append({
                    **cam,
                    "tracked_count": 0,
                    "average_speed": 0.0,
                    "turbulence_index": 0.0,
                    "optical_flow_div": 0.0,
                    "optical_flow_curl": 0.0,
                    "status": "CLEAR",
                    "bounding_boxes": []
                })
                continue

            # Check FOV angle
            cos_fov = math.cos(math.radians(cam["fov_deg"] / 2.0))
            dot_prods = (agent_vecs[:, 0] * c_dir[0] + agent_vecs[:, 1] * c_dir[1]) / (agent_dists + 1e-6)
            in_fov_mask = in_range & (dot_prods >= cos_fov)

            tracked_indices = np.where(in_fov_mask)[0]
            tracked_count = int(len(tracked_indices))

            if tracked_count == 0:
                camera_results.append({
                    **cam,
                    "tracked_count": 0,
                    "average_speed": 0.0,
                    "turbulence_index": 0.0,
                    "optical_flow_div": 0.0,
                    "optical_flow_curl": 0.0,
                    "status": "CLEAR",
                    "bounding_boxes": []
                })
                continue

            sub_vels = velocities[tracked_indices]
            sub_speeds = speeds[tracked_indices]
            sub_positions = positions[tracked_indices]
            sub_states = [state_list[i] for i in tracked_indices]
            sub_ids = [id_list[i] for i in tracked_indices]

            cam_avg_spd = float(np.mean(sub_speeds))
            cam_turb = float(np.var(sub_speeds) / (cam_avg_spd ** 2 + 0.15))

            # Optical Flow Divergence (expansion / compression)
            # div(V) = mean((xi - x_center) * vxi + (yi - y_center) * vyi)
            c_center = np.mean(sub_positions, axis=0)
            rel_pos = sub_positions - c_center
            div_flow = float(np.mean(rel_pos[:, 0] * sub_vels[:, 0] + rel_pos[:, 1] * sub_vels[:, 1]))
            # Optical Flow Curl (vorticity / spinning)
            curl_flow = float(np.mean(rel_pos[:, 0] * sub_vels[:, 1] - rel_pos[:, 1] * sub_vels[:, 0]))

            # Generate synthetic bounding boxes for up to 15 visible agents per camera
            sample_count = min(15, tracked_count)
            sample_idx = np.random.choice(tracked_count, sample_count, replace=False)
            bboxes = []
            for si in sample_idx:
                ax, ay = sub_positions[si]
                st = sub_states[si]
                spd = sub_speeds[si]
                ag_id = sub_ids[si]
                # Normalized screen coords relative to camera FOV
                norm_x = (ax - cam_x) / cam_range
                norm_y = (ay - cam_y) / cam_range

                tag = "PERSON_NORMAL"
                confidence = 0.94 + np.random.uniform(0.01, 0.05)
                if st in ["PANIC", "EVACUATING"] or spd > 2.8:
                    tag = "PERSON_SPRINTING"
                    confidence = 0.98
                elif st in ["FALLEN", "STUMBLING"]:
                    tag = "PERSON_FALLEN"
                    confidence = 0.96
                elif st == "QUEUING":
                    tag = "PERSON_QUEUING"
                    confidence = 0.92

                bboxes.append({
                    "id": ag_id,
                    "tag": tag,
                    "confidence": round(confidence, 3),
                    "world_x": round(float(ax), 1),
                    "world_y": round(float(ay), 1),
                    "speed": round(float(spd), 2),
                    "state": st
                })

            # Anomaly Classification for this Camera
            cam_status = "NORMAL"
            if is_emergency or any(st == "PANIC" for st in sub_states) or (cam_avg_spd > 2.8 and div_flow > 1.5):
                cam_status = "STAMPEDE_SURGE"
                detected_anomalies.append({
                    "camera_id": cam["id"],
                    "camera_name": cam["name"],
                    "type": "STAMPEDE_SURGE",
                    "severity": "CRITICAL",
                    "description": f"Rapid crowd dispersion & high sprint velocity ({cam_avg_spd:.2f} m/s) detected.",
                    "confidence": 0.96,
                    "timestamp": round(now, 1)
                })
            elif cam_turb > 1.8:
                cam_status = "TURBULENT_COUNTERFLOW"
                detected_anomalies.append({
                    "camera_id": cam["id"],
                    "camera_name": cam["name"],
                    "type": "TURBULENT_COUNTERFLOW",
                    "severity": "HIGH",
                    "description": f"Dangerous velocity turbulence index ({cam_turb:.2f}) indicates opposing crowd streams.",
                    "confidence": 0.91,
                    "timestamp": round(now, 1)
                })
            elif any(st == "FALLEN" for st in sub_states):
                cam_status = "FALLEN_OBSTRUCTION"
                detected_anomalies.append({
                    "camera_id": cam["id"],
                    "camera_name": cam["name"],
                    "type": "FALLEN_OBSTRUCTION",
                    "severity": "CRITICAL",
                    "description": "Fallen pedestrian detected in active traffic corridor.",
                    "confidence": 0.95,
                    "timestamp": round(now, 1)
                })
            elif tracked_count > 45:
                cam_status = "HIGH_CONGESTION"
                detected_anomalies.append({
                    "camera_id": cam["id"],
                    "camera_name": cam["name"],
                    "type": "HIGH_CONGESTION",
                    "severity": "ELEVATED",
                    "description": f"Camera FOV exceeds normal capacity ({tracked_count} people in view).",
                    "confidence": 0.89,
                    "timestamp": round(now, 1)
                })

            camera_results.append({
                **cam,
                "tracked_count": tracked_count,
                "average_speed": round(cam_avg_spd, 2),
                "turbulence_index": round(cam_turb, 2),
                "optical_flow_div": round(div_flow, 2),
                "optical_flow_curl": round(curl_flow, 2),
                "status": cam_status,
                "bounding_boxes": bboxes
            })

        # Keep last 10 anomalies in history
        if detected_anomalies:
            self.anomaly_history.extend(detected_anomalies)
            if len(self.anomaly_history) > 20:
                self.anomaly_history = self.anomaly_history[-20:]

        return {
            "cameras": camera_results,
            "anomalies": detected_anomalies,
            "clusters": clusters_detected,
            "global_turbulence": round(global_turbulence, 2),
            "detection_confidence": 0.95
        }
