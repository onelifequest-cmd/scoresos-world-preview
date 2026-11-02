import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";

import {
  CHARACTERS,
  DRACO_PATH,
  SOFT_SHADOW_URL,
  type CharacterSlotConfig,
} from "./scene-config";

/** ±8° soft parallax — never enough to reveal billboard flatness. */
const PARALLAX_CLAMP = (8 * Math.PI) / 180;
/** Real Meshy meshes can take a slow ±18° idle sway without looking flat. */
const GLB_SWAY_AMP = (18 * Math.PI) / 180;
const GLB_SWAY_SPEED = 0.28;
const BASE_YAW = Math.PI;

type GroundingProps = {
  width: number;
};

/** Soft contact shadow + AO disc shared by billboard and GLB. */
const FootGrounding = ({ width }: GroundingProps) => {
  const softShadow = useTexture(SOFT_SHADOW_URL);
  useMemo(() => {
    softShadow.colorSpace = THREE.SRGBColorSpace;
    softShadow.needsUpdate = true;
  }, [softShadow]);
  return (
    <>
      <mesh
        position={[0, 0.002, 0.02]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={-1}
      >
        <planeGeometry args={[width * 0.95, width * 0.55]} />
        <meshBasicMaterial
          map={softShadow}
          transparent
          opacity={0.82}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh
        position={[0, 0.006, 0.01]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={-1}
      >
        <circleGeometry args={[width * 0.32, 28]} />
        <meshBasicMaterial
          color="#050608"
          transparent
          opacity={0.48}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  );
};

/** Neutral shaft key + subtle emerald rim — intensityScale lowers Maxine suit blowout. */
const SlotLights = ({
  height,
  intensityScale = 1,
}: {
  height: number;
  intensityScale?: number;
}) => (
  <>
    <pointLight
      color="#fff6e8"
      intensity={1.15 * intensityScale}
      distance={2.4}
      decay={2}
      position={[0.02, height * 1.05, 0.45]}
    />
    <pointLight
      color="#3d9a72"
      intensity={0.22 * intensityScale}
      distance={1.5}
      decay={2}
      position={[-0.38, height * 0.55, -0.22]}
    />
    {/* Soft fill so the camera-far side of a dark figure isn't a silhouette. */}
    <pointLight
      color="#e8eef8"
      intensity={1.35 * intensityScale}
      distance={2.4}
      decay={2}
      position={[0.45, height * 0.7, 0.4]}
    />
  </>
);

/**
 * Soft yaw toward camera (clamped). Used for billboards; GLBs keep authored
 * rotation unless `yawFollow` is true.
 */
function useSoftYaw(
  groupRef: { current: THREE.Group | null },
  yawBias: number,
  enabled: boolean,
  clamp: number = PARALLAX_CLAMP,
) {
  const tmp = useMemo(
    () => ({
      inv: new THREE.Matrix4(),
      localCam: new THREE.Vector3(),
    }),
    [],
  );
  useFrame(({ camera }) => {
    if (!enabled) return;
    const g = groupRef.current;
    if (!g || !g.parent) return;
    g.parent.updateWorldMatrix(true, false);
    tmp.inv.copy(g.parent.matrixWorld).invert();
    tmp.localCam.copy(camera.position).applyMatrix4(tmp.inv);
    const dx = tmp.localCam.x - g.position.x;
    const dz = tmp.localCam.z - g.position.z;
    const yaw = Math.atan2(dx, dz);
    let delta = yaw - BASE_YAW;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    const clamped =
      BASE_YAW + THREE.MathUtils.clamp(delta + yawBias, -clamp, clamp);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, clamped, 0.12);
  });
}

/** Alpha billboard fallback (v3g9). */
const CharacterBillboard = ({
  cfg,
}: {
  cfg: CharacterSlotConfig;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const tex = useTexture(cfg.url);
  const width = cfg.height * cfg.aspect;

  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
  }, [tex]);

  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.28,
        roughness: 0.46,
        metalness: 0.22,
        envMapIntensity: 0.7,
        color: new THREE.Color("#d8d4cc"),
        emissive: new THREE.Color("#000000"),
        emissiveIntensity: 0,
        depthWrite: true,
        side: THREE.DoubleSide,
      }),
    [tex],
  );

  useSoftYaw(groupRef, cfg.yawBias, true);

  return (
    <group
      ref={groupRef}
      position={[cfg.position[0], cfg.position[1], cfg.position[2]]}
      rotation={[0, BASE_YAW, 0]}
    >
      <mesh position={[0, cfg.height * 0.5, 0]} castShadow>
        <planeGeometry args={[width, cfg.height]} />
        <primitive object={mat} attach="material" />
      </mesh>
      <FootGrounding width={width} />
      <SlotLights height={cfg.height} />
    </group>
  );
};

/**
 * Meshy GLB character — scaled so bounding height ≈ cfg.height, pivot at feet.
 * Position / rotation / lighting match the billboard slot.
 */
const CharacterGlb = ({ cfg }: { cfg: CharacterSlotConfig }) => {
  const groupRef = useRef<THREE.Group>(null);
  // Draco path + Meshopt decoder (robot-b.glb uses EXT_meshopt_compression + webp).
  const { scene } = useGLTF(cfg.glbUrl!, DRACO_PATH, true);
  const width = cfg.height * (cfg.aspect || 0.35);

  const root = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        const isMaxine = !!(cfg.glbUrl && cfg.glbUrl.includes("maxine"));
        for (const m of mats) {
          if (!m || !("envMapIntensity" in m)) continue;
          const std = m as THREE.MeshStandardMaterial;
          const n = (std.name || "").toLowerCase();
          // Maxine: pull suit exposure down so satin folds read; leave face maps alone
          // (no emissive boost, no color push on skin-named mats).
          if (isMaxine) {
            const isFace =
              n.includes("face") || n.includes("skin") || n.includes("head");
            if (n.includes("arm-chrome") || n.includes("chrome")) {
              std.metalness = 0.85;
              std.roughness = 0.28;
              std.envMapIntensity = 1.05;
            } else if (!isFace) {
              std.metalness = Math.min(std.metalness ?? 0.1, 0.12);
              std.roughness = Math.max(std.roughness ?? 0.45, 0.58);
              std.envMapIntensity = 0.42;
              if (std.color) std.color.multiplyScalar(0.78);
            }
            std.emissiveIntensity = 0;
            if (std.emissive) std.emissive.setRGB(0, 0, 0);
          } else if (n.includes("arm-chrome") || n.includes("chrome")) {
            std.metalness = 0.9;
            std.roughness = 0.2;
            std.envMapIntensity = 1.35;
          } else if (n.includes("suit")) {
            std.metalness = 0.08;
            std.roughness = 0.45;
            std.envMapIntensity = 0.9;
          } else {
            std.envMapIntensity = Math.max(std.envMapIntensity ?? 1, 0.85);
          }
          std.needsUpdate = true;
        }
      }
    });
    // Normalize: feet at y=0, height → cfg.height
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    const h = Math.max(size.y, 1e-3);
    const s = cfg.height / h;
    cloned.scale.setScalar(s);
    box.setFromObject(cloned);
    cloned.position.y -= box.min.y;
    return cloned;
  }, [scene, cfg.height]);

  // Slow idle ±18° yaw sway — real depth lets us go past the billboard ±8° clamp.
  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const phase = cfg.position[0] * 2.4;
    const sway =
      Math.sin(clock.elapsedTime * GLB_SWAY_SPEED + phase) * GLB_SWAY_AMP;
    g.rotation.y = cfg.rotation[1] + cfg.yawBias + sway;
  });

  const lightScale = cfg.glbUrl && cfg.glbUrl.includes("maxine") ? 0.55 : 1;
  return (
    <group
      ref={groupRef}
      position={[cfg.position[0], cfg.position[1], cfg.position[2]]}
      rotation={[cfg.rotation[0], cfg.rotation[1], cfg.rotation[2]]}
    >
      <primitive object={root} />
      <FootGrounding width={width} />
      <SlotLights height={cfg.height} intensityScale={lightScale} />
    </group>
  );
};

/** One loader slot: GLB when configured, else billboard. */
const CharacterSlot = ({ cfg }: { cfg: CharacterSlotConfig }) => {
  if (cfg.glbUrl) {
    return (
      <Suspense fallback={<CharacterBillboard cfg={cfg} />}>
        <CharacterGlb cfg={cfg} />
      </Suspense>
    );
  }
  return <CharacterBillboard cfg={cfg} />;
};

export const CharacterBillboards = () => (
  <group>
    <CharacterSlot cfg={CHARACTERS.maxine} />
    <CharacterSlot cfg={CHARACTERS.robot} />
  </group>
);

useTexture.preload?.(SOFT_SHADOW_URL);
if (CHARACTERS.robot.glbUrl) {
  useGLTF.preload(CHARACTERS.robot.glbUrl, DRACO_PATH, true);
}
if (CHARACTERS.maxine.glbUrl) {
  useGLTF.preload(CHARACTERS.maxine.glbUrl, DRACO_PATH, true);
}
