import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

import { CHARACTERS, SOFT_SHADOW_URL } from "./scene-config";

type BillboardProps = {
  mapUrl: string;
  position: readonly [number, number, number];
  height: number;
  aspect: number; // width / height of cutout
  yawBias?: number;
};

/**
 * Lit alpha billboard — faces the Lumea camera hemisphere with clamped yaw,
 * rim from shaft, soft contact shadow, grade so it doesn't read as a flat paste.
 *
 * Camera sits in content-local +X/−Z, so a +Z-facing plane is back-face culled
 * unless we base yaw near π (face −Z) and/or use DoubleSide.
 */
const CharacterBillboard = ({
  mapUrl,
  position,
  height,
  aspect,
  yawBias = 0,
}: BillboardProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const tex = useTexture(mapUrl);
  const softShadow = useTexture(SOFT_SHADOW_URL);
  const width = height * aspect;

  // Face −Z in content space (toward the orbiting camera). Matches emblem baseYaw hemisphere.
  const BASE_YAW = Math.PI;

  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    softShadow.colorSpace = THREE.SRGBColorSpace;
    softShadow.needsUpdate = true;
  }, [tex, softShadow]);

  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.28,
        roughness: 0.52,
        metalness: 0.14,
        envMapIntensity: 0.6,
        // Cool shaft grade + slight emerald bounce so whites match scene.
        color: new THREE.Color("#b8beb8"),
        emissive: new THREE.Color("#1a3a32"),
        emissiveIntensity: 0.06,
        depthWrite: true,
        // Safety: never disappear if yaw clamp is off by a quadrant.
        side: THREE.DoubleSide,
      }),
    [tex],
  );

  const tmp = useMemo(
    () => ({
      inv: new THREE.Matrix4(),
      localCam: new THREE.Vector3(),
    }),
    [],
  );

  useFrame(({ camera }) => {
    const g = groupRef.current;
    if (!g || !g.parent) return;
    g.parent.updateWorldMatrix(true, false);
    tmp.inv.copy(g.parent.matrixWorld).invert();
    tmp.localCam.copy(camera.position).applyMatrix4(tmp.inv);
    const dx = tmp.localCam.x - g.position.x;
    const dz = tmp.localCam.z - g.position.z;
    const yaw = Math.atan2(dx, dz);
    // Shortest delta from BASE_YAW, then clamp for subtle ¾ parallax (not full spin).
    let delta = yaw - BASE_YAW;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    const clamped =
      BASE_YAW + THREE.MathUtils.clamp(delta + yawBias, -0.55, 0.55);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, clamped, 0.1);
  });

  return (
    <group
      ref={groupRef}
      position={[position[0], position[1], position[2]]}
      rotation={[0, BASE_YAW, 0]}
    >
      {/* Figure — pivot at feet */}
      <mesh position={[0, height * 0.5, 0]} castShadow>
        <planeGeometry args={[width, height]} />
        <primitive object={mat} attach="material" />
      </mesh>
      {/* Contact shadow on pillar crown */}
      <mesh
        position={[0, 0.002, 0.02]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={-1}
      >
        <planeGeometry args={[width * 0.9, width * 0.5]} />
        <meshBasicMaterial
          map={softShadow}
          transparent
          opacity={0.78}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Soft rim from the light shaft (above) */}
      <pointLight
        color="#fff4e0"
        intensity={1.8}
        distance={2.2}
        decay={2}
        position={[0.05, height * 0.95, 0.4]}
      />
      <pointLight
        color="#3d9a72"
        intensity={1.1}
        distance={2.0}
        decay={2}
        position={[-0.25, height * 0.55, 0.25]}
      />
    </group>
  );
};

export const CharacterBillboards = () => {
  const m = CHARACTERS.maxine;
  const r = CHARACTERS.robot;
  return (
    <group>
      <CharacterBillboard
        mapUrl={m.url}
        position={m.position}
        height={m.height}
        aspect={m.aspect}
        yawBias={m.yawBias}
      />
      <CharacterBillboard
        mapUrl={r.url}
        position={r.position}
        height={r.height}
        aspect={r.aspect}
        yawBias={r.yawBias}
      />
    </group>
  );
};

useTexture.preload?.(SOFT_SHADOW_URL);
