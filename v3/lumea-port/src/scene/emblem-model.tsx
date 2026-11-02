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
  SOFT_SHADOW_URL,
} from "./scene-config";
import { useRingStore } from "./ring-store";

interface RingEntry {
  material: THREE.MeshStandardMaterial;
  secondary: boolean;
}

const GOLD = "#e8c96a";
const GOLD_DEEP = "#b8923a";

/**
 * Planar UVs on the dial face (XY → 0–1), centered, repeat 1, so the full
 * dial-face.png reads inside the gold rim (not a zoomed atlas quarter).
 */
function applyPlanarDialUVs(geometry: THREE.BufferGeometry) {
  const pos = geometry.attributes.position;
  if (!pos) return;
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox!;
  const x0 = bb.min.x;
  const y0 = bb.min.y;
  const sx = Math.max(bb.max.x - bb.min.x, 1e-6);
  const sy = Math.max(bb.max.y - bb.min.y, 1e-6);
  // Use the larger axis so the circular face maps to a square without stretch.
  const span = Math.max(sx, sy);
  const cx = (bb.min.x + bb.max.x) * 0.5;
  const cy = (bb.min.y + bb.max.y) * 0.5;
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    uvs[i * 2] = (x - cx) / span + 0.5;
    // flipY=true on the texture → keep V unflipped in attribute space
    uvs[i * 2 + 1] = (y - cy) / span + 0.5;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.attributes.uv.needsUpdate = true;
  void x0;
  void y0;
}

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
  const softShadowTex = useTexture(SOFT_SHADOW_URL);
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
    dialTex.wrapS = THREE.ClampToEdgeWrapping;
    dialTex.wrapT = THREE.ClampToEdgeWrapping;
    dialTex.repeat.set(1, 1);
    dialTex.offset.set(0, 0);
    dialTex.rotation = 0;
    dialTex.center.set(0.5, 0.5);
    dialTex.needsUpdate = true;
  }, [dialTex]);

  useMemo(() => {
    softShadowTex.colorSpace = THREE.SRGBColorSpace;
    softShadowTex.wrapS = THREE.ClampToEdgeWrapping;
    softShadowTex.wrapT = THREE.ClampToEdgeWrapping;
    softShadowTex.needsUpdate = true;
  }, [softShadowTex]);

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
    // and extra rings / cubes that read as a second coin or legs when tilted.
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
      "Cube",
      "Cube_1",
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
        applyPlanarDialUVs(object.geometry);
        const m = new THREE.MeshPhysicalMaterial({
          map: dialTex,
          color: new THREE.Color(0.78, 0.92, 0.84),
          metalness: 0.05,
          roughness: 0.36,
          clearcoat: 0.95,
          clearcoatRoughness: 0.12,
          envMapIntensity: 0.9,
          toneMapped: true,
        });
        object.material = m;
      } else if (name === "glass" || object.name === "Glass") {
        const m = new THREE.MeshPhysicalMaterial({
          color: "#e8fff4",
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
          // Soft emerald rim bounce so the gold doesn't read gray/all-gold.
          emissive: new THREE.Color("#1a4a38"),
          emissiveIntensity: 0.14,
        });
        object.material = m;
      }
    });

    const native = 2.344;
    root.scale.setScalar(EMBLEM.diameter / native);
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
    c.parent.updateWorldMatrix(true, false);
    tmp.inv.copy(c.parent.matrixWorld).invert();
    tmp.localCam.copy(camera.position).applyMatrix4(tmp.inv);
    const yaw = Math.atan2(tmp.localCam.x - c.position.x, tmp.localCam.z - c.position.z);
    const sway = Math.sin(clock.getElapsedTime() * EMBLEM.swaySpeed) * EMBLEM.swayAmp;
    c.rotation.y = yaw + sway;
  });

  // Soft contact blob on the crown — cheap, opacity kept low so it doesn't
  // read as a plate (the v3g4 ContactShadows failure mode).
  const shadowY = EMBLEM.shadowY;

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
      {/* Soft radial contact blob — no hard slab edge. */}
      <mesh
        position={[0, shadowY + 0.001, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={-1}
      >
        <planeGeometry args={[0.95, 0.95]} />
        <meshBasicMaterial
          map={softShadowTex}
          transparent
          opacity={0.55}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

useGLTF.preload(MODEL_URL, DRACO_PATH);
useGLTF.preload(EMBLEM_URL, DRACO_PATH);
useTexture.preload?.(DIAL_URL);
useTexture.preload?.(SOFT_SHADOW_URL);
