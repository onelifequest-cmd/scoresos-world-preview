import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { DRACO_PATH, MODEL_URL, MONK, OCCLUDER_LAYER, PILLAR } from "./scene-config";

/**
 * Keep only triangles whose centroid is at/below cutY (local mesh space).
 * Used to hide the fused monk body while preserving the weathered pedestal.
 */
function cutGeometryAboveY(source: THREE.BufferGeometry, cutY: number): THREE.BufferGeometry {
  const geo = source.index ? source.toNonIndexed() : source.clone();
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const uv = geo.attributes.uv;
  const triCount = pos.count / 3;

  const keepPos: number[] = [];
  const keepNrm: number[] = [];
  const keepUv: number[] = [];

  for (let t = 0; t < triCount; t += 1) {
    const i0 = t * 3;
    const y0 = pos.getY(i0);
    const y1 = pos.getY(i0 + 1);
    const y2 = pos.getY(i0 + 2);
    const cy = (y0 + y1 + y2) / 3;
    if (cy > cutY) continue;
    for (let k = 0; k < 3; k += 1) {
      const i = i0 + k;
      keepPos.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      if (nrm) keepNrm.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
      if (uv) keepUv.push(uv.getX(i), uv.getY(i));
    }
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(keepPos, 3));
  if (keepNrm.length) {
    out.setAttribute("normal", new THREE.Float32BufferAttribute(keepNrm, 3));
  } else {
    out.computeVertexNormals();
  }
  if (keepUv.length) {
    out.setAttribute("uv", new THREE.Float32BufferAttribute(keepUv, 2));
  }
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

/**
 * Lumea pedestal extracted from monk.glb mesh.001 (monk body cut away).
 * Keeps the original stone albedo + normal maps. No thick plate on the crown.
 */
export const BaseRock = () => {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH);

  const pedestal = useMemo(() => {
    const group = new THREE.Group();
    let source: THREE.Mesh | null = null;
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && !object.name.startsWith("Torus")) {
        source = object;
      }
    });

    if (!source) {
      const stone = new THREE.MeshStandardMaterial({
        color: PILLAR.color,
        roughness: PILLAR.roughness,
        metalness: PILLAR.metalness,
      });
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(
          PILLAR.radiusTop,
          PILLAR.radiusBottom,
          PILLAR.height,
          32,
        ),
        stone,
      );
      shaft.position.y = PILLAR.height / 2;
      group.add(shaft);
      group.position.set(...PILLAR.position);
      return group;
    }

    const mesh = source as THREE.Mesh;
    const cutY = PILLAR.cutY;
    const geometry = cutGeometryAboveY(mesh.geometry, cutY);

    const srcMat = mesh.material as THREE.MeshStandardMaterial;
    const material = srcMat.clone();
    material.color = new THREE.Color(PILLAR.tint);
    material.roughness = Math.max(srcMat.roughness ?? 0.85, 0.78);
    material.metalness = Math.min(srcMat.metalness ?? 0.05, 0.08);
    material.envMapIntensity = 0.35;
    material.needsUpdate = true;

    const pedestalMesh = new THREE.Mesh(geometry, material);
    pedestalMesh.castShadow = true;
    pedestalMesh.receiveShadow = true;
    pedestalMesh.layers.enable(OCCLUDER_LAYER);
    pedestalMesh.position.copy(mesh.position);
    pedestalMesh.quaternion.copy(mesh.quaternion);
    pedestalMesh.scale.copy(mesh.scale);
    group.add(pedestalMesh);


    group.position.set(MONK.position[0], MONK.position[1], MONK.position[2]);
    return group;
  }, [scene]);

  return <primitive object={pedestal} />;
};

useGLTF.preload(MODEL_URL, DRACO_PATH);
