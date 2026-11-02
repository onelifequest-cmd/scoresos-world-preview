import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { useRingStore } from "./ring-store";

interface RingEntry {
  material: THREE.MeshStandardMaterial;
  secondary: boolean;
}

/**
 * Procedural stand-in for the two orbit toruses baked into monk.glb.
 * Driven by the same ring store so colours stay live-tunable.
 */
export const OrbitRings = () => {
  const rings = useMemo(() => {
    const entries: RingEntry[] = [];
    const make = (secondary: boolean) => {
      const material = new THREE.MeshStandardMaterial({
        roughness: 0.35,
        metalness: 0.35,
        toneMapped: false,
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
        ? r.emissiveIntensity * r.secondaryFactor * 0.55
        : r.emissiveIntensity;
      entry.material.color.set(r.baseColor);
      entry.material.emissive.set(r.emissiveColor).multiplyScalar(intensity);
    }
  });

  return (
    <group>
      {/* Primary orbit — large tilted ring around the emblem */}
      <mesh
        rotation={[Math.PI / 2.4, 0.2, 0.35]}
        position={[0, 0.05, 0]}
        material={rings.primaryMat}
      >
        <torusGeometry args={[1.35, 0.01, 16, 128]} />
      </mesh>
      {/* Secondary accent ring */}
      <mesh
        rotation={[Math.PI / 2.1, -0.15, -0.55]}
        position={[0, -0.45, -0.15]}
        material={rings.secondaryMat}
      >
        <torusGeometry args={[0.95, 0.007, 12, 96]} />
      </mesh>
    </group>
  );
};
