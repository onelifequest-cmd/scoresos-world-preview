import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, Environment, useTexture } from "@react-three/drei";
import * as THREE from "three";

import { DRACO_PATH, MODEL_URL, MONK, OCCLUDER_LAYER } from "./scene-config";
import { OrbitRings } from "./orbit-rings";

const GOLD = "#e8c96a";
const DIAL_URL = new URL("assets/dial-face.png", import.meta.url).href;

/**
 * Jewelry-grade Score OS coin — painted dial uses MeshBasicMaterial so the
 * gauge reads on software GL (transmission glass was washing the face white).
 */
export const EmblemModel = () => {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH);
  const groupRef = useRef<THREE.Group>(null);
  const dialTex = useTexture(DIAL_URL);
  useMemo(() => {
    dialTex.colorSpace = THREE.SRGBColorSpace;
    dialTex.anisotropy = 8;
    dialTex.needsUpdate = true;
  }, [dialTex]);

  // Gold rim only from the GLB bezel
  const bezel = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const name = object.name.toLowerCase();
      if (!name.includes("bezel")) {
        object.visible = false;
        return;
      }
      object.castShadow = true;
      object.receiveShadow = true;
      object.layers.enable(OCCLUDER_LAYER);
      object.material = new THREE.MeshPhysicalMaterial({
        color: GOLD,
        metalness: 1,
        roughness: 0.14,
        clearcoat: 0.9,
        clearcoatRoughness: 0.08,
        envMapIntensity: 2.2,
        toneMapped: false,
      });
    });
    root.scale.setScalar(0.5);
    root.position.set(0, 0.82, 0);
    root.rotation.set(-0.12, 0, 0);
    return root;
  }, [scene]);

  const coin = useMemo(() => {
    const g = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.98, 0.98, 0.26, 64),
      new THREE.MeshPhysicalMaterial({
        color: "#9a7828",
        metalness: 1,
        roughness: 0.28,
        clearcoat: 0.45,
        envMapIntensity: 1.2,
        toneMapped: false,
      }),
    );
    body.rotation.x = Math.PI / 2;
    body.position.z = -0.05;
    body.castShadow = true;
    body.layers.enable(OCCLUDER_LAYER);
    g.add(body);

    // Unlit painted dial — always readable
    const dial = new THREE.Mesh(
      new THREE.CircleGeometry(0.86, 64),
      new THREE.MeshBasicMaterial({
        map: dialTex,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    dial.position.z = 0.12;
    dial.renderOrder = 2;
    g.add(dial);

    // Soft clearcoat plate WITHOUT transmission (swiftshader-safe)
    const coat = new THREE.Mesh(
      new THREE.CircleGeometry(0.87, 64),
      new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        metalness: 0,
        roughness: 0.05,
        transparent: true,
        opacity: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        envMapIntensity: 1.8,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    coat.position.z = 0.125;
    coat.renderOrder = 3;
    g.add(coat);

    const lip = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.048, 16, 80),
      new THREE.MeshPhysicalMaterial({
        color: GOLD,
        metalness: 1,
        roughness: 0.12,
        clearcoat: 1,
        envMapIntensity: 2,
        toneMapped: false,
      }),
    );
    lip.position.z = 0.12;
    lip.castShadow = true;
    g.add(lip);

    g.scale.setScalar(0.5);
    g.position.set(0, 0.82, 0);
    g.rotation.x = -0.12;
    return g;
  }, [dialTex]);

  useFrame(({ clock }) => {
    const grp = groupRef.current;
    if (!grp) return;
    grp.rotation.z = Math.sin(clock.getElapsedTime() * 0.15) * 0.02;
  });

  return (
    <group
      ref={groupRef}
      position={[MONK.position[0], MONK.position[1], MONK.position[2]]}
      rotation-y={MONK.rotationY}
    >
      <Environment preset="warehouse" environmentIntensity={0.55} />
      <primitive object={bezel} />
      <primitive object={coin} />
      <OrbitRings />
      <pointLight color="#c8f0a8" intensity={14} distance={5} decay={2} position={[0.25, 1.45, 2.0]} />
      <pointLight color="#f5e0a0" intensity={12} distance={4.5} decay={2} position={[-0.55, 1.2, 1.7]} />
      <pointLight color="#f3ffe8" intensity={22} distance={10} decay={1.6} position={[0.2, 4.0, 1.6]} />
    </group>
  );
};

useGLTF.preload(MODEL_URL, DRACO_PATH);
useTexture.preload?.(DIAL_URL);
