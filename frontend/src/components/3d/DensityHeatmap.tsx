import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';

interface DensityHeatmapProps {
  densityGrid: number[][];
  venueWidth: number;
  venueLength: number;
  opacity?: number;
  visible?: boolean;
}

export const DensityHeatmap: React.FC<DensityHeatmapProps> = ({
  densityGrid,
  venueWidth,
  venueLength,
  opacity = 0.65,
  visible = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  // Initialize offscreen canvas texture
  const { canvas, texture } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    canvasRef.current = c;
    textureRef.current = tex;
    return { canvas: c, texture: tex };
  }, []);

  // Update canvas texture whenever densityGrid changes
  useEffect(() => {
    if (!densityGrid || densityGrid.length === 0 || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rows = densityGrid.length;
    const cols = densityGrid[0].length;
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = densityGrid[r][c]; // persons / m²
        if (val <= 0.05) continue;

        // Color ramp
        let color = 'rgba(16, 185, 129, 0.4)'; // Green < 2.0
        if (val >= 4.5) {
          color = 'rgba(239, 68, 68, 0.95)'; // Intense Red
        } else if (val >= 3.5) {
          color = 'rgba(249, 115, 22, 0.85)'; // Orange
        } else if (val >= 2.0) {
          color = 'rgba(234, 179, 8, 0.7)'; // Yellow
        }

        const gradient = ctx.createRadialGradient(
          c * cellW + cellW / 2,
          r * cellH + cellH / 2,
          cellW * 0.1,
          c * cellW + cellW / 2,
          r * cellH + cellH / 2,
          cellW * 1.2
        );
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(
          (c - 0.5) * cellW,
          (r - 0.5) * cellH,
          cellW * 2,
          cellH * 2
        );
      }
    }

    if (texture) {
      texture.needsUpdate = true;
    }
  }, [densityGrid, canvas, texture]);

  if (!visible) return null;

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.06, 0]}
    >
      <planeGeometry args={[venueWidth, venueLength]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
};
