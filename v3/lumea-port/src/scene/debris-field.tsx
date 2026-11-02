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
  quat: THREE.Quaternion;
  spinAxis: THREE.Vector3;
  spinRate: number;
  scale: number;
  offset: THREE.Vector3;
  velocity: THREE.Vector3;
  omega: number;
  iconIndex: number;
  aspect: number;
}

/**
 * Credit-themed floating objects (score chips, house, card, $, key, trend,
 * APPROVED) — same cursor-parting spring as the old rock field.
 */
export const DebrisField = () => {
  const groupRef = useRef<THREE.Group>(null);
  const urls = CREDIT_ICONS.map((c) => c.url);
  const textures = useTexture(urls) as THREE.Texture[];

  const materials = useMemo(() => {
    return textures.map((tex, i) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      tex.needsUpdate = true;
      return new THREE.MeshStandardMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.2,
        roughness: 0.35,
        metalness: 0.45,
        emissive: new THREE.Color(DEBRIS.emissiveColor),
        emissiveIntensity: DEBRIS.emissiveIntensity,
        envMapIntensity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
    });
  }, [textures]);

  const shards = useMemo<Shard[]>(() => {
    const rng = mulberry32(DEBRIS.seed);
    const { minScale, maxScale, spiral } = DEBRIS;
    const count = DEBRIS_COUNTS[deviceTier()];
    const angleStep = (spiral.turns * Math.PI * 2) / count;
    const euler = new THREE.Euler();
    const clear = DEBRIS.clearZone;
    const list: Shard[] = [];

    for (let i = 0; i < count; i += 1) {
      const t = i / count;
      let angle = i * angleStep + (rng() - 0.5) * spiral.angleJitter;
      let radius = spiral.radius + (rng() - 0.5) * spiral.radiusJitter;
      let y = spiral.yBottom + t * spiral.ySpan + (rng() - 0.5) * spiral.yJitter;
      const sizeRand = rng();
      const scale = minScale + sizeRand * (maxScale - minScale);
      const iconIndex = Math.floor(rng() * CREDIT_ICONS.length);
      const aspect = CREDIT_ICONS[iconIndex].aspect;

      if (sizeRand > 0.28) {
        radius = Math.max(
          radius,
          clear.minPushRadius * (sizeRand > 0.55 ? 1.0 : 0.85) + rng() * 1.2,
        );
        if (y > clear.yMin && y < clear.yMax) {
          if (sizeRand > 0.55) {
            y =
              rng() < 0.5
                ? clear.yMin - 0.4 - rng() * 1.8
                : clear.yMax + 0.3 + rng() * 1.5;
          } else {
            radius = Math.max(radius, clear.minPushRadius * 0.9 + rng() * 1.4);
          }
        }
      }

      let x = Math.cos(angle) * radius;
      let z = Math.sin(angle) * radius + spiral.zCenter;
      const radial = Math.hypot(x, z - spiral.zCenter);
      if (
        scale > (minScale + maxScale) * 0.45 &&
        y > clear.yMin &&
        y < clear.yMax &&
        radial < clear.radius
      ) {
        const boost = clear.minPushRadius / Math.max(radial, 0.15);
        x *= boost;
        z = (z - spiral.zCenter) * boost + spiral.zCenter;
      }

      euler.set(rng() * 0.4 - 0.2, rng() * Math.PI * 2, rng() * 0.3 - 0.15);
      list.push({
        basePos: new THREE.Vector3(x, y, z),
        quat: new THREE.Quaternion().setFromEuler(euler),
        spinAxis: new THREE.Vector3(
          rng() * 2 - 1,
          rng() * 2 - 1,
          rng() * 2 - 1,
        ).normalize(),
        spinRate: (rng() * 2 - 1) * DEBRIS.selfSpin,
        scale,
        offset: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        omega:
          DEBRIS.repel.freqLight +
          sizeRand * (DEBRIS.repel.freqHeavy - DEBRIS.repel.freqLight),
        iconIndex,
        aspect,
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
      scale: new THREE.Vector3(),
      spin: new THREE.Quaternion(),
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

  useFrame(({ camera, pointer }, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const {
      repelRadius: radius,
      repelStrength: strength,
      spin: spinScale,
      drift,
    } = useDebrisStore.getState();

    group.rotation.y += drift * delta;
    group.updateWorldMatrix(true, false);

    tmp.raycaster.setFromCamera(pointer, camera);
    tmp.invMatrix.copy(group.matrixWorld).invert();
    tmp.localRay.copy(tmp.raycaster.ray).applyMatrix4(tmp.invMatrix);
    tmp.localRay.direction.normalize();

    const dt = Math.min(delta, 1 / 30);
    const zeta = DEBRIS.repel.damping;
    const active = radius > 0 && strength > 0 && hasPointer();

    shards.forEach((shard, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;
      tmp.spin.setFromAxisAngle(shard.spinAxis, shard.spinRate * spinScale * delta);
      shard.quat.multiply(tmp.spin);

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
      mesh.position.copy(tmp.pos);
      mesh.quaternion.copy(shard.quat);
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
