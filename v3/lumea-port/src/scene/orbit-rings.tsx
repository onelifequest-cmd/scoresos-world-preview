import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { useRingStore } from "./ring-store";

interface RingEntry {
  material: THREE.MeshStandardMaterial;
  secondary: boolean;
}

/**
 * Thin elegant gold-amber orbit lines — partially behind the emblem,
 * matching Lumea reel weight (hairline glow, not saturated yellow tubes).
 */
export const OrbitRings = () => {
  const rings = useMemo(() => {
    const entries: RingEntry[] = [];
    const make = (secondary: boolean) => {
      const material = new THREE.MeshStandardMaterial({
        roughness: 0.45,
        metalness: 0.15,
        toneMapped: false,
        transparent: true,
        opacity: secondary ? 0.72 : 0.9,
        depthWrite: false,
      });
      entries.push({ material, secondary });
      return material;
    };
    return {
      primaryMat: make(false),
      secondaryMat: make(true),
      entries,
    };
  }, []);

  const ringsRef = useRef<RingEntry[]>([]);
  useEffect(() => {
    ringsRef.current = rings.entries;
  }, [rings]);

  useFrame(() => {
    const r = useRingStore.getState();
    for (const entry of ringsRef.current) {
      const intensity = entry.secondary
        ? r.emissiveIntensity * r.secondaryFactor * 0.45
        : r.emissiveIntensity * 0.7;
      entry.material.color.set(r.baseColor);
      entry.material.emissive.set(r.emissiveColor).multiplyScalar(intensity);
    }
  });

  return (
    <group>
      {/* Primary — large tilted ring, mostly behind subject */}
      <mesh
        rotation={[Math.PI / 2.55, 0.18, 0.42]}
        position={[0.08, 0.7, -1.35]}
        material={rings.primaryMat}
      >
        <torusGeometry args={[1.85, 0.0025, 10, 160]} />
      </mesh>
      {/* Secondary accent — lower, thinner, further back */}
      <mesh
        rotation={[Math.PI / 2.15, -0.22, -0.62]}
        position={[-0.1, 0.05, -1.55]}
        material={rings.secondaryMat}
      >
        <torusGeometry args={[1.25, 0.0020, 10, 128]} />
      </mesh>
    </group>
  );
};
