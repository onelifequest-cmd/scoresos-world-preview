import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";

import {
  DIAL_URL,
  DRACO_PATH,
  EMBLEM,
  EMBLEM_URL,
  MODEL_URL,
  MONK,
  OCCLUDER_LAYER,
} from "./scene-config";
import { useRingStore } from "./ring-store";

interface RingEntry {
  material: THREE.MeshStandardMaterial;
  secondary: boolean;
}

const GOLD = "#e8c96a";
const GOLD_DEEP = "#b8923a";

/**
 * Score OS emblem — ONE thick medallion from emblem.glb (bezel + painted dial),
 * plus Lumea halo toruses from monk.glb.
 * Yaw tracks the camera with a slow ±20° sway so the dial stays readable.
 */
export const EmblemModel = () => {
  const { scene: monkScene } = useGLTF(MODEL_URL, DRACO_PATH);
  const { scene: emblemScene } = useGLTF(EMBLEM_URL, DRACO_PATH);
  const groupRef = useRef<THREE.Group>(null);
  const coinRef = useRef<THREE.Group>(null);
  const dialTex = useTexture(DIAL_URL);
  const tmp = useMemo(
    () => ({
      world: new THREE.Vector3(),
      localCam: new THREE.Vector3(),
      inv: new THREE.Matrix4(),
    }),
    [],
  );

  useMemo(() => {
    dialTex.colorSpace = THREE.SRGBColorSpace;
    dialTex.anisotropy = 8;
    dialTex.flipY = true;
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
    const root = emblemScene.clone(true);
    // Keep only the thick body: Bezel + Dial + Glass + Lip. Hide duplicate art
    // and extra rings that read as a second coin / horizontal band when tilted.
    const HIDE = new Set([
      "ScoreLogo",
      "ScoreArc",
      "TickMarks",
      "Needle",
      "NeedleSpine",
      "NeedlePivot",
      "Hub",
      "HubCap",
      "Jewel",
      "StepRing",
    ]);
    root.traverse((object) => {
      if (HIDE.has(object.name)) {
        object.visible = false;
        return;
      }
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      object.layers.enable(OCCLUDER_LAYER);

      const mat = object.material as THREE.MeshStandardMaterial;
      const name = (mat?.name || object.name || "").toLowerCase();

      if (name === "dial" || object.name === "Dial") {
        // Enamel dial — painted face, deeper emerald multiply (less neon).
        const m = new THREE.MeshPhysicalMaterial({
          map: dialTex,
          color: new THREE.Color(0.72, 0.9, 0.78),
          metalness: 0.05,
          roughness: 0.38,
          clearcoat: 0.95,
          clearcoatRoughness: 0.14,
          envMapIntensity: 0.85,
          toneMapped: true,
        });
        object.material = m;
      } else if (name === "glass" || object.name === "Glass") {
        const m = new THREE.MeshPhysicalMaterial({
          color: "#f5fffb",
          metalness: 0,
          roughness: 0.05,
          transparent: true,
          opacity: 0.14,
          clearcoat: 1,
          clearcoatRoughness: 0.04,
          envMapIntensity: 1.4,
          depthWrite: false,
        });
        object.material = m;
      } else if (name.includes("gold") || object.name === "Bezel" || object.name === "Lip") {
        const m = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(name.includes("bright") ? GOLD : GOLD_DEEP),
          metalness: 1,
          roughness: 0.18,
          clearcoat: 0.7,
          clearcoatRoughness: 0.08,
          envMapIntensity: 1.7,
        });
        object.material = m;
      }
    });

    const native = 2.344;
    root.scale.setScalar(EMBLEM.diameter / native);
    // Mild tip so the rim reads with depth but the dial stays frontal.
    root.rotation.x = EMBLEM.tiltX;
    return root;
  }, [emblemScene, dialTex]);

  useFrame(({ clock, camera }) => {
    const r = useRingStore.getState();
    for (const entry of ringsRef.current) {
      const intensity = entry.secondary
        ? r.emissiveIntensity * r.secondaryFactor
        : r.emissiveIntensity;
      entry.material.color.set(r.baseColor);
      entry.material.emissive.set(r.emissiveColor).multiplyScalar(intensity);
    }

    const c = coinRef.current;
    if (!c || !c.parent) return;
    // Face the camera in the parent local frame, then add a slow ±sway.
    c.parent.updateWorldMatrix(true, false);
    tmp.inv.copy(c.parent.matrixWorld).invert();
    tmp.localCam.copy(camera.position).applyMatrix4(tmp.inv);
    const yaw = Math.atan2(tmp.localCam.x - c.position.x, tmp.localCam.z - c.position.z);
    const sway = Math.sin(clock.getElapsedTime() * EMBLEM.swaySpeed) * EMBLEM.swayAmp;
    c.rotation.y = yaw + sway;
  });

  return (
    <group
      ref={groupRef}
      position={[MONK.position[0], MONK.position[1], MONK.position[2]]}
      rotation-y={MONK.rotationY}
    >
      <Environment preset="warehouse" environmentIntensity={0.4} />
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
useGLTF.preload(EMBLEM_URL, DRACO_PATH);
useTexture.preload?.(DIAL_URL);
