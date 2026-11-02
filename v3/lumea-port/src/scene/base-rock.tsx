import { useMemo } from "react";
import * as THREE from "three";

import { OCCLUDER_LAYER, PILLAR } from "./scene-config";

/**
 * Tall dark stone pillar approximating the Lumea pedestal silhouette:
 * ruined column, flat crown, dark grey stone — no green, no boulder lump.
 */
export const BaseRock = () => {
  const pillar = useMemo(() => {
    const group = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({
      color: PILLAR.color,
      roughness: PILLAR.roughness,
      metalness: PILLAR.metalness,
      emissive: new THREE.Color(PILLAR.emissiveColor),
      emissiveIntensity: PILLAR.emissiveIntensity,
    });

    // Main shaft
    const shaftGeo = new THREE.CylinderGeometry(
      PILLAR.radiusTop,
      PILLAR.radiusBottom,
      PILLAR.height,
      32,
      8,
      false,
    );
    // Mild vertex noise for weathered stone
    const pos = shaftGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const x = pos.getX(i);
      const z = pos.getZ(i);
      // Don't distort the flat top/bottom much
      const edge = 1 - Math.min(1, Math.abs(y) / (PILLAR.height * 0.5));
      const n =
        (Math.sin(x * 9.1 + y * 6.2) * 0.018 +
          Math.cos(z * 8.4 - y * 4.7) * 0.014) *
        edge;
      const len = Math.hypot(x, z) || 1;
      pos.setXYZ(i, x + (x / len) * n, y, z + (z / len) * n);
    }
    pos.needsUpdate = true;
    shaftGeo.computeVertexNormals();

    const shaft = new THREE.Mesh(shaftGeo, stone);
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    shaft.layers.enable(OCCLUDER_LAYER);
    shaft.position.y = PILLAR.height / 2;
    group.add(shaft);

    // Flat crown the emblem sits on
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(
        PILLAR.radiusTop * 1.22,
        PILLAR.radiusTop * 1.08,
        0.09,
        32,
      ),
      stone.clone(),
    );
    crown.castShadow = true;
    crown.receiveShadow = true;
    crown.layers.enable(OCCLUDER_LAYER);
    crown.position.y = PILLAR.height + 0.02;
    group.add(crown);

    // Foot flare
    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(
        PILLAR.radiusBottom * 1.12,
        PILLAR.radiusBottom * 1.38,
        0.16,
        32,
      ),
      stone.clone(),
    );
    foot.castShadow = true;
    foot.receiveShadow = true;
    foot.layers.enable(OCCLUDER_LAYER);
    foot.position.y = 0.06;
    group.add(foot);

    group.position.set(
      PILLAR.position[0],
      PILLAR.position[1],
      PILLAR.position[2],
    );
    return group;
  }, []);

  return <primitive object={pillar} />;
};
