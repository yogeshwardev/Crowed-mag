import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { DroneData } from '../../types';

interface DroneFleetProps {
  venueWidth: number;
  venueLength: number;
  isBlackout?: boolean;
  isEmergency?: boolean;
  dangerZones?: Array<{ x: number; y: number; radius: number }>;
  onDroneTelemetryUpdate?: (drones: DroneData[]) => void;
  drone1PosRef?: React.MutableRefObject<THREE.Vector3>;
  drone2PosRef?: React.MutableRefObject<THREE.Vector3>;
}

export const DroneFleet: React.FC<DroneFleetProps> = ({
  venueWidth,
  venueLength,
  isBlackout = false,
  isEmergency = false,
  dangerZones = [],
  onDroneTelemetryUpdate,
  drone1PosRef,
  drone2PosRef,
}) => {
  // Drone 1 & Drone 2 visual node refs
  const drone1GroupRef = useRef<THREE.Group>(null);
  const drone2GroupRef = useRef<THREE.Group>(null);

  const drone1PropRefs = useRef<THREE.Mesh[]>([]);
  const drone2PropRefs = useRef<THREE.Mesh[]>([]);

  const drone1SpotlightRef = useRef<THREE.SpotLight>(null);
  const drone2SpotlightRef = useRef<THREE.SpotLight>(null);

  const drone1TargetRef = useRef<THREE.Object3D>(new THREE.Object3D());
  const drone2TargetRef = useRef<THREE.Object3D>(new THREE.Object3D());

  const drone1ScanRingRef = useRef<THREE.Mesh>(null);
  const drone2ScanRingRef = useRef<THREE.Mesh>(null);

  // Flight kinematic states
  const flightState = useRef({
    drone1: {
      t: 0,
      x: 0,
      y: 26,
      z: 0,
      vx: 0,
      vz: 0,
      yaw: 0,
      pitch: 0,
      roll: 0,
      battery: 96,
      searchlight: true,
    },
    drone2: {
      t: Math.PI,
      x: 0,
      y: 28,
      z: 0,
      vx: 0,
      vz: 0,
      yaw: 0,
      pitch: 0,
      roll: 0,
      battery: 92,
      searchlight: true,
    }
  });

  // Reusable Materials
  const materials = useMemo(() => ({
    body: new THREE.MeshStandardMaterial({
      color: '#181d28',
      roughness: 0.25,
      metalness: 0.85,
    }),
    carbonArms: new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.4,
      metalness: 0.9,
    }),
    propellers: new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.75,
    }),
    gimbal: new THREE.MeshStandardMaterial({
      color: '#090d16',
      roughness: 0.2,
      metalness: 0.95,
    }),
    lens: new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 2.5,
      roughness: 0.05,
    }),
    strobeWhite: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    navRed: new THREE.MeshBasicMaterial({ color: '#ef4444' }),
    navGreen: new THREE.MeshBasicMaterial({ color: '#10b981' }),
    scanRing: new THREE.MeshBasicMaterial({
      color: isBlackout ? '#22d3ee' : '#38bdf8',
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    }),
    lightCone: new THREE.MeshBasicMaterial({
      color: '#f8fafc',
      transparent: true,
      opacity: isBlackout ? 0.25 : 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  }), [isBlackout]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const dt = Math.min(0.08, delta);

    // Hazard epicenter or venue center
    const hazard = dangerZones[0];
    const centerX = hazard ? (hazard.x - venueWidth / 2) : 0;
    const centerZ = hazard ? (hazard.y - venueLength / 2) : 0;

    // --- DRONE 1 KINEMATICS (Figure-8 Tactical Patrol over pitch / hazard) ---
    const d1 = flightState.current.drone1;
    d1.t += dt * (isEmergency ? 0.42 : 0.28);
    d1.battery = Math.max(15, 96 - (time * 0.015));

    const radiusX1 = (venueWidth * 0.32);
    const radiusZ1 = (venueLength * 0.35);

    const targetX1 = centerX + Math.sin(d1.t) * radiusX1;
    const targetZ1 = centerZ + Math.sin(d1.t * 2) * 0.5 * radiusZ1;
    const targetY1 = isBlackout ? 22 + Math.sin(d1.t * 1.5) * 1.5 : 26 + Math.sin(d1.t * 1.2) * 2.0;

    // Smooth position lerping
    const prevX1 = d1.x;
    const prevZ1 = d1.z;

    d1.x = THREE.MathUtils.lerp(d1.x, targetX1, Math.min(1, dt * 2.5));
    d1.y = THREE.MathUtils.lerp(d1.y, targetY1, Math.min(1, dt * 2.0));
    d1.z = THREE.MathUtils.lerp(d1.z, targetZ1, Math.min(1, dt * 2.5));

    d1.vx = (d1.x - prevX1) / (dt + 1e-4);
    d1.vz = (d1.z - prevZ1) / (dt + 1e-4);

    // Calculate heading and banking roll/pitch
    const speed1 = Math.hypot(d1.vx, d1.vz);
    if (speed1 > 0.5) {
      const targetYaw = Math.atan2(d1.vx, d1.vz);
      let diff = targetYaw - d1.yaw;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      d1.yaw += diff * Math.min(1, dt * 4.0);
    }

    const bankRoll1 = -Math.sin(d1.t) * (speed1 * 0.04);
    const pitchLean1 = Math.min(0.25, speed1 * 0.025);
    d1.roll = THREE.MathUtils.lerp(d1.roll, bankRoll1, Math.min(1, dt * 5.0));
    d1.pitch = THREE.MathUtils.lerp(d1.pitch, pitchLean1, Math.min(1, dt * 5.0));

    if (drone1GroupRef.current) {
      drone1GroupRef.current.position.set(d1.x, d1.y, d1.z);
      drone1GroupRef.current.rotation.set(d1.pitch, d1.yaw, d1.roll);
    }

    if (drone1PosRef) {
      drone1PosRef.current.set(d1.x, d1.y, d1.z);
    }

    // --- DRONE 2 KINEMATICS (Perimeter / Gate Egress Surveillance) ---
    const d2 = flightState.current.drone2;
    d2.t += dt * (isEmergency ? 0.35 : 0.22);
    d2.battery = Math.max(12, 92 - (time * 0.012));

    const radiusX2 = (venueWidth * 0.42);
    const radiusZ2 = (venueLength * 0.40);

    const targetX2 = Math.cos(d2.t) * radiusX2;
    const targetZ2 = Math.sin(d2.t) * radiusZ2;
    const targetY2 = isBlackout ? 24 + Math.cos(d2.t * 1.8) * 1.8 : 28 + Math.cos(d2.t * 1.4) * 2.2;

    const prevX2 = d2.x;
    const prevZ2 = d2.z;

    d2.x = THREE.MathUtils.lerp(d2.x, targetX2, Math.min(1, dt * 2.2));
    d2.y = THREE.MathUtils.lerp(d2.y, targetY2, Math.min(1, dt * 1.8));
    d2.z = THREE.MathUtils.lerp(d2.z, targetZ2, Math.min(1, dt * 2.2));

    d2.vx = (d2.x - prevX2) / (dt + 1e-4);
    d2.vz = (d2.z - prevZ2) / (dt + 1e-4);

    const speed2 = Math.hypot(d2.vx, d2.vz);
    if (speed2 > 0.5) {
      const targetYaw2 = Math.atan2(d2.vx, d2.vz);
      let diff2 = targetYaw2 - d2.yaw;
      while (diff2 < -Math.PI) diff2 += Math.PI * 2;
      while (diff2 > Math.PI) diff2 -= Math.PI * 2;
      d2.yaw += diff2 * Math.min(1, dt * 4.0);
    }

    const bankRoll2 = -Math.sin(d2.t) * (speed2 * 0.04);
    const pitchLean2 = Math.min(0.25, speed2 * 0.025);
    d2.roll = THREE.MathUtils.lerp(d2.roll, bankRoll2, Math.min(1, dt * 5.0));
    d2.pitch = THREE.MathUtils.lerp(d2.pitch, pitchLean2, Math.min(1, dt * 5.0));

    if (drone2GroupRef.current) {
      drone2GroupRef.current.position.set(d2.x, d2.y, d2.z);
      drone2GroupRef.current.rotation.set(d2.pitch, d2.yaw, d2.roll);
    }

    if (drone2PosRef) {
      drone2PosRef.current.set(d2.x, d2.y, d2.z);
    }

    // Propeller spinning at high RPM
    const propSpin = time * 75.0;
    drone1PropRefs.current.forEach((p, idx) => {
      if (p) p.rotation.y = (idx % 2 === 0 ? propSpin : -propSpin);
    });
    drone2PropRefs.current.forEach((p, idx) => {
      if (p) p.rotation.y = (idx % 2 === 0 ? propSpin : -propSpin);
    });

    // Spotlight Ground Targets
    if (drone1TargetRef.current && drone1SpotlightRef.current) {
      drone1TargetRef.current.position.set(d1.x + Math.sin(d1.yaw) * 4, 0, d1.z + Math.cos(d1.yaw) * 4);
      drone1SpotlightRef.current.target = drone1TargetRef.current;
    }
    if (drone2TargetRef.current && drone2SpotlightRef.current) {
      drone2TargetRef.current.position.set(d2.x + Math.sin(d2.yaw) * 4, 0, d2.z + Math.cos(d2.yaw) * 4);
      drone2SpotlightRef.current.target = drone2TargetRef.current;
    }

    // Ground Scanning HUD Reticles
    if (drone1ScanRingRef.current) {
      drone1ScanRingRef.current.position.set(d1.x, 0.06, d1.z);
      drone1ScanRingRef.current.rotation.z = time * 1.2;
    }
    if (drone2ScanRingRef.current) {
      drone2ScanRingRef.current.position.set(d2.x, 0.06, d2.z);
      drone2ScanRingRef.current.rotation.z = -time * 1.2;
    }

    // Periodic telemetry update
    if (onDroneTelemetryUpdate && Math.floor(time * 4) % 4 === 0) {
      onDroneTelemetryUpdate([
        {
          id: 'drone_01',
          name: 'Falcon-1 Alpha (Tactical FLIR)',
          callsign: 'FALCON-1',
          x: Number((d1.x + venueWidth / 2).toFixed(1)),
          y: Number((d1.z + venueLength / 2).toFixed(1)),
          altitude: Number(d1.y.toFixed(1)),
          target_x: Number((targetX1 + venueWidth / 2).toFixed(1)),
          target_y: Number((targetZ1 + venueLength / 2).toFixed(1)),
          speed: Number((speed1 * 3.6).toFixed(1)),
          heading: Math.round(((d1.yaw * 180 / Math.PI) + 360) % 360),
          battery_pct: Math.round(d1.battery),
          status: isBlackout ? 'SEARCHLIGHT_ACTIVE' : (isEmergency ? 'TRACKING_PANIC' : 'PATROLLING'),
          mode: isBlackout ? 'BLACKOUT_SURVEILLANCE' : 'AUTONOMOUS',
          flir_mode: isBlackout ? 'THERMAL_WHITE_HOT' : 'OPTICAL',
          searchlight_on: true,
          detected_anomalies: isEmergency ? ['High-velocity crowd dispersion', 'Elevated panic cluster'] : []
        },
        {
          id: 'drone_02',
          name: 'Falcon-2 Bravo (Perimeter NVG)',
          callsign: 'FALCON-2',
          x: Number((d2.x + venueWidth / 2).toFixed(1)),
          y: Number((d2.z + venueLength / 2).toFixed(1)),
          altitude: Number(d2.y.toFixed(1)),
          target_x: Number((targetX2 + venueWidth / 2).toFixed(1)),
          target_y: Number((targetZ2 + venueLength / 2).toFixed(1)),
          speed: Number((speed2 * 3.6).toFixed(1)),
          heading: Math.round(((d2.yaw * 180 / Math.PI) + 360) % 360),
          battery_pct: Math.round(d2.battery),
          status: isBlackout ? 'SEARCHLIGHT_ACTIVE' : 'PATROLLING',
          mode: isBlackout ? 'BLACKOUT_SURVEILLANCE' : 'AUTONOMOUS',
          flir_mode: isBlackout ? 'NIGHT_VISION_NVG' : 'OPTICAL',
          searchlight_on: true,
          detected_anomalies: []
        }
      ]);
    }
  });

  // Quadcopter 3D Model Builder
  const renderQuadcopter = (isDrone1: boolean) => {
    const armLen = 1.35;
    const propRad = 0.65;
    const propRefs = isDrone1 ? drone1PropRefs : drone2PropRefs;

    return (
      <group>
        {/* Central Aerodynamic Fuselage */}
        <mesh material={materials.body} castShadow receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[0.9, 0.28, 1.2]} />
        </mesh>

        {/* Top Electronics Dome */}
        <mesh material={materials.body} position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.25, 0.4, 0.2, 16]} />
        </mesh>

        {/* Camera Gimbal Turret (Under fuselage) */}
        <group position={[0, -0.22, 0.3]}>
          <mesh material={materials.gimbal}>
            <sphereGeometry args={[0.22, 16, 16]} />
          </mesh>
          {/* Dual Optical / FLIR Lens */}
          <mesh material={materials.lens} position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.12, 16]} />
          </mesh>
        </group>

        {/* 4 Carbon Fiber Rotor Arms at 45 degree angles */}
        {[
          { x: 1, z: 1, angle: Math.PI / 4, isRight: true, isFront: true },
          { x: -1, z: 1, angle: -Math.PI / 4, isRight: false, isFront: true },
          { x: 1, z: -1, angle: 3 * Math.PI / 4, isRight: true, isFront: false },
          { x: -1, z: -1, angle: -3 * Math.PI / 4, isRight: false, isFront: false },
        ].map((arm, i) => {
          const armX = arm.x * (armLen * 0.7);
          const armZ = arm.z * (armLen * 0.7);
          return (
            <group key={i}>
              {/* Tubular Arm */}
              <mesh
                material={materials.carbonArms}
                position={[armX / 2, 0.02, armZ / 2]}
                rotation={[0, -arm.angle, 0]}
              >
                <cylinderGeometry args={[0.045, 0.045, armLen, 8]} />
              </mesh>

              {/* Motor Pod */}
              <mesh material={materials.body} position={[armX, 0.05, armZ]}>
                <cylinderGeometry args={[0.12, 0.12, 0.18, 12]} />
              </mesh>

              {/* Navigation LEDs */}
              <mesh
                material={arm.isFront ? (arm.isRight ? materials.navGreen : materials.navRed) : materials.strobeWhite}
                position={[armX, -0.06, armZ]}
              >
                <sphereGeometry args={[0.04, 8, 8]} />
              </mesh>

              {/* Spinning Propeller Blades */}
              <mesh
                ref={(el) => { if (el) propRefs.current[i] = el; }}
                material={materials.propellers}
                position={[armX, 0.16, armZ]}
              >
                <boxGeometry args={[propRad * 2, 0.015, 0.1]} />
              </mesh>
            </group>
          );
        })}

        {/* Landing Skids */}
        <group position={[0, -0.28, 0]}>
          <mesh material={materials.carbonArms} position={[0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.03, 0.08, 8]} />
          </mesh>
          <mesh material={materials.carbonArms} position={[0.45, -0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 1.1, 8]} />
          </mesh>

          <mesh material={materials.carbonArms} position={[-0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.03, 0.08, 8]} />
          </mesh>
          <mesh material={materials.carbonArms} position={[-0.45, -0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 1.1, 8]} />
          </mesh>
        </group>

        {/* High-Intensity Downward Searchlight Spotlight */}
        <spotLight
          ref={isDrone1 ? drone1SpotlightRef : drone2SpotlightRef}
          position={[0, -0.3, 0]}
          color="#f8fafc"
          intensity={isBlackout ? 18.0 : 8.0}
          angle={Math.PI / 6.5}
          penumbra={0.45}
          distance={85}
          castShadow
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
        />

        {/* Volumetric Glowing Light Cone Mesh */}
        <mesh position={[0, -12, 0]} rotation={[Math.PI, 0, 0]} material={materials.lightCone}>
          <coneGeometry args={[6.5, 24, 24, 1, true]} />
        </mesh>
      </group>
    );
  };

  return (
    <>
      {/* Target Nodes for Searchlight Tracking */}
      <primitive object={drone1TargetRef.current} />
      <primitive object={drone2TargetRef.current} />

      {/* Drone 1: Falcon-1 Alpha */}
      <group ref={drone1GroupRef} position={[0, 26, 0]}>
        {renderQuadcopter(true)}
      </group>

      {/* Drone 2: Falcon-2 Bravo */}
      <group ref={drone2GroupRef} position={[0, 28, 0]}>
        {renderQuadcopter(false)}
      </group>

      {/* Projected Ground Scanning Reticles */}
      <mesh ref={drone1ScanRingRef} rotation={[-Math.PI / 2, 0, 0]} material={materials.scanRing}>
        <ringGeometry args={[5.2, 5.6, 32]} />
      </mesh>
      <mesh ref={drone2ScanRingRef} rotation={[-Math.PI / 2, 0, 0]} material={materials.scanRing}>
        <ringGeometry args={[4.2, 4.6, 32]} />
      </mesh>
    </>
  );
};
