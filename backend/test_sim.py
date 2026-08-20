import time
from simulation.engine import SimulationEngine

e = SimulationEngine()
e.load_default_venue()
print(f"Loaded venue: {e.venue_name}, agents: {len(e.agents)}, is_running: {e.is_running}")

# Check first 5 agents
for a in e.agents[:5]:
    print(f"Agent {a.id}: role={a.assigned_role}, state={a.state}, pos=({a.x:.2f}, {a.y:.2f}), target=({a.target_x:.2f}, {a.target_y:.2f}), speed={a.desired_speed:.2f}")

# Run 10 ticks
print("\n--- Running 10 ticks (normal) ---")
for t in range(10):
    e.tick(0.05)

for a in e.agents[:5]:
    print(f"Agent {a.id} after 10 ticks: pos=({a.x:.2f}, {a.y:.2f}), v=({a.vx:.2f}, {a.vy:.2f}), state={a.state}")

# Trigger fire emergency
print("\n--- Triggering Fire at (50, 40) ---")
e.trigger_emergency("fire", 50.0, 40.0, 15.0)
for t in range(20):
    e.tick(0.05)

for a in e.agents[:5]:
    print(f"Agent {a.id} in emergency: pos=({a.x:.2f}, {a.y:.2f}), v=({a.vx:.2f}, {a.vy:.2f}), state={a.state}, panic={a.panic_level:.2f}")
