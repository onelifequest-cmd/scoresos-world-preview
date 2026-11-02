

import { useMemo } from "react";
import * as THREE from "three";

import { LIGHTS } from "./scene-config";

/**
 * The scene's light plan: a near-vertical key shaft from above (the reference's
 * single dramatic source), a dim cool front fill so the figure reads, a faint
 * hemisphere/ambient floor, and a small emissive nub at the source that blooms
 * into the top haze. Shadows come from the key light only.
 */
export const Lighting = () => {
  const { ambientIntensity, hemisphere, key, fill, sourceGlow } = LIGHTS;
  // A stable target object the spotlight aims at (a mesh in the graph, not a ref
  // read during render). Created once — its position never changes.
  const keyTarget = useMemo(() => new THREE.Object3D(), []);

  return (
    <group>
      <ambientLight intensity={ambientIntensity} />
      <hemisphereLight
        color={hemisphere.sky}
        groundColor={hemisphere.ground}
        intensity={hemisphere.intensity}
      />

      <primitive object={keyTarget} position={[...key.target]} />
      <spotLight
        color={key.color}
        position={[...key.position]}
        target={keyTarget}
        intensity={key.intensity}
        angle={key.angle}
        penumbra={key.penumbra}
        distance={key.distance}
        decay={key.decay}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />

      <pointLight
        color={fill.color}
        position={[...fill.position]}
        intensity={fill.intensity}
        distance={fill.distance}
        decay={fill.decay}
      />

      <mesh position={[...sourceGlow.position]}>
        <sphereGeometry args={[sourceGlow.radius, 16, 16]} />
        <meshBasicMaterial color={sourceGlow.color} toneMapped={false} />
      </mesh>
    </group>
  );
};
