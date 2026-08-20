import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { FireState } from '../../types';

interface DynamicFireAndSmokeProps {
  fireState?: FireState;
  dangerZones: Array<{ x: number; y: number; radius: number; max_temperature?: number; max_smoke?: number }>;
  venueWidth: number;
  venueLength: number;
}

export const DynamicFireAndSmoke: React.FC<DynamicFireAndSmokeProps> = ({
  fireState,
  dangerZones,
  venueWidth,
  venueLength,
}) => {
  const offsetX = -venueWidth / 2;
  const offsetZ = -venueLength / 2;

  const flameMeshRef = useRef<THREE.InstancedMesh>(null);
  const smokeMeshRef = useRef<THREE.InstancedMesh>(null);
  const emberMeshRef = useRef<THREE.InstancedMesh>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);

  const maxFlameParticles = 300;
  const maxSmokeParticles = 400;
  const maxEmberParticles = 200;

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Geometries & Materials
  const flameGeo = useMemo(() => new THREE.ConeGeometry(0.5, 1.8, 6), []);
  const smokeGeo = useMemo(() => new THREE.DodecahedronGeometry(0.8, 1), []);
  const emberGeo = useMemo(() => new THREE.TetrahedronGeometry(0.12, 0), []);

  const flameMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ff4500',
    emissive: '#ff7700',
    emissiveIntensity: 3.5,
    transparent: true,
    opacity: 0.88,
    roughness: 0.2,
  }), []);

  const smokeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1e293b',
    transparent: true,
    opacity: 0.45,
    roughness: 1.0,
  }), []);

  const emberMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ffdd44',
  }), []);

  // Particle state caches
  const embers = useMemo(() => {
    return Array.from({ length: maxEmberParticles }, () => ({
      x: 0,
      y: -100,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 1.0,
      scale: 1.0,
    }));
  }, []);

  const smokePuffs = useMemo(() => {
    return Array.from({ length: maxSmokeParticles }, () => ({
      x: 0,
      y: -100,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 2.5,
      scale: 1.0,
      rotSpeed: 0.5,
    }));
  }, []);

  const activeHotspots = fireState?.hotspots ?? [];
  const hasFire = (fireState?.is_active || dangerZones.length > 0);
  const wind = fireState?.wind_vector ?? [1.5, 0.8];

  useFrame((state, delta) => {
    if (!flameMeshRef.current || !smokeMeshRef.current || !emberMeshRef.current) return;
    const time = state.clock.getElapsedTime();

    if (!hasFire && activeHotspots.length === 0 && dangerZones.length === 0) {
      flameMeshRef.current.count = 0;
      smokeMeshRef.current.count = 0;
      emberMeshRef.current.count = 0;
      if (pointLightRef.current) pointLightRef.current.intensity = 0;
      return;
    }

    // Light flickering effect
    if (pointLightRef.current) {
      const flicker = Math.sin(time * 18.0) * 0.3 + Math.cos(time * 31.0) * 0.2 + 0.8;
      pointLightRef.current.intensity = 4.5 * flicker;
      const primaryOrigin = activeHotspots[0] || (dangerZones[0] ? { x: dangerZones[0].x, y: dangerZones[0].y } : { x: venueWidth / 2, y: venueLength / 2 });
      pointLightRef.current.position.set(primaryOrigin.x + offsetX, 3.5, primaryOrigin.y + offsetZ);
    }

    // 1. Render Flame Columns
    let flameIdx = 0;
    const sources = activeHotspots.length > 0
      ? activeHotspots
      : dangerZones.map(dz => ({ x: dz.x, y: dz.y, intensity: 1.0, smoke: 0.8, temp: 650 }));

    for (const src of sources) {
      if (flameIdx >= maxFlameParticles) break;
      const wx = src.x + offsetX;
      const wz = src.y + offsetZ;
      const intensity = src.intensity || 1.0;

      // Cluster of 4 flame cones per hotspot
      for (let k = 0; k < 4; k++) {
        if (flameIdx >= maxFlameParticles) break;
        const angle = (k * Math.PI) / 2 + (time * 2.0);
        const radiusOffset = 0.6 * (k > 0 ? 1 : 0);
        const fx = wx + Math.cos(angle) * radiusOffset;
        const fz = wz + Math.sin(angle) * radiusOffset;
        const flameHeight = (1.8 + Math.sin(time * 12.0 + k * 1.5) * 0.4) * intensity;

        dummy.position.set(fx, flameHeight * 0.5, fz);
        dummy.rotation.set(
          Math.sin(time * 8.0 + k) * 0.15 + (wind[1] * 0.05),
          time * 3.0 + k,
          Math.cos(time * 8.0 + k) * 0.15 + (wind[0] * 0.05)
        );
        dummy.scale.set(1.0 * intensity, flameHeight, 1.0 * intensity);
        dummy.updateMatrix();
        flameMeshRef.current.setMatrixAt(flameIdx, dummy.matrix);
        flameIdx++;
      }
    }
    flameMeshRef.current.count = flameIdx;
    flameMeshRef.current.instanceMatrix.needsUpdate = true;

    // 2. Animate Rising Embers
    let emberIdx = 0;
    for (let i = 0; i < maxEmberParticles; i++) {
      const e = embers[i];
      e.life -= delta;

      if (e.life <= 0 && sources.length > 0) {
        const randSrc = sources[Math.floor(Math.random() * sources.length)];
        e.x = randSrc.x + offsetX + (Math.random() - 0.5) * 2.0;
        e.y = 0.5 + Math.random() * 0.5;
        e.z = randSrc.y + offsetZ + (Math.random() - 0.5) * 2.0;
        e.vx = wind[0] * 0.8 + (Math.random() - 0.5) * 1.2;
        e.vy = 2.5 + Math.random() * 3.0;
        e.vz = wind[1] * 0.8 + (Math.random() - 0.5) * 1.2;
        e.life = 0.8 + Math.random() * 1.2;
        e.maxLife = e.life;
        e.scale = 0.6 + Math.random() * 0.6;
      }

      if (e.life > 0) {
        e.x += e.vx * delta;
        e.y += e.vy * delta;
        e.z += e.vz * delta;
        const progress = 1.0 - (e.life / e.maxLife);
        const currentScale = e.scale * (1.0 - progress * 0.7);

        dummy.position.set(e.x, e.y, e.z);
        dummy.rotation.set(time * 5.0, time * 4.0, 0);
        dummy.scale.set(currentScale, currentScale, currentScale);
        dummy.updateMatrix();
        emberMeshRef.current.setMatrixAt(emberIdx, dummy.matrix);
        emberIdx++;
      }
    }
    emberMeshRef.current.count = emberIdx;
    emberMeshRef.current.instanceMatrix.needsUpdate = true;

    // 3. Animate Billowing Toxic Smoke Plumes
    let smokeIdx = 0;
    for (let i = 0; i < maxSmokeParticles; i++) {
      const s = smokePuffs[i];
      s.life -= delta;

      if (s.life <= 0 && sources.length > 0) {
        const randSrc = sources[Math.floor(Math.random() * sources.length)];
        s.x = randSrc.x + offsetX + (Math.random() - 0.5) * 1.5;
        s.y = 1.2 + Math.random() * 0.8;
        s.z = randSrc.y + offsetZ + (Math.random() - 0.5) * 1.5;
        s.vx = wind[0] * 1.4 + (Math.random() - 0.5) * 0.8;
        s.vy = 1.8 + Math.random() * 1.5;
        s.vz = wind[1] * 1.4 + (Math.random() - 0.5) * 0.8;
        s.life = 1.5 + Math.random() * 1.8;
        s.maxLife = s.life;
        s.scale = 0.8 + Math.random() * 0.6;
        s.rotSpeed = (Math.random() - 0.5) * 1.5;
      }

      if (s.life > 0) {
        s.x += s.vx * delta;
        s.y += s.vy * delta;
        s.z += s.vz * delta;
        const progress = 1.0 - (s.life / s.maxLife);
        // Smoke expands significantly as it ascends
        const currentScale = s.scale * (1.0 + progress * 3.8);

        dummy.position.set(s.x, s.y, s.z);
        dummy.rotation.set(time * s.rotSpeed, time * s.rotSpeed * 0.8, 0);
        dummy.scale.set(currentScale, currentScale * 1.2, currentScale);
        dummy.updateMatrix();
        smokeMeshRef.current.setMatrixAt(smokeIdx, dummy.matrix);
        smokeMeshRef.current.setColorAt(
          smokeIdx,
          new THREE.Color(
            THREE.MathUtils.lerp(0.3, 0.08, progress),
            THREE.MathUtils.lerp(0.15, 0.08, progress),
            THREE.MathUtils.lerp(0.05, 0.12, progress)
          )
        );
        smokeIdx++;
      }
    }
    smokeMeshRef.current.count = smokeIdx;
    smokeMeshRef.current.instanceMatrix.needsUpdate = true;
    if (smokeMeshRef.current.instanceColor) smokeMeshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      {/* Dynamic Flickering Fire Point Light */}
      <pointLight
        ref={pointLightRef}
        color="#ff6600"
        intensity={0}
        distance={45}
        decay={2}
        castShadow
      />

      {/* Flame Cones */}
      <instancedMesh ref={flameMeshRef} args={[flameGeo, flameMat, maxFlameParticles]} />

      {/* Billowing Smoke Puffs */}
      <instancedMesh ref={smokeMeshRef} args={[smokeGeo, smokeMat, maxSmokeParticles]} />

      {/* Rising Embers */}
      <instancedMesh ref={emberMeshRef} args={[emberGeo, emberMat, maxEmberParticles]} />

      {/* Burned Ground Scorch Decals */}
      {dangerZones.map((dz, idx) => (
        <mesh
          key={`scorch_${idx}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[dz.x + offsetX, 0.02, dz.y + offsetZ]}
        >
          <circleGeometry args={[dz.radius * 0.85, 24]} />
          <meshBasicMaterial color="#1c1917" transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
};
