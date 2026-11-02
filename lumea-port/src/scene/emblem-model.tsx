import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";

import { DRACO_PATH, MODEL_URL, MONK, OCCLUDER_LAYER } from "./scene-config";
import { OrbitRings } from "./orbit-rings";

/**
 * Jewelry-grade Score OS emblem replacing the stone monk.
 * Materials bias toward readable dial on software GL (transmission → opaque glass).
 */
export const EmblemModel = () => {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH);
  const groupRef = useRef<THREE.Group>(null);

  const model = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      object.layers.enable(OCCLUDER_LAYER);

      const name = object.name.toLowerCase();

      if (name.includes("glass")) {
        // Soft frosted crystal — readable on swiftshader (full transmission often blacks out)
        object.material = new THREE.MeshPhysicalMaterial({
          color: "#d8f0c8",
          transmission: 0.2,
          thickness: 0.45,
          roughness: 0.12,
          metalness: 0.05,
          ior: 1.45,
          transparent: true,
          opacity: 0.28,
          clearcoat: 1,
          clearcoatRoughness: 0.08,
          envMapIntensity: 1.6,
          depthWrite: false,
        });
      } else if (
        name.includes("bezel") ||
        name.includes("tick") ||
        name.includes("needle") ||
        name.includes("jewel") ||
        name.includes("logo") ||
        name.includes("scorearc") ||
        name.includes("pivot")
      ) {
        const gold = new THREE.MeshPhysicalMaterial({
          color: "#e0c15a",
          metalness: 1,
          roughness: 0.16,
          clearcoat: 0.75,
          clearcoatRoughness: 0.1,
          envMapIntensity: 1.8,
          toneMapped: false,
        });
        if (name.includes("needle") || name.includes("jewel")) {
          gold.emissive = new THREE.Color("#c9a227");
          gold.emissiveIntensity = 0.85;
        }
        if (name.includes("logo") || name.includes("scorearc") || name.includes("tick")) {
          gold.emissive = new THREE.Color("#2d8a4e");
          gold.emissiveIntensity = 1.1;
          gold.color = new THREE.Color("#d4af37");
        }
        object.material = gold;
      } else if (name.includes("dial")) {
        object.material = new THREE.MeshStandardMaterial({
          color: "#0e2418",
          metalness: 0.55,
          roughness: 0.4,
          emissive: new THREE.Color("#0a3d22"),
          emissiveIntensity: 0.35,
        });
      }
    });

    root.rotation.y = Math.PI;
    // Face camera slightly; sit proud of base rock
    root.scale.setScalar(1.55);
    root.position.y = 0.35;
    return root;
  }, [scene]);

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    g.rotation.z = Math.sin(t * 0.18) * 0.035;
  });

  return (
    <group
      ref={groupRef}
      position={[MONK.position[0], MONK.position[1] + 0.05, MONK.position[2]]}
      rotation-y={MONK.rotationY}
    >
      <Environment preset="city" environmentIntensity={0.35} />
      <primitive object={model} />
      <OrbitRings />
      {/* Soft fill so dial never drops to void-black */}
      <pointLight
        color="#b8e0a0"
        intensity={10}
        distance={6}
        decay={2}
        position={[0.4, 1.2, 2.2]}
      />
      <pointLight
        color="#f0d78c"
        intensity={12}
        distance={5}
        decay={2}
        position={[-0.6, 0.8, 1.8]}
      />
    </group>
  );
};

useGLTF.preload(MODEL_URL, DRACO_PATH);
