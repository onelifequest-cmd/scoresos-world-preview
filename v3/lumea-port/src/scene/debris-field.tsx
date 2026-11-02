import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

import { CREDIT_ICONS, DEBRIS, MASK_LAYER, OCCLUDER_LAYER } from "./scene-config";
import { DEBRIS_COUNTS, deviceTier } from "./device";
import { hasPointer } from "./pointer-state";
import { useDebrisStore } from "./debris-store";

const mulberry32 = (seed: number) => {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

interface Shard {
  basePos: THREE.Vector3;
  /** Rest tilt (radians) so icons aren't perfectly flat to camera. */
  tiltX: number;
  tiltZ: number;
  spinRate: number;
  scale: number;
  offset: THREE.Vector3;
  velocity: THREE.Vector3;
  omega: number;
  iconIndex: number;
  aspect: number;
  phase: number;
}

/**
 * Credit-themed floating objects — mid-size, edge/mid-depth, soft-billboarded
 * so chips/houses/APPROVED stay identifiable. Cursor-parting spring retained.
 */
export const DebrisField = () => {
  const groupRef = useRef<THREE.Group>(null);
  const urls = CREDIT_ICONS.map((c) => c.url);
  const textures = useTexture(urls) as THREE.Texture[];

  const materials = useMemo(() => {
    return textures.map((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      // Bright gold/emerald glass read — MeshStandard + strong emissive so
      // icons stay visible even under the shaft grade.
      return new THREE.MeshStandardMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.15,
        roughness: 0.28,
        metalness: 0.55,
        color: new THREE.Color("#fff8e8"),
        emissive: new THREE.Color(DEBRIS.emissiveColor),
        emissiveIntensity: DEBRIS.emissiveIntensity,
        envMapIntensity: 1.2,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: true,
      });
    });
  }, [textures]);

  const shards = useMemo<Shard[]>(() => {
    const rng = mulberry32(DEBRIS.seed);
    const { minScale, maxScale, spiral } = DEBRIS;
    const count = DEBRIS_COUNTS[deviceTier()];
    const angleStep = (spiral.turns * Math.PI * 2) / Math.max(count, 1);
    const clear = DEBRIS.clearZone;
    const list: Shard[] = [];

    // Prefer a curated icon mix so ≥6 types read in a still.
    const prefer = [0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 4, 11]; // chips, house, card, $, key, trend, APPROVED, up, check

    for (let i = 0; i < count; i += 1) {
      const t = i / Math.max(count - 1, 1);
      let angle = i * angleStep + (rng() - 0.5) * spiral.angleJitter;
      // Bias to left/right frame edges (near ±X in content space after rotation).
      const edgeBias = i % 2 === 0 ? 1 : -1;
      let radius =
        spiral.radius +
        (rng() - 0.5) * spiral.radiusJitter +
        0.35 * Math.abs(Math.sin(angle));
      let y =
        spiral.yBottom + t * spiral.ySpan + (rng() - 0.5) * spiral.yJitter;
      // Keep most floaters mid-height (readable beside the pair).
      if (y < 0.3) y = 0.35 + rng() * 1.2;
      if (y > 3.6) y = 2.2 + rng() * 1.0;

      const sizeRand = 0.35 + rng() * 0.65;
      const scale = minScale + sizeRand * (maxScale - minScale);
      const iconIndex = prefer[i % prefer.length];
      const aspect = CREDIT_ICONS[iconIndex].aspect;

      let x = Math.cos(angle) * radius * (0.85 + 0.25 * edgeBias * (rng() - 0.3));
      let z = Math.sin(angle) * radius + spiral.zCenter;

      // Push out of the character/gauge clear column.
      const radial = Math.hypot(x, z - spiral.zCenter);
      if (y > clear.yMin && y < clear.yMax && radial < clear.radius) {
        const boost = clear.minPushRadius / Math.max(radial, 0.2);
        x *= boost;
        z = (z - spiral.zCenter) * boost + spiral.zCenter;
      }
      // Extra horizontal push so they sit near frame edges (not over headline).
      if (Math.abs(x) < 2.15) {
        x += Math.sign(x || edgeBias) * (2.15 - Math.abs(x) + rng() * 0.35);
      }
      // Keep left-side floaters from covering the Score OS column (screen-left).
      if (x < -1.1 && y > 1.4 && y < 2.8) {
        x = -2.2 - rng() * 0.6;
      }

      list.push({
        basePos: new THREE.Vector3(x, y, z),
        tiltX: (rng() - 0.5) * 0.25,
        tiltZ: (rng() - 0.5) * 0.2,
        spinRate: (rng() * 2 - 1) * DEBRIS.selfSpin,
        scale,
        offset: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        omega:
          DEBRIS.repel.freqLight +
          sizeRand * (DEBRIS.repel.freqHeavy - DEBRIS.repel.freqLight),
        iconIndex,
        aspect,
        phase: rng() * Math.PI * 2,
      });
    }
    return list;
  }, []);

  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const tmp = useMemo(
    () => ({
      raycaster: new THREE.Raycaster(),
      invMatrix: new THREE.Matrix4(),
      localRay: new THREE.Ray(),
      toShard: new THREE.Vector3(),
      closest: new THREE.Vector3(),
      perp: new THREE.Vector3(),
      push: new THREE.Vector3(),
      accel: new THREE.Vector3(),
      pos: new THREE.Vector3(),
      localCam: new THREE.Vector3(),
      look: new THREE.Quaternion(),
      tilt: new THREE.Euler(),
      spin: new THREE.Quaternion(),
      mat4: new THREE.Matrix4(),
    }),
    [],
  );

  useLayoutEffect(() => {
    shards.forEach((_, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;
      mesh.layers.enable(MASK_LAYER);
      mesh.layers.enable(OCCLUDER_LAYER);
    });
  }, [shards]);

  useFrame(({ camera, pointer, clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const {
      repelRadius: radius,
      repelStrength: strength,
      spin: spinScale,
      drift,
    } = useDebrisStore.getState();

    group.rotation.y += drift * delta * 0.65;
    group.updateWorldMatrix(true, false);

    tmp.raycaster.setFromCamera(pointer, camera);
    tmp.invMatrix.copy(group.matrixWorld).invert();
    tmp.localRay.copy(tmp.raycaster.ray).applyMatrix4(tmp.invMatrix);
    tmp.localRay.direction.normalize();
    tmp.localCam.copy(camera.position).applyMatrix4(tmp.invMatrix);

    const dt = Math.min(delta, 1 / 30);
    const zeta = DEBRIS.repel.damping;
    const active = radius > 0 && strength > 0 && hasPointer();
    const t = clock.getElapsedTime();

    shards.forEach((shard, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;

      // Slow orbit bob
      const bob = Math.sin(t * 0.55 + shard.phase) * 0.06;

      tmp.push.setScalar(0);
      if (active) {
        tmp.toShard.subVectors(shard.basePos, tmp.localRay.origin);
        const along = tmp.toShard.dot(tmp.localRay.direction);
        if (along > 0) {
          tmp.closest
            .copy(tmp.localRay.direction)
            .multiplyScalar(along)
            .add(tmp.localRay.origin);
          tmp.perp.subVectors(shard.basePos, tmp.closest);
          const d = tmp.perp.length();
          if (d > 1e-3 && d < radius) {
            const f = 1 - d / radius;
            const falloff = f * f * (3 - 2 * f);
            tmp.push.copy(tmp.perp).multiplyScalar((strength * falloff) / d);
          }
        }
      }

      const omega = shard.omega;
      tmp.accel
        .copy(shard.offset)
        .sub(tmp.push)
        .multiplyScalar(-omega * omega)
        .addScaledVector(shard.velocity, -2 * zeta * omega);
      shard.velocity.addScaledVector(tmp.accel, dt);
      shard.offset.addScaledVector(shard.velocity, dt);

      tmp.pos.copy(shard.basePos).add(shard.offset);
      tmp.pos.y += bob;
      mesh.position.copy(tmp.pos);

      // Soft billboard toward camera (world) + mild rest tilt + slow spin
      mesh.lookAt(camera.position);
      tmp.tilt.set(
        shard.tiltX,
        0,
        shard.tiltZ + t * shard.spinRate * spinScale * 0.35,
      );
      tmp.spin.setFromEuler(tmp.tilt);
      mesh.quaternion.multiply(tmp.spin);

      const h = shard.scale;
      mesh.scale.set(h * shard.aspect, h, 1);
    });
  });

  return (
    <group ref={groupRef}>
      {shards.map((shard, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshRefs.current[i] = el;
          }}
          material={materials[shard.iconIndex]}
          castShadow
        >
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </group>
  );
};
