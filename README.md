# CrowdSafe AI — Intelligent Crowd Management, Digital Twin & Emergency Evacuation System

> **Final-Year Engineering Project & SIH Innovation Edition**
> A production-grade, local-first intelligent crowd management, 3D digital twin, and emergency response platform.

---

## 🌟 Key Highlights & Innovations

1. **User-Driven 2D Blueprint Studio CAD**:
   - Draw custom venue layouts with 18+ tools (Walls, Gates, Barricades, Turnstiles, Security Pavilions, Seating Stands, Stages, Restricted Zones, Medical Stations, Exits).
   - Real-time CAD grid, measurements, snap-to-grid, scale configuration, and usable vs obstructed area calculations.

2. **Automated 2D ➔ 3D Digital Twin Conversion**:
   - 1-Click compiler transforming 2D CAD blueprint geometry into fully textured procedural 3D structures with architectural concourses, tiered seating, gates, and turnstiles.
   - Built-in rich procedural presets: **Grand Stadium**, **Railway Terminal**, **Temple Complex**, **Civic Rally Ground**, **Shopping Mall**, and **Cultural Festival Park**.

3. **High-Performance Instanced 3D Crowd Simulation**:
   - Renders thousands of animated low-poly human figures with head/torso/limbs, walk cycles, clothing color variations, and panic acceleration.
   - Realistic **Social Force Model** physics: obstacle avoidance, interpersonal repulsion, queue lane steering, and target driving forces.

4. **Entrance Queuing Dynamics & Turnstile Bottleneck Detector**:
   - Models arrival inflow vs gate processing throughput ($M/M/c$ queuing theory).
   - Live wait time calculations, queue length monitoring, and critical bottleneck alerts.

5. **Dynamic 3D Density Heatmap & Velocity Streamlines**:
   - Real-time ground plane density overlay (Green `< 2.0 p/m²`, Yellow `2.0 - 3.5 p/m²`, Orange `3.5 - 4.5 p/m²`, Red `> 4.5 p/m²`).
   - Animated vector streamlines showing crowd currents.

6. **AI Safety Advisor (0–100 Composite Score)**:
   - Multi-factor risk decomposition across density pressure, queue blockage, evacuation readiness, and venue occupancy.
   - Live prescriptive action recommendations.

7. **AI Crowd Forecasting Engine**:
   - 10-minute, 30-minute, and 60-minute occupancy forecasts using polynomial regression and dynamic accumulation models.
   - Real-time calculation of **Time-to-Safe-Capacity-Exceedance**.

8. **Emergency Evacuation Command Center**:
   - Interactive hazard triggers: **Fire & Smoke** (with custom placement and radius), **Exit Blockage** (with live Dijkstra rerouting), **Crowd Surge / Panic**, **Medical Incident**.
   - Live evacuation telemetry: total crowd, exited, remaining inside, clearance %, elapsed time, and ETA countdown.

9. **What-If Safety Lab & Permutation Optimizer**:
   - Simulate and compare layout improvements (adding emergency exits, widening choke points, increasing turnstile capacity).
   - Side-by-side A/B comparison with delta metrics and 1-click **Apply Optimal Design**.

10. **Official PDF Safety Audit Reports**:
    - Generates publication-ready PDF safety reports via ReportLab with tables, risk breakdown, and compliance sign-off blocks.

---

## 🚀 Running Locally

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### Quick Start
Double-click `start_all.bat` or run:

```bash
# Terminal 1: Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

- **Frontend Interface**: [http://localhost:5173](http://localhost:5173)
- **Backend API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **WebSocket Gateway**: `ws://localhost:8000/ws/simulation`
