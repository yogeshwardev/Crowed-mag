import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { AgentData, BlueprintElement } from '../../types';

interface CrowdAgentsProps {
  agents: AgentData[];
  venueWidth: number;
  venueLength: number;
  isEmergency: boolean;
  dangerZones?: Array<{ x: number; y: number; radius: number }>;
  elements?: BlueprintElement[];
  speedMultiplier?: number;
  onEvacuationProgress?: (stats: { exited: number; total: number; remaining: number; pct: number }) => void;
}

const CLOTHING_COLORS = [
  new THREE.Color('#0284c7'), // Sky Blue
  new THREE.Color('#dc2626'), // Crimson Red
  new THREE.Color('#16a34a'), // Forest Green
  new THREE.Color('#d97706'), // Amber / Orange
  new THREE.Color('#7c3aed'), // Purple
  new THREE.Color('#db2777'), // Rose Pink
  new THREE.Color('#334155'), // Charcoal Grey
  new THREE.Color('#f8fafc'), // Off White
  new THREE.Color('#0f766e'), // Deep Teal
  new THREE.Color('#b45309'), // Warm Brown
];

const SKIN_TONES = [
  new THREE.Color('#fcd34d'),
  new THREE.Color('#fbbf24'),
  new THREE.Color('#d97706'),
  new THREE.Color('#b45309'),
  new THREE.Color('#78350f'),
];

export const CrowdAgents: React.FC<CrowdAgentsProps> = ({
  agents,
  venueWidth,
  venueLength,
  isEmergency,
  dangerZones = [],
  elements = [],
  speedMultiplier = 1.0,
  onEvacuationProgress,
}) => {
  const lastProgressReport = useRef<number>(0);
  const torsoMeshRef = useRef<THREE.InstancedMesh>(null);
  const headMeshRef = useRef<THREE.InstancedMesh>(null);
  const leftLegMeshRef = useRef<THREE.InstancedMesh>(null);
  const rightLegMeshRef = useRef<THREE.InstancedMesh>(null);
  const leftArmMeshRef = useRef<THREE.InstancedMesh>(null);
  const rightArmMeshRef = useRef<THREE.InstancedMesh>(null);

  const offsetX = -venueWidth / 2;
  const offsetZ = -venueLength / 2;

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const maxInstances = 3000;

  // Real-time kinematic state cache for smooth 60 FPS autonomous organic motion
  const kinematicCache = useRef<Map<number, {
    x: number;
    y: number;
    vx: number;
    vy: number;
    targetX: number;
    targetY: number;
    angle: number;
    stridePhase: number;
    speed: number;
    wanderTimer: number;
    isExiting: boolean;
    egressDist: number;
    isSafe: boolean;
    serverLastX?: number;
    serverLastY?: number;
  }>>(new Map());

  // Extract exit coordinates
  const exits = useMemo(() => {
    const list = elements
      .filter((el) => el.type === 'exit_gate' || el.type === 'emergency_exit')
      .map((el) => ({ x: el.x, y: el.y, width: el.width || 4.0 }));

    if (list.length === 0) {
      // Default perimeter exits if none in blueprint
      return [
        { x: 3, y: venueLength / 2, width: 6.0 },
        { x: venueWidth - 3, y: venueLength / 2, width: 6.0 },
        { x: venueWidth / 2, y: 3, width: 6.0 },
        { x: venueWidth / 2, y: venueLength - 3, width: 6.0 },
      ];
    }
    return list;
  }, [elements, venueWidth, venueLength]);

  // Anatomical low-poly human body parts
  const torsoGeo = useMemo(() => new THREE.BoxGeometry(0.38, 0.55, 0.22), []);
  const headGeo = useMemo(() => new THREE.SphereGeometry(0.14, 8, 8), []);
  const legGeo = useMemo(() => new THREE.BoxGeometry(0.12, 0.62, 0.14), []);
  const armGeo = useMemo(() => new THREE.BoxGeometry(0.09, 0.50, 0.09), []);

  const torsoMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.1 }), []);
  const headMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fcd34d', roughness: 0.7 }), []);
  const pantsMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.8 }), []);
  const armsMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fcd34d', roughness: 0.7 }), []);

  useFrame((state, delta) => {
    if (
      !torsoMeshRef.current ||
      !headMeshRef.current ||
      !leftLegMeshRef.current ||
      !rightLegMeshRef.current ||
      !leftArmMeshRef.current ||
      !rightArmMeshRef.current
    ) return;

    const time = state.clock.getElapsedTime();
    const effectiveSpeed = Math.max(0.5, Math.min(4.0, speedMultiplier));
    const dt = Math.min(0.08, delta * effectiveSpeed);
    const count = Math.min(agents.length, maxInstances);

    torsoMeshRef.current.count = count;
    headMeshRef.current.count = count;
    leftLegMeshRef.current.count = count;
    rightLegMeshRef.current.count = count;
    leftArmMeshRef.current.count = count;
    rightArmMeshRef.current.count = count;

    for (let i = 0; i < count; i++) {
      const a = agents[i];

      // Retrieve or initialize kinematic cache
      let cached = kinematicCache.current.get(a.id);
      if (!cached) {
        cached = {
          x: a.x,
          y: a.y,
          vx: a.vx || (Math.random() - 0.5) * 0.4,
          vy: a.vy || (Math.random() - 0.5) * 0.4,
          targetX: a.target_x || (10 + Math.random() * (venueWidth - 20)),
          targetY: a.target_y || (10 + Math.random() * (venueLength - 20)),
          angle: Math.random() * Math.PI * 2,
          stridePhase: i * 0.6,
          speed: a.speed || 1.3,
          wanderTimer: 2.0 + Math.random() * 8.0,
          isExiting: false,
          egressDist: 0,
          isSafe: false,
          serverLastX: a.x,
          serverLastY: a.y,
        };
        kinematicCache.current.set(a.id, cached);
      }

      // If server streams active non-zero position changes, blend smoothly
      if (a.x !== cached.serverLastX || a.y !== cached.serverLastY) {
        cached.serverLastX = a.x;
        cached.serverLastY = a.y;
        cached.x = THREE.MathUtils.lerp(cached.x, a.x, Math.min(1.0, dt * 6.0));
        cached.y = THREE.MathUtils.lerp(cached.y, a.y, Math.min(1.0, dt * 6.0));
      }

      // Reset safe/exited state and re-populate when emergency is cleared
      if (!isEmergency && dangerZones.length === 0 && (cached.isSafe || cached.isExiting)) {
        cached.isSafe = false;
        cached.isExiting = false;
        cached.egressDist = 0;
        cached.x = 8.0 + Math.random() * (venueWidth - 16.0);
        cached.y = 8.0 + Math.random() * (venueLength - 16.0);
        cached.targetX = 8.0 + Math.random() * (venueWidth - 16.0);
        cached.targetY = 8.0 + Math.random() * (venueLength - 16.0);
        cached.wanderTimer = 3.0 + Math.random() * 8.0;
        a.state = 'WALKING';
      }

      // Only hide after walking far beyond the exit gates (dist > 18m) during active emergencies
      if (cached.isSafe) {
        dummy.position.set(0, -100, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        torsoMeshRef.current.setMatrixAt(i, dummy.matrix);
        headMeshRef.current.setMatrixAt(i, dummy.matrix);
        leftLegMeshRef.current.setMatrixAt(i, dummy.matrix);
        rightLegMeshRef.current.setMatrixAt(i, dummy.matrix);
        leftArmMeshRef.current.setMatrixAt(i, dummy.matrix);
        rightArmMeshRef.current.setMatrixAt(i, dummy.matrix);
        continue;
      }

      const isRunning = isEmergency || a.state === 'EVACUATING' || a.state === 'PANIC' || (a.panic_level && a.panic_level > 0.35) || dangerZones.length > 0;
      const isFallen = a.state === 'FALLEN' || a.state === 'STUMBLING';

      // 1. Realistic Multi-Agent Stampede & Evacuation Dynamics
      if (isRunning) {
        // --- STAMPEDE & FIRE ESCAPE ---
        let fleeDirX = 0;
        let fleeDirY = 0;
        let inFireProximity = false;

        // Check distance to all active fire hotspots
        for (const dz of dangerZones) {
          const dx = cached.x - dz.x;
          const dy = cached.y - dz.y;
          const dist = Math.hypot(dx, dy) + 0.001;
          const r = dz.radius || 15.0;

          if (dist < r * 2.5) {
            inFireProximity = true;
            const push = Math.min(6.5, 5.5 * (1.0 - dist / (r * 2.5)) + 2.5);
            fleeDirX += (dx / dist) * push;
            fleeDirY += (dy / dist) * push;
          }
        }

        let desiredVx = 0;
        let desiredVy = 0;

        if (inFireProximity) {
          // Direct radial sprint away from the fire epicenter
          const fleeMag = Math.hypot(fleeDirX, fleeDirY) + 1e-5;
          const sprintSpd = 2.8 + (i % 5) * 0.15;
          desiredVx = (fleeDirX / fleeMag) * sprintSpd;
          desiredVy = (fleeDirY / fleeMag) * sprintSpd;
        } else {
          // Find nearest unblocked exit gate
          let bestExit = exits[0];
          let bestDist = 9999;
          for (const ex of exits) {
            const dist = Math.hypot(ex.x - cached.x, ex.y - cached.y);
            if (dist < bestDist) {
              bestDist = dist;
              bestExit = ex;
            }
          }

          // If reached exit gate, step through and continue outward egress
          if (bestDist < 3.5 || cached.isExiting) {
            cached.isExiting = true;
            cached.egressDist += dt * 2.4;

            // Outward vector away from venue center
            const outwardX = bestExit.x - (venueWidth / 2);
            const outwardY = bestExit.y - (venueLength / 2);
            const outMag = Math.hypot(outwardX, outwardY) + 1e-5;

            desiredVx = (outwardX / outMag) * 2.2;
            desiredVy = (outwardY / outMag) * 2.2;

            // Only mark safe after dispersing 18m beyond the exit
            if (cached.egressDist > 18.0) {
              cached.isSafe = true;
              a.state = 'SAFE';
              continue;
            }
          } else {
            // Sprint towards nearest exit gate with doorway funneling
            const dx = bestExit.x - cached.x;
            const dy = bestExit.y - cached.y;
            const d = Math.hypot(dx, dy) + 1e-5;

            // Bottleneck Arching: naturally slow down at dense doorway choke points
            const bottleneckSpeed = bestDist < 8.0 ? Math.max(1.4, 2.6 * (bestDist / 8.0)) : (2.6 + (i % 5) * 0.15);
            desiredVx = (dx / d) * bottleneckSpeed;
            desiredVy = (dy / d) * bottleneckSpeed;
          }
        }

        // Realistic acceleration with body inertia (takes ~1s to reach top sprint)
        cached.vx = THREE.MathUtils.lerp(cached.vx, desiredVx, Math.min(1.0, dt * 3.5));
        cached.vy = THREE.MathUtils.lerp(cached.vy, desiredVy, Math.min(1.0, dt * 3.5));
      } else {
        // --- NORMAL REAL-TIME PEDESTRIAN CIRCULATION & WANDERING ---
        cached.wanderTimer -= dt;
        const distToTarget = Math.hypot(cached.targetX - cached.x, cached.targetY - cached.y);

        if (distToTarget < 2.5 || cached.wanderTimer <= 0) {
          cached.wanderTimer = 6.0 + Math.random() * 12.0;
          cached.targetX = 8.0 + Math.random() * (venueWidth - 16.0);
          cached.targetY = 8.0 + Math.random() * (venueLength - 16.0);
        }

        const dx = cached.targetX - cached.x;
        const dy = cached.targetY - cached.y;
        const d = Math.hypot(dx, dy) + 1e-5;
        const walkSpeed = 0.95 + (i % 4) * 0.08;

        const desiredVx = (dx / d) * walkSpeed;
        const desiredVy = (dy / d) * walkSpeed;

        cached.vx = THREE.MathUtils.lerp(cached.vx, desiredVx, Math.min(1.0, dt * 2.5));
        cached.vy = THREE.MathUtils.lerp(cached.vy, desiredVy, Math.min(1.0, dt * 2.5));
      }

      // Integrate position
      cached.x += cached.vx * dt;
      cached.y += cached.vy * dt;

      // Soft boundary clamp (allows exiting outward through perimeter gates)
      if (!cached.isExiting) {
        cached.x = Math.max(2.0, Math.min(venueWidth - 2.0, cached.x));
        cached.y = Math.max(2.0, Math.min(venueLength - 2.0, cached.y));
      }

      const actualSpeed = Math.hypot(cached.vx, cached.vy);
      cached.speed = actualSpeed;
      const isMoving = actualSpeed > 0.08 && !isFallen;
      const hasSmoke = Boolean(a.smoke_inhalation && a.smoke_inhalation > 0.15);

      // Smooth heading rotation
      if (isMoving) {
        const targetAngle = Math.atan2(-cached.vy, cached.vx) + Math.PI / 2;
        let diff = targetAngle - cached.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        cached.angle += diff * Math.min(1.0, dt * 8.0);
      }

      const worldX = cached.x + offsetX;
      const worldZ = cached.y + offsetZ;
      const hScale = a.height_scale || 1.0;

      // Fallen / Stumbled Pose Handling
      if (isFallen) {
        const fallRoll = Math.PI / 2.2;
        dummy.position.set(worldX, 0.18 * hScale, worldZ);
        dummy.rotation.set(0, cached.angle, fallRoll);
        dummy.scale.set(1.0, hScale, 1.0);
        dummy.updateMatrix();
        torsoMeshRef.current.setMatrixAt(i, dummy.matrix);

        dummy.position.set(worldX + Math.cos(cached.angle) * 0.3, 0.25 * hScale, worldZ + Math.sin(cached.angle) * 0.3);
        dummy.rotation.set(0, cached.angle, fallRoll);
        dummy.scale.set(1.0, hScale, 1.0);
        dummy.updateMatrix();
        headMeshRef.current.setMatrixAt(i, dummy.matrix);

        dummy.position.set(worldX - Math.cos(cached.angle) * 0.3, 0.12 * hScale, worldZ - Math.sin(cached.angle) * 0.3);
        dummy.rotation.set(0.4, cached.angle, fallRoll);
        dummy.scale.set(1.0, hScale, 1.0);
        dummy.updateMatrix();
        leftLegMeshRef.current.setMatrixAt(i, dummy.matrix);
        rightLegMeshRef.current.setMatrixAt(i, dummy.matrix);

        dummy.position.set(worldX, 0.15 * hScale, worldZ);
        dummy.rotation.set(0, cached.angle, 0);
        dummy.scale.set(1.0, hScale, 1.0);
        dummy.updateMatrix();
        leftArmMeshRef.current.setMatrixAt(i, dummy.matrix);
        rightArmMeshRef.current.setMatrixAt(i, dummy.matrix);

        torsoMeshRef.current.setColorAt(i, new THREE.Color('#991b1b'));
        const skin = SKIN_TONES[i % SKIN_TONES.length];
        headMeshRef.current.setColorAt(i, skin);
        leftArmMeshRef.current.setColorAt(i, skin);
        rightArmMeshRef.current.setColorAt(i, skin);
        continue;
      }

      // Dynamic Stride Cadence & Gait Kinematics (Natural human locomotion)
      const cadence = isRunning
        ? 7.8
        : (isMoving ? Math.max(3.2, actualSpeed * 4.2) : 0);

      if (isMoving) {
        cached.stridePhase += dt * cadence;
      }

      const stride = isMoving ? Math.sin(cached.stridePhase) : 0;
      const strideCos = isMoving ? Math.cos(cached.stridePhase) : 1;
      const animAmp = isRunning ? 0.62 : 0.36;

      // Realistic vertical bounce & lateral sway
      const bodyBounce = isMoving
        ? Math.abs(stride) * (isRunning ? 0.05 : 0.02)
        : Math.sin(time * 1.8 + i * 0.8) * 0.008; // Natural breathing when idle

      const lateralSway = isMoving ? strideCos * (isRunning ? 0.04 : 0.02) : 0;
      const forwardLean = isRunning
        ? 0.22
        : (hasSmoke ? 0.30 : Math.min(0.08, actualSpeed * 0.06));

      const idleGlance = !isMoving
        ? Math.sin(time * 0.45 + i * 1.5) * 0.18
        : 0;

      // 1. Torso
      dummy.position.set(worldX, (0.96 + bodyBounce) * hScale, worldZ);
      dummy.rotation.set(forwardLean, cached.angle + lateralSway, lateralSway * 0.5);
      dummy.scale.set(1.0, hScale, 1.0);
      dummy.updateMatrix();
      torsoMeshRef.current.setMatrixAt(i, dummy.matrix);

      // 2. Head (Subtle looking around)
      const headForwardOffset = forwardLean * 0.32;
      dummy.position.set(
        worldX + Math.sin(cached.angle) * headForwardOffset,
        (1.38 + bodyBounce) * hScale,
        worldZ + Math.cos(cached.angle) * headForwardOffset
      );
      dummy.rotation.set(forwardLean * 0.5, cached.angle + idleGlance, 0);
      dummy.scale.set(1.0, hScale, 1.0);
      dummy.updateMatrix();
      headMeshRef.current.setMatrixAt(i, dummy.matrix);

      // 3. Left Leg (Pendulum swing with foot lift)
      const legSpread = 0.12;
      const cosA = Math.cos(cached.angle);
      const sinA = Math.sin(cached.angle);
      const leftFootLift = isMoving ? Math.max(0, stride) * (isRunning ? 0.14 : 0.07) : 0;

      dummy.position.set(
        worldX - cosA * legSpread,
        (0.40 + bodyBounce * 0.5 + leftFootLift) * hScale,
        worldZ + sinA * legSpread
      );
      dummy.rotation.set(stride * animAmp, cached.angle, 0);
      dummy.scale.set(1.0, hScale, 1.0);
      dummy.updateMatrix();
      leftLegMeshRef.current.setMatrixAt(i, dummy.matrix);

      // 4. Right Leg (Opposite phase)
      const rightFootLift = isMoving ? Math.max(0, -stride) * (isRunning ? 0.14 : 0.07) : 0;
      dummy.position.set(
        worldX + cosA * legSpread,
        (0.40 + bodyBounce * 0.5 + rightFootLift) * hScale,
        worldZ - sinA * legSpread
      );
      dummy.rotation.set(-stride * animAmp, cached.angle, 0);
      dummy.scale.set(1.0, hScale, 1.0);
      dummy.updateMatrix();
      rightLegMeshRef.current.setMatrixAt(i, dummy.matrix);

      // 5. Left Arm (Swings in counter-phase with Left Leg)
      const armSpread = 0.23;
      dummy.position.set(
        worldX - cosA * armSpread,
        (0.96 + bodyBounce) * hScale,
        worldZ + sinA * armSpread
      );
      dummy.rotation.set(-stride * animAmp * 1.15 + forwardLean, cached.angle, -0.06);
      dummy.scale.set(1.0, hScale, 1.0);
      dummy.updateMatrix();
      leftArmMeshRef.current.setMatrixAt(i, dummy.matrix);

      // 6. Right Arm (Swings in counter-phase with Right Leg)
      dummy.position.set(
        worldX + cosA * armSpread,
        (0.96 + bodyBounce) * hScale,
        worldZ - sinA * armSpread
      );
      dummy.rotation.set(stride * animAmp * 1.15 + forwardLean, cached.angle, 0.06);
      dummy.scale.set(1.0, hScale, 1.0);
      dummy.updateMatrix();
      rightArmMeshRef.current.setMatrixAt(i, dummy.matrix);

      // State-based Color Coding
      if (a.crush_pressure && a.crush_pressure > 2500.0) {
        torsoMeshRef.current.setColorAt(i, new THREE.Color('#b91c1c')); // Severe crush dark red
      } else if (isRunning) {
        torsoMeshRef.current.setColorAt(i, new THREE.Color('#dc2626')); // Panic Red
      } else if (a.state === 'QUEUING') {
        torsoMeshRef.current.setColorAt(i, new THREE.Color('#f59e0b')); // Queue Amber
      } else if (a.state === 'WAITING') {
        torsoMeshRef.current.setColorAt(i, new THREE.Color('#3b82f6')); // Seated Blue
      } else {
        const color = CLOTHING_COLORS[a.color_index % CLOTHING_COLORS.length];
        torsoMeshRef.current.setColorAt(i, color);
      }

      const skin = SKIN_TONES[i % SKIN_TONES.length];
      headMeshRef.current.setColorAt(i, skin);
      leftArmMeshRef.current.setColorAt(i, skin);
      rightArmMeshRef.current.setColorAt(i, skin);
    }

    if (isEmergency && onEvacuationProgress && count > 0) {
      lastProgressReport.current += dt;
      if (lastProgressReport.current > 0.3) {
        lastProgressReport.current = 0;
        let safeCount = 0;
        kinematicCache.current.forEach((val) => {
          if (val.isSafe) safeCount++;
        });
        const total = count;
        const exited = Math.min(total, safeCount);
        const remaining = Math.max(0, total - exited);
        const pct = Math.round((exited / total) * 100);
        onEvacuationProgress({ exited, total, remaining, pct });
      }
    }

    torsoMeshRef.current.instanceMatrix.needsUpdate = true;
    headMeshRef.current.instanceMatrix.needsUpdate = true;
    leftLegMeshRef.current.instanceMatrix.needsUpdate = true;
    rightLegMeshRef.current.instanceMatrix.needsUpdate = true;
    leftArmMeshRef.current.instanceMatrix.needsUpdate = true;
    rightArmMeshRef.current.instanceMatrix.needsUpdate = true;

    if (torsoMeshRef.current.instanceColor) torsoMeshRef.current.instanceColor.needsUpdate = true;
    if (headMeshRef.current.instanceColor) headMeshRef.current.instanceColor.needsUpdate = true;
    if (leftArmMeshRef.current.instanceColor) leftArmMeshRef.current.instanceColor.needsUpdate = true;
    if (rightArmMeshRef.current.instanceColor) rightArmMeshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      {/* Upper Body / Torso */}
      <instancedMesh ref={torsoMeshRef} args={[torsoGeo, torsoMat, maxInstances]} />
      {/* Head */}
      <instancedMesh ref={headMeshRef} args={[headGeo, headMat, maxInstances]} />
      {/* Left & Right Legs with Pendulum Walk Cycles */}
      <instancedMesh ref={leftLegMeshRef} args={[legGeo, pantsMat, maxInstances]} />
      <instancedMesh ref={rightLegMeshRef} args={[legGeo, pantsMat, maxInstances]} />
      {/* Left & Right Arms with Natural Arm Swings */}
      <instancedMesh ref={leftArmMeshRef} args={[armGeo, armsMat, maxInstances]} />
      <instancedMesh ref={rightArmMeshRef} args={[armGeo, armsMat, maxInstances]} />
    </group>
  );
};
