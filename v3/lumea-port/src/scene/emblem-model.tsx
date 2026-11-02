import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";

import {
  DIAL_URL,
  DRACO_PATH,
  EMBLEM,
  EMBLEM_URL,
  GAUGE,
  MODEL_URL,
  MONK,
  OCCLUDER_LAYER,
  SOFT_SHADOW_URL,
  scoreToNeedleAngle,
} from "./scene-config";
import { getCompositionVariant, type CompositionVariant } from "./composition";
import { useRingStore } from "./ring-store";

interface RingEntry {
  material: THREE.MeshStandardMaterial;
  secondary: boolean;
}

const GOLD = "#e8c96a";
const GOLD_DEEP = "#b8923a";

function applyPlanarDialUVs(geometry: THREE.BufferGeometry) {
  const pos = geometry.attributes.position;
  if (!pos) return;
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox!;
  const sx = Math.max(bb.max.x - bb.min.x, 1e-6);
  const sy = Math.max(bb.max.y - bb.min.y, 1e-6);
  const span = Math.max(sx, sy);
  const cx = (bb.min.x + bb.max.x) * 0.5;
  const cy = (bb.min.y + bb.max.y) * 0.5;
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    uvs[i * 2] = (x - cx) / span + 0.5;
    uvs[i * 2 + 1] = (y - cy) / span + 0.5;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.attributes.uv.needsUpdate = true;
}

/** Ease-out cubic for the needle climb. */
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Short gold pointer — hub below dial center; tip reaches the colored arc
 * without crossing the big 742 numeral.
 */
const GaugeNeedle = ({
  scale,
  colorMode = "solid",
}: {
  scale: number;
  colorMode?: "solid" | "holo";
}) => {
  const pivot = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const start = useRef<number | null>(null);

  useFrame(({ clock }) => {
    if (start.current === null) start.current = clock.getElapsedTime();
    const elapsed = clock.getElapsedTime() - start.current;
    const u = Math.min(1, elapsed / GAUGE.climbDuration);
    const score =
      GAUGE.startScore +
      (GAUGE.restScore - GAUGE.startScore) * easeOutCubic(u);
    const angle = scoreToNeedleAngle(score);
    if (pivot.current) pivot.current.rotation.z = angle;

    // Gold → emerald as it climbs into the good zone.
    if (matRef.current) {
      const good = Math.min(
        1,
        Math.max(0, (score - 650) / (GAUGE.restScore - 650)),
      );
      matRef.current.color.setRGB(
        0.91 * (1 - good) + 0.24 * good,
        0.79 * (1 - good) + 0.6 * good,
        0.42 * (1 - good) + 0.45 * good,
      );
      matRef.current.emissive.setRGB(
        0.35 * (1 - good) + 0.05 * good,
        0.22 * (1 - good) + 0.45 * good,
        0.05 * (1 - good) + 0.28 * good,
      );
      matRef.current.emissiveIntensity = 0.35 + good * 0.85;
    }
  });

  const isHolo = colorMode === "holo";
  const len = GAUGE.length * scale;
  const thick = GAUGE.thickness * scale;

  return (
    <group
      ref={pivot}
      position={[0, GAUGE.hubY * scale, 0.04 * scale]}
    >
      {/* Short pointer along +Y in local (rotated by Z) */}
      <mesh position={[0, len * 0.42, 0]} castShadow>
        <boxGeometry args={[thick, len * 0.72, thick * 0.55]} />
        <meshStandardMaterial
          ref={matRef}
          color={GOLD}
          metalness={isHolo ? 0.2 : 0.95}
          roughness={isHolo ? 0.25 : 0.22}
          transparent={isHolo}
          opacity={isHolo ? 0.85 : 1}
          emissive={GOLD_DEEP}
          emissiveIntensity={0.4}
          toneMapped={!isHolo}
        />
      </mesh>
      {/* Tip wedge */}
      <mesh position={[0, len * 0.78, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[thick * 0.85, len * 0.18, 4]} />
        <meshStandardMaterial
          color={GOLD}
          metalness={isHolo ? 0.2 : 1}
          roughness={0.2}
          transparent={isHolo}
          opacity={isHolo ? 0.9 : 1}
          emissive="#2a6b52"
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Hub disc */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[thick * 1.4, thick * 1.4, thick * 0.6, 20]} />
        <meshStandardMaterial
          color={GOLD_DEEP}
          metalness={1}
          roughness={0.18}
          transparent={isHolo}
          opacity={isHolo ? 0.8 : 1}
        />
      </mesh>
    </group>
  );
};

/** Translucent emerald/gold hologram gauge projected near the robot (mode B). */
const HologramGauge = ({ dialTex }: { dialTex: THREE.Texture }) => {
  const group = useRef<THREE.Group>(null);
  const mat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: dialTex,
        color: new THREE.Color("#b8ffe0"),
        transparent: true,
        opacity: 0.78,
        metalness: 0.05,
        roughness: 0.2,
        emissive: new THREE.Color("#1f6b4e"),
        emissiveIntensity: 0.7,
        transmission: 0.15,
        thickness: 0.1,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    [dialTex],
  );

  useFrame(({ clock, camera }) => {
    const g = group.current;
    if (!g || !g.parent) return;
    // Soft flicker + face camera (content-local −Z hemisphere)
    const pulse = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 3.2);
    mat.opacity = 0.62 + pulse * 0.22;
    mat.emissiveIntensity = 0.85 + pulse * 0.45;
    const inv = new THREE.Matrix4().copy(g.parent.matrixWorld).invert();
    const localCam = camera.position.clone().applyMatrix4(inv);
    const yaw = Math.atan2(localCam.x - g.position.x, localCam.z - g.position.z);
    const BASE = Math.PI;
    let delta = yaw - BASE;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    const target = BASE + THREE.MathUtils.clamp(delta, -0.7, 0.7);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, target, 0.1);
  });

  const d = 0.72;
  return (
    <group
      ref={group}
      // Toward robot (+X), chest height — reads as projection from robot
      position={[0.22, 1.72, 0.38]}
      rotation={[0, Math.PI, 0]}
    >
      {/* Soft projection beam from robot shoulder toward hologram */}
      <mesh position={[0.18, -0.05, -0.12]} rotation={[0.2, 0, -0.35]}>
        <coneGeometry args={[0.28, 0.7, 16, 1, true]} />
        <meshBasicMaterial
          color="#3d9a72"
          transparent
          opacity={0.12}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <circleGeometry args={[d * 0.5, 64]} />
        <primitive object={mat} attach="material" />
      </mesh>
      {/* Gold rim ring */}
      <mesh>
        <torusGeometry args={[d * 0.5, 0.018, 12, 64]} />
        <meshStandardMaterial
          color={GOLD}
          emissive="#2a6b52"
          emissiveIntensity={0.6}
          metalness={0.4}
          roughness={0.3}
          transparent
          opacity={0.75}
          toneMapped={false}
        />
      </mesh>
      <GaugeNeedle scale={d * 0.55} colorMode="holo" />
      <pointLight
        color="#3d9a72"
        intensity={4.5}
        distance={2.2}
        decay={2}
        position={[0, 0, 0.2]}
      />
    </group>
  );
};

/**
 * Score OS emblem — physical medallion (mode A) or robot hologram (mode B),
 * plus Lumea halo toruses. Animated needle climbs to 742.
 */
export const EmblemModel = () => {
  const variant = useMemo<CompositionVariant>(() => getCompositionVariant(), []);
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
        // v3g9: raise the TOP halo (Torus @ y≈1.61) just above full-body
        // heads (~1.92 content-local) so it crowns the pair. Bottom halo
        // (Torus.002 @ y≈-0.09) stays around the pillar.
        if (object.name === "Torus" && !object.name.includes("002")) {
          object.position.y = 2.42;
        }
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
        object.material = new THREE.MeshPhysicalMaterial({
          map: dialTex,
          color: new THREE.Color(0.78, 0.92, 0.84),
          metalness: 0.05,
          roughness: 0.36,
          clearcoat: 0.95,
          clearcoatRoughness: 0.12,
          envMapIntensity: 0.9,
          toneMapped: true,
        });
      } else if (name === "glass" || object.name === "Glass") {
        object.material = new THREE.MeshPhysicalMaterial({
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
      } else if (
        name.includes("gold") ||
        object.name === "Bezel" ||
        object.name === "Lip"
      ) {
        object.material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(name.includes("bright") ? GOLD : GOLD_DEEP),
          metalness: 1,
          roughness: 0.18,
          clearcoat: 0.7,
          clearcoatRoughness: 0.08,
          envMapIntensity: 1.7,
          emissive: new THREE.Color("#1a4a38"),
          emissiveIntensity: 0.14,
        });
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
    if (!c || !c.parent || variant !== "a") return;
    c.parent.updateWorldMatrix(true, false);
    tmp.inv.copy(c.parent.matrixWorld).invert();
    tmp.localCam.copy(camera.position).applyMatrix4(tmp.inv);
    const yaw = Math.atan2(
      tmp.localCam.x - c.position.x,
      tmp.localCam.z - c.position.z,
    );
    const sway =
      Math.sin(clock.getElapsedTime() * EMBLEM.swaySpeed) * EMBLEM.swayAmp;
    c.rotation.y = yaw + sway;
  });

  const shadowY = 0.515;
  const needleScale = EMBLEM.diameter / 2.344;

  return (
    <group
      ref={groupRef}
      position={[MONK.position[0], MONK.position[1], MONK.position[2]]}
      rotation-y={MONK.rotationY}
    >
      <Environment preset="warehouse" environmentIntensity={0.4} />
      <primitive object={ringsRoot} />

      {variant === "a" && (
        <group
          ref={coinRef}
          position={[EMBLEM.position[0], EMBLEM.position[1], EMBLEM.position[2]]}
        >
          <primitive object={coin} />
          <GaugeNeedle scale={needleScale * 1.15} />
          {/* Soft glow under floating medallion */}
          <pointLight
            color="#c9a24a"
            intensity={3.5}
            distance={2.5}
            decay={2}
            position={[0, -0.15, 0.2]}
          />
          <pointLight
            color="#3d9a72"
            intensity={2.2}
            distance={2.2}
            decay={2}
            position={[0, 0.1, 0.3]}
          />
        </group>
      )}

      {variant === "b" && <HologramGauge dialTex={dialTex} />}

      {/* Soft radial contact blob on pillar crown (under characters) */}
      <mesh
        position={[0, shadowY + 0.001, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={-1}
      >
        <planeGeometry args={[1.35, 1.0]} />
        <meshBasicMaterial
          map={softShadowTex}
          transparent
          opacity={0.5}
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
