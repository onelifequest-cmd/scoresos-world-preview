import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { DRACO_PATH, OCCLUDER_LAYER, ROCKS_URL } from "./scene-config";

export const BaseRock = () => {
  const { scene } = useGLTF(ROCKS_URL, DRACO_PATH);

  const rock = useMemo(() => {
    const meshes: THREE.Mesh[] = [];
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) meshes.push(o);
    });
    meshes.sort(
      (a, b) =>
        (b.geometry.attributes.position?.count || 0) -
        (a.geometry.attributes.position?.count || 0),
    );
    const source = meshes[0];
    if (!source) return null;

    const mesh = source.clone();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.layers.enable(OCCLUDER_LAYER);
    if (mesh.material instanceof THREE.MeshStandardMaterial) {
      const mat = mesh.material.clone();
      mat.roughness = Math.min(1, (mat.roughness || 0.8) + 0.05);
      mat.metalness = 0.04;
      mat.emissive = new THREE.Color("#142418");
      mat.emissiveIntensity = 0.18;
      mesh.material = mat;
    }
    return mesh;
  }, [scene]);

  if (!rock) return null;

  return (
    <primitive
      object={rock}
      position={[0, -0.95, 0.05]}
      scale={3.4}
      rotation={[0.22, 0.85, 0.12]}
    />
  );
};

useGLTF.preload(ROCKS_URL, DRACO_PATH);
