import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { BlueprintElement, QueueStatus, FireState } from '../../types';
import { DynamicFireAndSmoke } from './DynamicFireAndSmoke';

interface ProceduralVenueProps {
  width: number;
  length: number;
  elements: BlueprintElement[];
  dangerZones: Array<{ x: number; y: number; radius: number; max_temperature?: number; max_smoke?: number }>;
  blockedExits: string[];
  queues?: QueueStatus[];
  fireState?: FireState;
  onToggleBlockExit?: (exitId: string) => void;
}

export const ProceduralVenue: React.FC<ProceduralVenueProps> = ({
  width,
  length,
  elements,
  dangerZones,
  blockedExits,
  fireState,
  onToggleBlockExit,
}) => {
  const offsetX = -width / 2;
  const offsetZ = -length / 2;

  // Floodlight Towers positions
  const floodlightPositions = useMemo(() => [
    { x: -width * 0.42, z: -length * 0.42, rot: Math.PI / 4 },
    { x: width * 0.42, z: -length * 0.42, rot: -Math.PI / 4 },
    { x: -width * 0.42, z: length * 0.42, rot: 3 * Math.PI / 4 },
    { x: width * 0.42, z: length * 0.42, rot: -3 * Math.PI / 4 },
  ], [width, length]);

  // Parking cars decorative positions
  const parkingCars = useMemo(() => [
    { x: -width * 0.38, z: -length * 0.44, col: '#0284c7', rot: 0 },
    { x: -width * 0.34, z: -length * 0.44, col: '#dc2626', rot: 0 },
    { x: -width * 0.30, z: -length * 0.44, col: '#f8fafc', rot: 0 },
    { x: -width * 0.26, z: -length * 0.44, col: '#334155', rot: 0 },
    { x: width * 0.30, z: -length * 0.44, col: '#16a34a', rot: 0 },
    { x: width * 0.34, z: -length * 0.44, col: '#eab308', rot: 0 },
    { x: width * 0.38, z: -length * 0.44, col: '#9333ea', rot: 0 },
  ], [width, length]);

  // Trees and plaza lamp posts
  const plazaTrees = useMemo(() => [
    { x: -28, z: -length * 0.44 },
    { x: -20, z: -length * 0.44 },
    { x: 20, z: -length * 0.44 },
    { x: 28, z: -length * 0.44 },
    { x: -width * 0.46, z: 0 },
    { x: width * 0.46, z: 0 },
  ], [width, length]);

  return (
    <group>
      {/* 1. Surrounding Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <planeGeometry args={[width + 80, length + 80]} />
        <meshStandardMaterial color="#060a12" roughness={0.95} />
      </mesh>

      {/* 2. Venue Plaza Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[width + 10, length + 10]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>

      {/* Grid Floor Lines */}
      <gridHelper
        args={[Math.max(width, length) * 1.3, 40, '#1e293b', '#0b1329']}
        position={[0, 0.01, 0]}
      />

      {/* 3. Floodlight Towers */}
      {floodlightPositions.map((pos, idx) => (
        <group key={`light_${idx}`} position={[pos.x, 0, pos.z]} rotation={[0, pos.rot, 0]}>
          <mesh position={[0, 12, 0]}>
            <cylinderGeometry args={[0.4, 0.8, 24, 6]} />
            <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 24.2, 0]}>
            <boxGeometry args={[4.2, 1.8, 1.2]} />
            <meshStandardMaterial color="#334155" metalness={0.7} />
          </mesh>
          {[-1.4, 0, 1.4].map((lx, lIdx) => (
            <mesh key={lIdx} position={[lx, 24.2, 0.6]}>
              <boxGeometry args={[0.9, 0.9, 0.2]} />
              <meshStandardMaterial color="#ffffff" emissive="#e0f2fe" emissiveIntensity={2.0} />
            </mesh>
          ))}
        </group>
      ))}

      {/* 4. Parking Lot Vehicles */}
      {parkingCars.map((car, cIdx) => (
        <group key={`car_${cIdx}`} position={[car.x, 0, car.z]} rotation={[0, car.rot, 0]}>
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[2.2, 0.7, 4.4]} />
            <meshStandardMaterial color={car.col} roughness={0.3} metalness={0.6} />
          </mesh>
          <mesh position={[0, 1.15, -0.2]}>
            <boxGeometry args={[1.8, 0.65, 2.4]} />
            <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* 5. Plaza Trees */}
      {plazaTrees.map((tree, tIdx) => (
        <group key={`tree_${tIdx}`} position={[tree.x, 0, tree.z]}>
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.2, 0.3, 3, 6]} />
            <meshStandardMaterial color="#451a03" roughness={0.9} />
          </mesh>
          <mesh position={[0, 3.8, 0]}>
            <coneGeometry args={[1.6, 3.8, 6]} />
            <meshStandardMaterial color="#15803d" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* 6. Procedural Blueprint Elements */}
      {elements.map((el) => {
        const posX = el.x + offsetX;
        const posZ = el.y + offsetZ;
        const w = el.width;
        const h = el.height;
        const isBlocked = blockedExits.includes(el.id);

        switch (el.type) {
          case 'wall':
            return (
              <group key={el.id} position={[posX, 0, posZ]}>
                <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
                  <boxGeometry args={[w, 5.0, h]} />
                  <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.2} />
                </mesh>
                <mesh position={[0, 5.1, 0]}>
                  <boxGeometry args={[w + 0.2, 0.3, h + 0.2]} />
                  <meshStandardMaterial color="#0284c7" metalness={0.5} />
                </mesh>
              </group>
            );

          case 'open_space':
            // Stadium Field with lawn stripes, touchlines, and goalposts
            return (
              <group key={el.id} position={[posX, 0, posZ]}>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} receiveShadow>
                  <planeGeometry args={[w, h]} />
                  <meshStandardMaterial color="#15803d" roughness={0.8} />
                </mesh>
                {[-w * 0.35, -w * 0.15, w * 0.05, w * 0.25].map((sx, idx) => (
                  <mesh key={idx} rotation={[-Math.PI / 2, 0, 0]} position={[sx, 0.042, 0]}>
                    <planeGeometry args={[w * 0.1, h * 0.96]} />
                    <meshStandardMaterial color="#166534" roughness={0.8} />
                  </mesh>
                ))}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}>
                  <planeGeometry args={[w * 0.94, h * 0.94]} />
                  <meshBasicMaterial color="#ffffff" wireframe={true} />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.046, 0]}>
                  <ringGeometry args={[3.8, 4.0, 24]} />
                  <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.046, 0]}>
                  <planeGeometry args={[0.2, h * 0.94]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>

                {/* Goalposts */}
                <group position={[-w * 0.46, 0, 0]}>
                  <mesh position={[0, 1.2, -2.5]}>
                    <cylinderGeometry args={[0.08, 0.08, 2.4, 6]} />
                    <meshStandardMaterial color="#ffffff" metalness={0.4} />
                  </mesh>
                  <mesh position={[0, 1.2, 2.5]}>
                    <cylinderGeometry args={[0.08, 0.08, 2.4, 6]} />
                    <meshStandardMaterial color="#ffffff" metalness={0.4} />
                  </mesh>
                  <mesh position={[0, 2.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.08, 0.08, 5.0, 6]} />
                    <meshStandardMaterial color="#ffffff" metalness={0.4} />
                  </mesh>
                </group>

                <group position={[w * 0.46, 0, 0]}>
                  <mesh position={[0, 1.2, -2.5]}>
                    <cylinderGeometry args={[0.08, 0.08, 2.4, 6]} />
                    <meshStandardMaterial color="#ffffff" metalness={0.4} />
                  </mesh>
                  <mesh position={[0, 1.2, 2.5]}>
                    <cylinderGeometry args={[0.08, 0.08, 2.4, 6]} />
                    <meshStandardMaterial color="#ffffff" metalness={0.4} />
                  </mesh>
                  <mesh position={[0, 2.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.08, 0.08, 5.0, 6]} />
                    <meshStandardMaterial color="#ffffff" metalness={0.4} />
                  </mesh>
                </group>

                {/* LED Ribbon */}
                <mesh position={[0, 0.4, -h * 0.48]}>
                  <boxGeometry args={[w * 0.92, 0.8, 0.2]} />
                  <meshStandardMaterial color="#0284c7" emissive="#0ea5e9" emissiveIntensity={0.6} />
                </mesh>
                <mesh position={[0, 0.4, h * 0.48]}>
                  <boxGeometry args={[w * 0.92, 0.8, 0.2]} />
                  <meshStandardMaterial color="#0284c7" emissive="#0ea5e9" emissiveIntensity={0.6} />
                </mesh>
              </group>
            );

          case 'seating':
            // Tiered Grandstands
            return (
              <group key={el.id} position={[posX, 0, posZ]}>
                {[0, 1, 2, 3].map((tier) => (
                  <group key={tier} position={[0, (tier + 1) * 1.3, (tier - 1.5) * (h / 4)]}>
                    <mesh castShadow receiveShadow>
                      <boxGeometry args={[w, 1.3, h / 4]} />
                      <meshStandardMaterial color="#1e293b" roughness={0.7} />
                    </mesh>
                    <mesh position={[0, 0.75, 0]}>
                      <boxGeometry args={[w * 0.95, 0.35, (h / 4) * 0.65]} />
                      <meshStandardMaterial
                        color={tier === 0 ? '#dc2626' : tier === 1 ? '#0284c7' : tier === 2 ? '#2563eb' : '#1e40af'}
                        roughness={0.4}
                      />
                    </mesh>
                  </group>
                ))}
                <mesh position={[0, 7.8, -h * 0.2]} rotation={[0.08, 0, 0]}>
                  <boxGeometry args={[w * 1.02, 0.3, h * 1.1]} />
                  <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.3} />
                </mesh>
              </group>
            );

          case 'stage':
            return (
              <group key={el.id} position={[posX, 0, posZ]}>
                <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
                  <boxGeometry args={[w, 2.4, h]} />
                  <meshStandardMaterial color="#7c2d12" roughness={0.5} />
                </mesh>
                <mesh position={[0, 4.8, -h / 2.2]}>
                  <boxGeometry args={[w * 0.96, 6.5, 0.4]} />
                  <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.9} />
                </mesh>
                <mesh position={[0, 7.8, 0]}>
                  <boxGeometry args={[w * 0.9, 0.4, h * 0.8]} />
                  <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.8} />
                </mesh>
              </group>
            );

          case 'building':
            return (
              <group key={el.id} position={[posX, 0, posZ]}>
                <mesh position={[0, 4.0, 0]} castShadow receiveShadow>
                  <boxGeometry args={[w, 8.0, h]} />
                  <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.4} />
                </mesh>
                <mesh position={[0, 2.5, h / 2 + 0.8]}>
                  <boxGeometry args={[w * 0.6, 0.3, 1.8]} />
                  <meshStandardMaterial color="#38bdf8" transparent opacity={0.7} metalness={0.9} />
                </mesh>
              </group>
            );

          case 'security':
          case 'ticket_counter':
            return (
              <group key={el.id} position={[posX, 0, posZ]}>
                <mesh position={[0, 3.4, 0]}>
                  <boxGeometry args={[w, 0.4, h]} />
                  <meshStandardMaterial color="#0284c7" metalness={0.6} />
                </mesh>
                {[-w / 2.2, w / 2.2].map((px, pIdx) => (
                  <mesh key={pIdx} position={[px, 1.7, 0]}>
                    <cylinderGeometry args={[0.2, 0.2, 3.4, 6]} />
                    <meshStandardMaterial color="#64748b" metalness={0.8} />
                  </mesh>
                ))}
                {[-w / 3, 0, w / 3].map((tx, idx) => (
                  <group key={idx} position={[tx, 0, 0]}>
                    <mesh position={[0, 1.2, 0]}>
                      <boxGeometry args={[0.8, 2.4, h * 0.7]} />
                      <meshStandardMaterial color="#38bdf8" metalness={0.8} />
                    </mesh>
                    <mesh position={[0, 2.3, 0]}>
                      <boxGeometry args={[0.85, 0.15, h * 0.75]} />
                      <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={1.2} />
                    </mesh>
                  </group>
                ))}
              </group>
            );

          case 'barricade':
            return (
              <group key={el.id} position={[posX, 0, posZ]}>
                <mesh position={[0, 0.6, 0]}>
                  <boxGeometry args={[w, 1.2, h]} />
                  <meshStandardMaterial color="#facc15" metalness={0.7} roughness={0.3} />
                </mesh>
              </group>
            );

          case 'entry_gate':
            return (
              <group key={el.id} position={[posX, 0, posZ]}>
                <mesh position={[-w / 2, 2.4, 0]}>
                  <boxGeometry args={[1.0, 4.8, 1.0]} />
                  <meshStandardMaterial color="#15803d" metalness={0.6} />
                </mesh>
                <mesh position={[w / 2, 2.4, 0]}>
                  <boxGeometry args={[1.0, 4.8, 1.0]} />
                  <meshStandardMaterial color="#15803d" metalness={0.6} />
                </mesh>
                <mesh position={[0, 4.4, 0]}>
                  <boxGeometry args={[w, 1.0, 0.5]} />
                  <meshStandardMaterial color="#16a34a" emissive="#16a34a" emissiveIntensity={0.6} />
                </mesh>
              </group>
            );

          case 'exit_gate':
          case 'emergency_exit':
            const isEm = el.type === 'emergency_exit';
            // Calculate distance to closest fire / danger zone
            const minDistToHazard = dangerZones.length > 0
              ? Math.min(...dangerZones.map(dz => Math.hypot(el.x - dz.x, el.y - dz.y)))
              : 999;
            const isFireRiskZone = dangerZones.length > 0 && minDistToHazard < 22.0;
            const isPreferredRoute = dangerZones.length > 0 && !isBlocked && !isFireRiskZone;

            return (
              <group
                key={el.id}
                position={[posX, 0, posZ]}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onToggleBlockExit) onToggleBlockExit(el.id);
                }}
              >
                {/* Gate Pillars & Overhang */}
                <mesh position={[-w / 2, 2.4, 0]}>
                  <boxGeometry args={[1.0, 4.8, 1.0]} />
                  <meshStandardMaterial
                    color={isBlocked ? '#991b1b' : isFireRiskZone ? '#b91c1c' : isPreferredRoute ? '#047857' : isEm ? '#dc2626' : '#ea580c'}
                  />
                </mesh>
                <mesh position={[w / 2, 2.4, 0]}>
                  <boxGeometry args={[1.0, 4.8, 1.0]} />
                  <meshStandardMaterial
                    color={isBlocked ? '#991b1b' : isFireRiskZone ? '#b91c1c' : isPreferredRoute ? '#047857' : isEm ? '#dc2626' : '#ea580c'}
                  />
                </mesh>
                <mesh position={[0, 4.4, 0]}>
                  <boxGeometry args={[w, 1.0, 0.5]} />
                  <meshStandardMaterial
                    color={isBlocked ? '#7f1d1d' : isFireRiskZone ? '#991b1b' : isPreferredRoute ? '#065f46' : isEm ? '#dc2626' : '#ea580c'}
                    emissive={isBlocked ? '#ef4444' : isFireRiskZone ? '#f97316' : isPreferredRoute ? '#10b981' : isEm ? '#ef4444' : '#f97316'}
                    emissiveIntensity={isPreferredRoute ? 1.6 : isFireRiskZone ? 1.4 : isBlocked ? 1.2 : 0.7}
                  />
                </mesh>

                {/* Ground Glowing Chevron Guide for Preferred Exit */}
                {isPreferredRoute && (
                  <>
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
                      <planeGeometry args={[w * 0.9, 3.5]} />
                      <meshBasicMaterial color="#10b981" transparent opacity={0.35} />
                    </mesh>
                    <pointLight position={[0, 1.5, 0]} intensity={2.0} distance={12} color="#10b981" />
                  </>
                )}

                {/* Ground Warning Zone for Fire Risk Exit */}
                {isFireRiskZone && (
                  <>
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
                      <ringGeometry args={[w * 0.6, w * 0.8, 24]} />
                      <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
                    </mesh>
                    <pointLight position={[0, 1.5, 0]} intensity={2.5} distance={10} color="#ef4444" />
                  </>
                )}

                {/* Floating 3D Tactical Hologram Badge */}
                <Html position={[0, 5.8, 0]} center distanceFactor={45} className="pointer-events-none select-none">
                  {isBlocked ? (
                    <div className="px-2.5 py-1 rounded-lg bg-red-950/95 border-2 border-red-500 text-red-200 text-[11px] font-black whitespace-nowrap shadow-glow-red flex items-center gap-1.5 backdrop-blur-md">
                      <span>⛔</span>
                      <span>LOCKED / BLOCKED</span>
                    </div>
                  ) : isFireRiskZone ? (
                    <div className="px-2.5 py-1 rounded-lg bg-rose-950/95 border-2 border-rose-500 text-rose-100 text-[11px] font-black whitespace-nowrap shadow-glow-red flex items-center gap-1.5 backdrop-blur-md animate-pulse">
                      <span>🔥</span>
                      <span>NEAR FIRE HAZARD — AVOID ({minDistToHazard.toFixed(1)}m)</span>
                    </div>
                  ) : isPreferredRoute ? (
                    <div className="px-3 py-1 rounded-lg bg-emerald-950/95 border-2 border-emerald-400 text-emerald-100 text-[11px] font-black whitespace-nowrap shadow-glow-emerald flex items-center gap-1.5 backdrop-blur-md">
                      <span>⭐</span>
                      <span>RECOMMENDED EXIT [SAFE] ({minDistToHazard > 100 ? 'CLEAR' : `${minDistToHazard.toFixed(0)}m clear`})</span>
                    </div>
                  ) : (
                    <div className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-slate-300 text-[10px] font-semibold whitespace-nowrap">
                      <span>🚪</span>
                      <span>{el.label || (isEm ? 'EMERGENCY EXIT' : 'EXIT GATE')}</span>
                    </div>
                  )}
                </Html>
              </group>
            );

          case 'medical':
          case 'police':
            return (
              <group key={el.id} position={[posX, 0, posZ]}>
                <mesh position={[0, 2.2, 0]}>
                  <boxGeometry args={[w, 4.4, h]} />
                  <meshStandardMaterial color={el.type === 'medical' ? '#be123c' : '#1d4ed8'} roughness={0.3} />
                </mesh>
                <mesh position={[0, 4.5, 0]}>
                  <boxGeometry args={[w * 0.8, 0.8, 0.3]} />
                  <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
                </mesh>
              </group>
            );

          default:
            return (
              <mesh key={el.id} position={[posX, 1.5, posZ]}>
                <boxGeometry args={[w, 3.0, h]} />
                <meshStandardMaterial color="#475569" roughness={0.6} />
              </mesh>
            );
        }
      })}

      {/* 7. Real Dynamic Fire & Smoke Simulation Mesh */}
      <DynamicFireAndSmoke
        fireState={fireState}
        dangerZones={dangerZones}
        venueWidth={width}
        venueLength={length}
      />

      {/* 8. 3D CCTV Security Camera Mounting Posts (Perimeter Corners & Floodlight Masts) */}
      {[
        { x: width * 0.05 + offsetX, z: length * 0.06 + offsetZ, rot: Math.PI / 4, label: 'CAM-01' },
        { x: width * 0.95 + offsetX, z: length * 0.06 + offsetZ, rot: -Math.PI / 4, label: 'CAM-02' },
        { x: width * 0.95 + offsetX, z: length * 0.94 + offsetZ, rot: -3 * Math.PI / 4, label: 'CAM-03' },
        { x: width * 0.05 + offsetX, z: length * 0.94 + offsetZ, rot: 3 * Math.PI / 4, label: 'CAM-04' },
      ].map((cam, cIdx) => (
        <group key={`cctv_post_${cIdx}`} position={[cam.x, 0, cam.z]}>
          {/* High Perimeter Mast */}
          <mesh position={[0, 5.0, 0]}>
            <cylinderGeometry args={[0.1, 0.16, 10.0, 8]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Camera Arm & Housing */}
          <group position={[0, 9.8, 0]} rotation={[0.3, cam.rot, 0]}>
            <mesh position={[0, 0, 0.35]}>
              <boxGeometry args={[0.22, 0.22, 0.65]} />
              <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.7} />
            </mesh>
            {/* Lens */}
            <mesh position={[0, 0, 0.7]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 0.08, 12]} />
              <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.9} />
            </mesh>
            {/* Blinking Live Green/Red AI Indicator LED */}
            <mesh position={[0.09, 0.09, 0.65]}>
              <sphereGeometry args={[0.03, 6, 6]} />
              <meshStandardMaterial color="#22c55e" emissive="#4ade80" emissiveIntensity={2.5} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
};
