import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { AgentData } from '../../types';

interface FlowVisualizerProps {
  agents: AgentData[];
  venueWidth: number;
  venueLength: number;
  isEmergency: boolean;
  visible?: boolean;
}

export const FlowVisualizer: React.FC<FlowVisualizerProps> = ({
  agents,
  venueWidth,
  venueLength,
  isEmergency,
  visible = true,
}) => {
  const linesRef = useRef<THREE.LineSegments>(null);
  const offsetX = -venueWidth / 2;
  const offsetZ = -venueLength / 2;

  const maxVectors = 600;
  const positions = useMemo(() => new Float32Array(maxVectors * 6), [maxVectors]);
  const colors = useMemo(() => new Float32Array(maxVectors * 6), [maxVectors]);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [positions, colors]);

  useFrame(() => {
    if (!linesRef.current || !visible) return;

    const posAttr = linesRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = linesRef.current.geometry.attributes.color as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;
    const colArr = colAttr.array as Float32Array;

    const active = agents.filter(a => a.state !== 'SAFE');
    const count = Math.min(active.length, maxVectors);

    for (let i = 0; i < maxVectors; i++) {
      const pIdx = i * 6;
      if (i < count) {
        const a = active[i];
        const wx = a.x + offsetX;
        const wz = a.y + offsetZ;
        const vLen = Math.hypot(a.vx, a.vy);

        // Vector start
        posArr[pIdx] = wx;
        posArr[pIdx + 1] = 0.4;
        posArr[pIdx + 2] = wz;

        // Vector end (pointing in velocity direction)
        const scale = isEmergency ? 1.8 : 1.2;
        posArr[pIdx + 3] = wx + (a.vx * scale);
        posArr[pIdx + 4] = 0.4;
        posArr[pIdx + 5] = wz + (a.vy * scale);

        // Colors
        if (isEmergency || a.state === 'EVACUATING') {
          // Bright green safe exit stream / red emergency
          colArr[pIdx] = 0.1; colArr[pIdx + 1] = 0.9; colArr[pIdx + 2] = 0.3; // Green head
          colArr[pIdx + 3] = 0.9; colArr[pIdx + 4] = 0.2; colArr[pIdx + 5] = 0.2; // Red tail
        } else {
          // Cyan entry/concourse flow
          colArr[pIdx] = 0.1; colArr[pIdx + 1] = 0.8; colArr[pIdx + 2] = 0.9;
          colArr[pIdx + 3] = 0.2; colArr[pIdx + 4] = 0.4; colArr[pIdx + 5] = 0.8;
        }
      } else {
        // Zero out unused
        for (let j = 0; j < 6; j++) {
          posArr[pIdx + j] = 0;
          colArr[pIdx + j] = 0;
        }
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  });

  if (!visible) return null;

  return (
    <lineSegments ref={linesRef} geometry={geo}>
      <lineBasicMaterial vertexColors transparent opacity={0.75} linewidth={2} />
    </lineSegments>
  );
};
