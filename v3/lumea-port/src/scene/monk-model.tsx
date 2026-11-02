

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { DRACO_PATH, MODEL_URL, MONK, OCCLUDER_LAYER } from "./scene-config";
import { useRingStore } from "./ring-store";

interface RingEntry {
  material: THREE.MeshStandardMaterial;
  secondary: boolean;
}

/**
 * The monk figure plus the two baked toruses. The figure keeps its textured
 * material (shadows on); the rings get fresh emissive materials that are driven
 * live from the ring store (so the ring-material panel can tune them).
 */
export const MonkModel = () => {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH);

  const { model, rings } = useMemo(() => {
    const root = scene.clone(true);
    const ringEntries: RingEntry[] = [];

    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      // The figure occludes rocks behind it for the dispersion mask.
      if (!object.name.startsWith("Torus")) {
        object.layers.enable(OCCLUDER_LAYER);
      }

      if (object.name.startsWith("Torus")) {
        const material = new THREE.MeshStandardMaterial({
          roughness: 0.4,
          metalness: 0.2,
          toneMapped: false,
        });
        object.material = material;
        ringEntries.push({ material, secondary: object.name.includes("002") });
      }
    });

    return { model: root, rings: ringEntries };
  }, [scene]);

  // Hold the ring materials in a ref so the per-frame update mutates through the
  // ref escape hatch, not the useMemo value directly.
  const ringsRef = useRef<RingEntry[]>([]);
  useEffect(() => {
    ringsRef.current = rings;
  }, [rings]);

  useFrame(() => {
    const r = useRingStore.getState();
    for (const entry of ringsRef.current) {
      const intensity = entry.secondary
        ? r.emissiveIntensity * r.secondaryFactor
        : r.emissiveIntensity;
      entry.material.color.set(r.baseColor);
      // Drive brightness via the emissive colour magnitude (method calls) so the
      // per-frame update never assigns a ref-derived property (lint-clean, and
      // emissiveIntensity stays 1). toneMapped:false + bloom carries values > 1.
      entry.material.emissive.set(r.emissiveColor).multiplyScalar(intensity);
    }
  });

  return (
    <primitive
      object={model}
      position={[...MONK.position]}
      rotation-y={MONK.rotationY}
    />
  );
};

useGLTF.preload(MODEL_URL, DRACO_PATH);
