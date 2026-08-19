import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { CameraViewMode } from '../../types';

interface CameraManagerProps {
  viewMode: CameraViewMode;
  venueWidth: number;
  venueLength: number;
  orbitControlsRef: React.RefObject<OrbitControlsImpl>;
}

export const CameraManager: React.FC<CameraManagerProps> = ({
  viewMode,
  venueWidth,
  venueLength,
  orbitControlsRef,
}) => {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 75, 85));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const isTransitioning = useRef<boolean>(false);
  const previousMode = useRef<CameraViewMode>(viewMode);

  useEffect(() => {
    // Only trigger transition when user explicitly switches camera mode
    isTransitioning.current = true;
    previousMode.current = viewMode;

    switch (viewMode) {
      case 'overview':
        targetPos.current.set(0, Math.max(venueWidth, venueLength) * 0.9, Math.max(venueWidth, venueLength) * 0.85);
        targetLookAt.current.set(0, 2, 0);
        break;

      case 'entrance':
        targetPos.current.set(0, 22, -venueLength * 0.45);
        targetLookAt.current.set(0, 3, -venueLength * 0.28);
        break;

      case 'checkpoint':
        targetPos.current.set(0, 12, -venueLength * 0.32);
        targetLookAt.current.set(0, 2, -venueLength * 0.18);
        break;

      case 'top':
        targetPos.current.set(0, Math.max(venueWidth, venueLength) * 1.35, 0.01);
        targetLookAt.current.set(0, 0, 0);
        break;

      case 'ground':
        targetPos.current.set(0, 3.5, -venueLength * 0.38);
        targetLookAt.current.set(0, 2.5, 15);
        break;

      case 'first_person':
        targetPos.current.set(-venueWidth * 0.15, 2.2, -venueLength * 0.15);
        targetLookAt.current.set(0, 2.0, 5);
        break;

      case 'evacuation':
        targetPos.current.set(0, 45, venueLength * 0.65);
        targetLookAt.current.set(0, 2, 0);
        break;
    }
  }, [viewMode, venueWidth, venueLength]);

  useFrame((_, delta) => {
    // Only interpolate camera when an active transition is in progress
    if (!isTransitioning.current) return;

    const lerpFactor = Math.min(1.0, delta * 3.5);
    camera.position.lerp(targetPos.current, lerpFactor);

    if (orbitControlsRef.current) {
      orbitControlsRef.current.target.lerp(targetLookAt.current, lerpFactor);
      orbitControlsRef.current.update();
    }

    // Stop transitioning once camera is close to target, allowing free user rotation & orbit
    const distPos = camera.position.distanceTo(targetPos.current);
    const distTarget = orbitControlsRef.current ? orbitControlsRef.current.target.distanceTo(targetLookAt.current) : 0;
    if (distPos < 0.25 && distTarget < 0.25) {
      isTransitioning.current = false;
    }
  });

  return null;
};
