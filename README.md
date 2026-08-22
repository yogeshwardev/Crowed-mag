# 🛡️ CrowdSafe AI — Autonomous 3D Digital Twin, Multi-Agent Crowd Dynamics & Emergency Egress Management Platform

> **Academic & Innovation Edition — Final-Year Capstone / Hackathon Production Release**  
> *A local-first, production-grade 3D Digital Twin, Social Force multi-agent physics simulator, Computer Vision surveillance analyzer, and automated emergency egress optimization system.*

---

## 📑 Table of Contents
1. [Executive Summary](#-executive-summary)
2. [High-Level System Architecture](#-high-level-system-architecture)
3. [A to Z Complete Feature Deep-Dive](#-a-to-z-complete-feature-deep-dive)
   - [Module 1: 3D Digital Twin & Autonomous Crowd Dynamics](#1-3d-digital-twin--autonomous-crowd-dynamics)
   - [Module 2: 2D CAD Blueprint Studio & Geometry Compiler](#2-2d-cad-blueprint-studio--geometry-compiler)
   - [Module 3: Live Simulation & $M/M/c$ Turnstile Queuing Theory](#3-live-simulation--mmc-turnstile-queuing-theory)
   - [Module 4: AI Safety Advisor & Incident Response Protocol](#4-ai-safety-advisor--incident-response-protocol)
   - [Module 5: CCTV AI Vision Wall & YOLO Anomaly Detection](#5-cctv-ai-vision-wall--yolo-anomaly-detection)
   - [Module 6: Emergency Command & Stampede Evacuation Engine](#6-emergency-command--stampede-evacuation-engine)
   - [Module 7: What-If Safety Lab & Algorithmic Layout Optimizer](#7-what-if-safety-lab--algorithmic-layout-optimizer)
   - [Module 8: Compliance Analytics & Official PDF Audit Generator](#8-compliance-analytics--official-pdf-audit-generator)
4. [Mathematical & Physical Formulations](#-mathematical--physical-formulations)
   - [Helbing Social Force Equations](#1-helbing-social-force-model)
   - [Position-Based Dynamics (PBD) Non-Penetration Constraint](#2-position-based-dynamics-pbd-collision-resolution)
   - [Dijkstra Dynamic Cost-Field Navigation](#3-dijkstra-cost-field-gradient-routing)
   - [Cellular Automata Fire & Smoke Diffusion](#4-cellular-automata-fire--smoke-advection-diffusion)
   - [Erlang $M/M/c$ Queuing Inflow/Outflow](#5-erlang-mmc-gate-queuing-formulation)
   - [Polynomial Crowd Surge Forecasting](#6-polynomial-regression-crowd-forecaster)
5. [Complete Technical Stack](#-complete-technical-stack)
6. [API Reference & WebSocket Protocol](#-api-reference--websocket-protocol)
7. [Installation & Execution Guide](#-installation--execution-guide)
8. [Live Demonstration & Presentation Script](#-live-demonstration--presentation-script)

---

## 🌟 Executive Summary

**CrowdSafe AI** is an end-to-end intelligent crowd safety management platform designed to prevent catastrophic stampedes, optimize venue ingress/egress, detect crowd crushes in real time, and simulate complex emergency evacuations (such as stadium fires, panic stampedes, and gate blockages).

Unlike traditional static dashboards, CrowdSafe AI combines:
1. **Interactive 2D CAD Blueprint Studio** with instant procedural 3D architectural synthesis.
2. **60 FPS Autonomous Multi-Agent Social Force Physics** with granular human kinematics (foot lift, leg swing, arm oscillation, body bobbing, and shortest-arc turns).
3. **Real-Time Physical Fire & Smoke Simulation Grid** based on thermal cellular automata.
4. **AI Computer Vision & YOLO Surveillance Feed** simulating 4 perimeter CCTV camera feeds with real-time bounding boxes and anomaly tracking.
5. **Algorithmic What-If Optimizer** that reorganizes venue barriers and exit gates to minimize evacuation times.
6. **Publication-Ready PDF Safety Certification Generator** powered by ReportLab.

---

## 🏗️ High-Level System Architecture

```
                                  ┌──────────────────────────────────────────────────────────┐
                                  │                  USER / OPERATOR BROWSER                 │
                                  │                 (React 18 + Three.js + R3F)              │
                                  └─────────────┬──────────────────────────────▲─────────────┘
                                                │                              │
                                     REST HTTP  │                              │ WebSocket Stream
                                     (API JSON) │                              │ (20 Hz Telemetry)
                                                ▼                              │
┌──────────────────────────────────────────────────────────────────────────────┴─────────────┐
│                                   FASTAPI BACKEND GATEWAY                                  │
│                                    (Python 3.11+ / Uvicorn)                                │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────┐  ┌───────────────────────┐  ┌──────────────────────────────────┐ │
│ │  SimulationEngine     │  │  VisionAnalyticsEngine│  │  CrowdForecaster                 │ │
│ │  • Social Force Model │  │  • CCTV Camera Setup  │  │  • Polynomial Occupancy Fit      │ │
│ │  • PBD Hard Collision │  │  • YOLO Object Boxes  │  │  • Time-to-Exceedance Prediction │ │
│ │  • Dijkstra Mesh      │  │  • Anomaly Detection  │  │  • Historical Inflow Extrapol.   │ │
│ └──────────┬────────────┘  └───────────────────────┘  └──────────────────────────────────┘ │
│            │                                                                               │
│ ┌──────────┴────────────┐  ┌───────────────────────┐  ┌──────────────────────────────────┐ │
│ │  FireSimulationGrid   │  │  GateQueueManager     │  │  SafetyReportGenerator           │ │
│ │  • Thermal Advection  │  │  • M/M/c Queuing      │  │  • ReportLab PDF Engine          │ │
│ │  • Smoke Diffusion    │  │  • Inflow / Throughput│  │  • High-Res Charts & Tables      │ │
│ │  • Dynamic Obstacles  │  │  • Bottleneck Alerter │  │  • Compliance Certification      │ │
│ └───────────────────────┘  └───────────────────────┘  └──────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 A to Z Complete Feature Deep-Dive

### 1. 3D Digital Twin & Autonomous Crowd Dynamics
* **Procedural Architectural Rendering**: Compiles 2D CAD elements into 3D pitch markings, tiered stadium grandstands, corner floodlight masts, security turnstiles, food concessions, restrooms, and security checkpoints.
* **Instanced Kinematic Crowd**: Supports thousands of concurrent 3D human figures rendered via `THREE.InstancedMesh` with high performance.
* **Granular Locomotion Kinematics**:
  * Dual-phase pendulum leg walk cycle with dynamic stride frequency ($3.8\text{ rad/s}$ walking, $7.8\text{ rad/s}$ sprinting).
  * True foot ground-lift clearance to prevent foot gliding.
  * Counter-phase arm swinging with natural torso forward lean and vertical breathing bob.
  * Shortest-arc heading rotation avoiding unnatural 360° spin flips.
* **Dynamic Speed Multipliers**: Interactive `1x`, `1.5x`, `2x`, `2.5x`, and `3x` controls scaling physics integration $\Delta t$ and gait frequency.
* **9 Viewport Cameras**: Overview, Main Entrance, Checkpoint Turnstiles, Top-Down Orthographic, Ground-Level First-Person, and 4 high-mast perimeter CCTV feeds (`CAM-1` through `CAM-4`).
* **Visual Overlays**:
  * **3D Realistic**: Textured architectural models with natural illumination and shadows.
  * **Heatmap View**: Live ground-plane color gradient representing local density ($\text{p/m}^2$).
  * **Crowd Flow**: Animated directional vectors and streamlines showing crowd currents.
  * **Evacuation Routes**: Visualized shortest-path egress pathways to unblocked emergency gates.

---

### 2. 2D CAD Blueprint Studio & Geometry Compiler
* **Interactive Canvas**: Drag-and-drop CAD editor with 18+ tools (Walls, Glass Partitions, Entry Gates, Emergency Exits, Security Screening Turnstiles, Tiered Seating Stands, Stages, Food Kiosks, Medical Centers, VIP Lounges, and Restricted Zones).
* **Precise Measurement & Snapping**: Real-time millimeter/meter coordinates, dimension tooltips, element rotation, resizing handles, and collision boundaries.
* **Venue Presets**: Instant loading of 6 built-in blueprint layouts:
  1. *Grand National Stadium* (120m × 80m)
  2. *Metro Transit Terminal* (100m × 60m)
  3. *Heritage Temple Complex* (110m × 90m)
  4. *Civic Rally Arena* (140m × 100m)
  5. *Multi-Level Shopping Mall* (90m × 70m)
  6. *Open-Air Festival Park* (120m × 85m)
* **1-Click Sync**: Compiles 2D geometry into the 3D Digital Twin and reinitializes backend navigation meshes and spatial hash buckets in zero milliseconds.
* **JSON Import/Export**: Save and load custom blueprint designs.

---

### 3. Live Simulation & $M/M/c$ Turnstile Queuing Theory
* **Dynamic Population Controller**: Number input box and quick presets (`200`, `500`, `1k`, `1.5k`, `2k`, `3k`) to populate the exact desired crowd count.
* **Turnstile Gate Queues**: Models arrival rates ($\lambda$) vs processing capacity ($c \cdot \mu$) per gate.
* **Bottleneck Detection**: Automatic alerts when queue length exceeds threshold or wait time exceeds 45 seconds.
* **Playback Controls**: Run, Pause, and Single-Step ($\Delta t = 0.05\text{s}$) simulation ticks.

---

### 4. AI Safety Advisor & Incident Response Protocol
* **Composite Safety Score (0–100)**: Evaluates venue safety using weighted multi-factor risk decomposition:
  * Crowd Density Pressure ($30\%$)
  * Flow Efficiency & Velocity ($20\%$)
  * Bottleneck Congestion Index ($20\%$)
  * Evacuation Egress Readiness ($20\%$)
  * Panic Contagion Level ($10\%$)
* **Tactical Incident Response Card**: When an emergency occurs, the AI calculates prioritized step-by-step mitigation actions (e.g., "Open Emergency Gate B", "Activate PA Broadcast Sector 4", "Deploy Crowd Wardens to Stairwell 2").
* **Density Distribution Breakdown**: Real-time bar charts categorizing venue areas into Free Flow, Safe, Warning, and Critical zones.

---

### 5. CCTV AI Vision Wall & YOLO Anomaly Detection
* **4-Camera Live Surveillance Grid**: Displays live simulated feeds from perimeter floodlight masts with realistic scanning lines and digital timestamps.
* **Object Detection Overlays**: Renders bounding boxes (`person: 98%`, `velocity: 1.2 m/s`) on moving occupants.
* **Vision Anomaly Engine**: Detects:
  * Overcrowding & Compression Hotspots
  * Sudden Running & Stampede Surges
  * Counter-Flow Directional Conflicts
  * Stumbling & Fallen Occupants

---

### 6. Emergency Command, Power Outage & Autonomous Drone Fleet Engine
* **Hazard & Crisis Scenarios**:
  * **⚡ Power Grid Failure (Blackout Mode)**: Immediate venue grid cut with zero-lux darkness, emergency exit illumination, and automatic launch of the **Autonomous Tactical Drone Fleet**.
  * **Physical Fire & Smoke**: Point-and-click 3D raycast fire placement or 1-click Quick Ignite.
  * **Panic Stampede**: Sudden surge trigger creating radial repulsion.
  * **Crowd Surge / Crush**: High-density bottleneck compression.
  * **Exit Blockage**: Interactive gate lock/unlock toggles with automatic Dijkstra rerouting.
* **Autonomous Tactical Drone Fleet (`Falcon-1` & `Falcon-2`)**:
  * Dual quadcopter drones equipped with spinning 3D propellers, navigation strobes, and **High-Intensity Downward Searchlight Cones**.
  * **Real-Time FPV & FLIR Thermal HUD**: Switch between White-Hot Thermal, Night Vision (NVG Green), and Ironbow heatmap filters with artificial horizon and live telemetry.
  * Drones autonomously orbit crowd crush hotspots, sweep perimeter egress gates, and illuminate dark exit routes during blackouts.
* **Realistic Egress Flow (No Instant Disappearance)**:
  * Panicked agents sprint outward from danger at $2.8 - 3.4\text{ m/s}$.
  * People funnel through exit gates with doorway bottleneck friction ("faster-is-slower" effect).
  * Occupants walk $18 - 25\text{m}$ onto exterior streets before safely dispersing.
* **Synchronized Live Evacuation Counter**: Real-time tracking of exited citizens, remaining inside, and completion ETA.
* **100% Evacuation Celebration Banner**: Automatically triggers when remaining occupants reach 0.

---

### 7. What-If Safety Lab & Algorithmic Layout Optimizer
* **Scenario Modeling**: Test hypothetical crisis scenarios (e.g., "What happens if Main Gate A is blocked during a 2,000-person concert?").
* **Algorithmic Venue Optimizer**: Recommends barrier relocations, doorway widening, and secondary emergency gate placements.
* **Before vs. After Delta Comparison**: Shows exact percentage reductions in evacuation time and peak crush density.
* **1-Click Apply**: Directly updates the active venue blueprint with optimized architectural geometry.

---

### 8. Compliance Analytics & Official PDF Audit Generator
* **Hourly Occupancy Forecaster**: Polynomial regression curve showing predicted crowd accumulation and peak capacity breach times.
* **Historical Incident Logs**: Timestamped records of past bottleneck alerts and emergency drills.
* **ReportLab PDF Engine**: Generates an official, publication-ready **Crowd Safety & Egress Audit Certificate** containing:
  * Venue blueprint specifications & usable area calculations
  * NFPA / Life Safety Code compliance ratings
  * Evacuation time benchmarks and bottleneck risk matrices
  * Official safety certification sign-off blocks

---

## 📐 Mathematical & Physical Formulations

### 1. Helbing Social Force Model
Each agent $i$ of mass $m_i$ obeys Newton's second law:

$$m_i \frac{d\mathbf{v}_i}{dt} = \mathbf{f}_i^0 + \sum_{j \ne i} \mathbf{f}_{ij} + \sum_{W} \mathbf{f}_{iW} + \mathbf{f}_{i}^{\text{hazard}}$$

#### A. Driving Force towards Target $\mathbf{e}_i^0$:
$$\mathbf{f}_i^0 = m_i \frac{v_i^0 \mathbf{e}_i^0(t) - \mathbf{v}_i(t)}{\tau}$$
Where $v_i^0$ is desired speed ($1.1\text{ m/s}$ normal, $3.2\text{ m/s}$ panic) and $\tau = 0.5\text{s}$ is relaxation time.

#### B. Interpersonal Repulsion & Friction:
$$\mathbf{f}_{ij} = A_i \exp\left(\frac{r_{ij} - d_{ij}}{B_i}\right)\mathbf{n}_{ij} + k \, g(r_{ij} - d_{ij})\mathbf{n}_{ij} + \kappa \, g(r_{ij} - d_{ij}) \Delta v_{ji}^t \mathbf{t}_{ij}$$
Where $r_{ij} = r_i + r_j$ is sum of radii, $d_{ij} = \|\mathbf{x}_i - \mathbf{x}_j\|$, and $g(x) = \max(0, x)$ represents physical contact compression.

#### C. Radial Hazard Escape Force:
$$\mathbf{f}_{i}^{\text{hazard}} = \frac{\mathbf{x}_i - \mathbf{x}_{\text{fire}}}{\|\mathbf{x}_i - \mathbf{x}_{\text{fire}}\|} \cdot C_{\text{flee}} \cdot \max\left(0, 1 - \frac{\|\mathbf{x}_i - \mathbf{x}_{\text{fire}}\|}{R_{\text{danger}}}\right)$$

---

### 2. Position-Based Dynamics (PBD) Collision Resolution
To strictly eliminate inter-agent overlaps without velocity explosions, a non-penetration position constraint solver runs across spatial hash buckets:

$$\Delta \mathbf{x}_1 = +\frac{1}{2} (r_1 + r_2 - d) \frac{\mathbf{x}_1 - \mathbf{x}_2}{d}, \quad \Delta \mathbf{x}_2 = -\frac{1}{2} (r_1 + r_2 - d) \frac{\mathbf{x}_1 - \mathbf{x}_2}{d}$$

---

### 3. Dijkstra Cost-Field Gradient Routing
The navigation mesh discretizes the venue into a 2D grid. The static distance field $\Phi(x, y)$ to the nearest active exit gate is solved via Dijkstra's algorithm. Desired heading vector is the negative gradient:

$$\mathbf{e}_i^0 = -\frac{\nabla \Phi(\mathbf{x}_i)}{\|\nabla \Phi(\mathbf{x}_i)\|}$$

When a gate is blocked, its cost is set to $\infty$ and the cost-field updates dynamically in $\mathcal{O}(V \log V)$.

---

### 4. Cellular Automata Fire & Smoke Advection-Diffusion
Fire temperature $T(x,y)$ and smoke concentration $S(x,y)$ propagate across a 2D cellular grid:

$$\frac{\partial T}{\partial t} = \alpha \nabla^2 T - \mathbf{u} \cdot \nabla T + Q_{\text{combustion}} - \gamma (T - T_{\text{ambient}})$$
$$\frac{\partial S}{\partial t} = D_s \nabla^2 S - \mathbf{u} \cdot \nabla S + \dot{S}_{\text{generation}}$$

Cells where $T > 120^\circ\text{C}$ or $S > 0.4$ are dynamically tagged as danger zone obstacles in the navigation mesh.

---

### 5. Erlang $M/M/c$ Gate Queuing Formulation
For entry gates with arrival rate $\lambda$ and $c$ parallel turnstile channels with service rate $\mu$:

$$\text{Traffic Intensity: } \rho = \frac{\lambda}{c \mu}$$

$$\text{State Probability: } P_0 = \left[ \sum_{k=0}^{c-1} \frac{(c\rho)^k}{k!} + \frac{(c\rho)^c}{c!(1-\rho)} \right]^{-1}$$

$$\text{Expected Queue Length: } L_q = \frac{P_0 (c\rho)^c \rho}{c! (1-\rho)^2}, \quad \text{Expected Wait Time: } W_q = \frac{L_q}{\lambda}$$

---

### 6. Polynomial Regression Crowd Forecaster
Occupancy at future time $t + \Delta t$ is modeled via least-squares polynomial extrapolation:

$$\hat{N}(t) = \sum_{k=0}^n \beta_k t^k$$
$$\text{Time to Capacity Exceedance: } t^* = \arg\min_t \{ \hat{N}(t) \ge N_{\text{safe\_capacity}} \}$$

---

## 💻 Complete Technical Stack

| Layer | Technologies & Libraries | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | React 18, TypeScript, Tailwind CSS, Lucide React | Modern responsive dashboard & controls |
| **3D Graphics Engine** | Three.js, React Three Fiber (R3F), Drei | WebGL hardware-accelerated 3D Digital Twin |
| **Data Visualization** | Recharts | Real-time charts, density histograms, forecast graphs |
| **Backend Framework** | Python 3.11+, FastAPI, Uvicorn | High-performance asynchronous API & WebSocket gateway |
| **Simulation & Physics**| NumPy, SciPy, NetworkX | Vectorized multi-agent physics & Dijkstra graph solvers |
| **Document Generation**| ReportLab | Publication-quality PDF audit certificate generator |
| **Database & ORM** | SQLite, SQLAlchemy, Pydantic v2 | Blueprint persistence and schema validation |

---

## 📡 API Reference & WebSocket Protocol

### REST Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | System health check & active agent count |
| `GET` | `/api/blueprints` | List all saved venue blueprints |
| `POST`| `/api/blueprints` | Save a new CAD blueprint |
| `GET` | `/api/templates/{name}` | Load a venue template (`stadium`, `railway`, `temple`, etc.) |
| `POST`| `/api/simulation/spawn` | Populate crowd size (`?count=1000`) |
| `POST`| `/api/simulation/speed` | Set simulation speed multiplier (`?speed=2.0`) |
| `POST`| `/api/emergency/trigger` | Trigger crisis (`fire`, `stampede`, `exit_blockage`) |
| `POST`| `/api/emergency/clear` | Clear emergency and restore normal venue flow |
| `POST`| `/api/whatif/optimize` | Run algorithmic layout optimizer |
| `POST`| `/api/reports/generate` | Generate official ReportLab PDF safety report |

### WebSocket Real-Time Stream
* **URL**: `ws://localhost:8000/ws/simulation`
* **Telemetry Snapshot Schema**:
```json
{
  "type": "TELEMETRY",
  "data": {
    "tick": 240,
    "is_emergency": false,
    "active_agent_count": 1000,
    "total_agent_count": 1000,
    "capacity": { "current_occupancy": 1000, "safe_capacity": 5000, "occupancy_percentage": 20.0 },
    "evacuation": { "is_active": false, "exited_people": 0, "remaining_people": 1000, "evacuation_percentage": 0 },
    "queues": [ { "gate_name": "Main Gate A", "queue_length": 42, "status": "NORMAL FLOW" } ],
    "bottlenecks": [],
    "agents": [ { "id": 1, "x": 58.2, "y": 41.5, "vx": 0.4, "vy": -0.8, "state": "WALKING" } ]
  }
}
```

---

## 🚀 Installation & Execution Guide

### Prerequisites
* **Node.js**: `v18.0.0` or higher ([Download Node.js](https://nodejs.org/))
* **Python**: `3.11` or higher ([Download Python](https://www.python.org/))
* **Git**: Installed and configured

### Step 1: Clone Repository
```bash
git clone https://github.com/yogeshwardev/Crowed-mag.git
cd Crowed-mag
```

### Step 2: Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 3: Frontend Setup
Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```

### Step 4: Access the Application
* **Frontend Digital Twin**: [http://localhost:5173](http://localhost:5173)
* **Backend Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **WebSocket Gateway**: `ws://localhost:8000/ws/simulation`

---

## 🎬 Live Demonstration & Presentation Script

1. **Introduction & Digital Twin (Tab 1)**:
   * Show the 3D stadium digital twin with textured grandstands, floodlights, and moving crowd.
   * Switch between camera modes (`CAM-1`, `Turnstiles`, `Top View`) and overlays (`Heatmap View`, `Crowd Flow`).
2. **CAD Blueprint Studio (Tab 2)**:
   * Select a preset (e.g., *Railway Terminal* or *Grand Stadium*), draw a new emergency exit gate, and click **"Sync to 3D Twin"** to show instant geometry compilation.
3. **Live Simulation & Crowd Scaling (Tab 3)**:
   * Navigate to **Live Simulation**, type `1000` in the Crowd Size Controller, and click **"⚡ POPULATE 1,000 CITIZENS"**.
   * Demonstrate turnstile queue growth and change simulation speed to `2x` or `3x`.
4. **Emergency Evacuation Drill (Tab 1 or Tab 6)**:
   * Click **"🔥 IGNITE FIRE"** on the pitch. Observe panic contagion, radial fleeing, bottleneck arching at gates, and the live evacuation counter ($1,000 \to 0$).
   * Show the **"✅ EVACUATION 100% COMPLETE"** celebratory banner.
5. **AI Advisor & What-If Optimizer (Tabs 4 & 7)**:
   * Show AI tactical incident response recommendations and run the What-If optimizer to see automated layout improvements.
6. **PDF Audit Report (Tab 8)**:
   * Click **"Generate PDF Report"** to download the official ReportLab compliance audit document.

---

### 👥 Authors & Acknowledgments
* Developed as an Advanced Multi-Agent AI & Digital Twin Engineering Project.
* Tracked on GitHub: [`https://github.com/yogeshwardev/Crowed-mag.git`](https://github.com/yogeshwardev/Crowed-mag.git)
