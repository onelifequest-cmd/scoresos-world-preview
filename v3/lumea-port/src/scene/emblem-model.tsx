import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, Environment, useTexture } from "@react-three/drei";
import * as THREE from "three";

import {
  DRACO_PATH,
  DIAL_URL,
  EMBLEM,
  MODEL_URL,
  MONK,
  OCCLUDER_LAYER,
} from "./scene-config";
import { useRingStore } from "./ring-store";

const GOLD = "#e8c96a";
const GOLD_DEEP = "#9a7828";

interface RingEntry {
  material: THREE.MeshStandardMaterial;
  secondary: boolean;
}

/**
 * Score OS emblem on the Lumea pillar + two baked halo toruses from monk.glb.
 * Green only on the painted dial. No emblem.glb overlay (it was covering the face).
 */
export const EmblemModel = () => {
  const { scene: monkScene } = useGLTF(MODEL_URL, DRACO_PATH);
  const groupRef = useRef<THREE.Group>(null);
  const coinRef = useRef<THREE.Group>(null);
  const dialTex = useTexture(DIAL_URL);

  useMemo(() => {
    dialTex.colorSpace = THREE.SRGBColorSpace;
    dialTex.anisotropy = 8;
    dialTex.needsUpdate = true;
  }, [dialTex]);

  const { ringsRoot, rings } = useMemo(() => {
    const root = monkScene.clone(true);
    const ringEntries: RingEntry[] = [];
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (object.name.startsWith("Torus")) {
        object.castShadow = false;
        object.receiveShadow = false;
        const material = new THREE.MeshStandardMaterial({
          roughness: 0.4,
          metalness: 0.2,
          toneMapped: false,
        });
        object.material = material;
        ringEntries.push({
          material,
          secondary: object.name.includes("002"),
        });
      } else {
        object.visible = false;
      }
    });
    return { ringsRoot: root, rings: ringEntries };
  }, [monkScene]);

  const ringsRef = useRef<RingEntry[]>([]);
  useEffect(() => {
    ringsRef.current = rings;
  }, [rings]);

  const coin = useMemo(() => {
    const g = new THREE.Group();
    const r = EMBLEM.diameter / 2;
    const t = EMBLEM.thickness;

    // Thick gold body
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, t, 72),
      new THREE.MeshPhysicalMaterial({
        color: GOLD_DEEP,
        metalness: 1,
        roughness: 0.26,
        clearcoat: 0.5,
        clearcoatRoughness: 0.12,
        envMapIntensity: 1.4,
        toneMapped: false,
      }),
    );
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    body.layers.enable(OCCLUDER_LAYER);
    g.add(body);

    // Front beveled rim
    const rimMat = new THREE.MeshPhysicalMaterial({
      color: GOLD,
      metalness: 1,
      roughness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 2.2,
      toneMapped: false,
    });
    const frontRim = new THREE.Mesh(
      new THREE.TorusGeometry(r * 0.93, t * 0.32, 20, 80),
      rimMat,
    );
    frontRim.position.z = t * 0.38;
    frontRim.castShadow = true;
    frontRim.layers.enable(OCCLUDER_LAYER);
    g.add(frontRim);

    const backRim = new THREE.Mesh(
      new THREE.TorusGeometry(r * 0.93, t * 0.32, 20, 80),
      rimMat.clone(),
    );
    backRim.position.z = -t * 0.38;
    backRim.layers.enable(OCCLUDER_LAYER);
    g.add(backRim);

    // Outer lip ring for thickness read
    const lip = new THREE.Mesh(
      new THREE.TorusGeometry(r * 0.98, t * 0.18, 12, 72),
      rimMat.clone(),
    );
    lip.rotation.x = Math.PI / 2;
    lip.layers.enable(OCCLUDER_LAYER);
    g.add(lip);

    // Painted dial on BOTH faces — MeshBasic so green gauge reads on swiftshader
    const dialMat = new THREE.MeshBasicMaterial({
      map: dialTex,
      color: new THREE.Color(1.25, 1.25, 1.25),
      toneMapped: false,
      side: THREE.FrontSide,
    });
    const dial = new THREE.Mesh(new THREE.CircleGeometry(r * 0.84, 64), dialMat);
    dial.position.z = t * 0.52 + 0.002;
    dial.renderOrder = 2;
    g.add(dial);
    const dialBack = new THREE.Mesh(
      new THREE.CircleGeometry(r * 0.84, 64),
      dialMat.clone(),
    );
    dialBack.position.z = -(t * 0.52 + 0.002);
    dialBack.rotation.y = Math.PI;
    dialBack.renderOrder = 2;
    g.add(dialBack);

    // Soft clearcoat over dial
    const coat = new THREE.Mesh(
      new THREE.CircleGeometry(r * 0.85, 64),
      new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        metalness: 0,
        roughness: 0.05,
        transparent: true,
        opacity: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        envMapIntensity: 1.4,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    coat.position.z = t * 0.54;
    coat.renderOrder = 3;
    g.add(coat);

    // Tip toward camera; upright medallion
    g.rotation.x = EMBLEM.tiltX;
    return g;
  }, [dialTex]);

  useFrame(({ clock }) => {
    const r = useRingStore.getState();
    for (const entry of ringsRef.current) {
      const intensity = entry.secondary
        ? r.emissiveIntensity * r.secondaryFactor
        : r.emissiveIntensity;
      entry.material.color.set(r.baseColor);
      entry.material.emissive.set(r.emissiveColor).multiplyScalar(intensity);
    }
    const c = coinRef.current;
    if (c) {
      // Slow yaw around a camera-facing bias (¾ starts readable)
      c.rotation.y = 0.35 + clock.getElapsedTime() * EMBLEM.spinSpeed;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[MONK.position[0], MONK.position[1], MONK.position[2]]}
      rotation-y={MONK.rotationY}
    >
      <Environment preset="warehouse" environmentIntensity={0.35} />
      <primitive object={ringsRoot} />
      <group
        ref={coinRef}
        position={[EMBLEM.position[0], EMBLEM.position[1], EMBLEM.position[2]]}
      >
        <primitive object={coin} />
      </group>
    </group>
  );
};

useGLTF.preload(MODEL_URL, DRACO_PATH);
useTexture.preload?.(DIAL_URL);
