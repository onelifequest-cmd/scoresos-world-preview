

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import {
  DEBRIS,
  DRACO_PATH,
  MASK_LAYER,
  OCCLUDER_LAYER,
  ROCKS_URL,
} from "./scene-config";
import { DEBRIS_COUNTS, deviceTier } from "./device";
import { hasPointer } from "./pointer-state";
import { useDebrisStore } from "./debris-store";

/** Deterministic PRNG so the spiral layout is identical on every load. */
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
  /** Accumulating orientation — spun on `spinAxis` at `spinRate` each frame. */
  quat: THREE.Quaternion;
  spinAxis: THREE.Vector3;
  spinRate: number;
  scale: number;
  /** Current cursor-push displacement (spring-damped back to zero). */
  offset: THREE.Vector3;
  /** Velocity of `offset` — the momentum that makes the rock feel heavy. */
  velocity: THREE.Vector3;
  /** Natural frequency of the spring (∝ 1/size): big rocks are slower = heavier. */
  omega: number;
}

type MeshRef = { current: THREE.InstancedMesh | null };

/**
 * The user's rocks (rocks.glb) wound onto a vertical spiral, one InstancedMesh
 * per geometry. The whole field spins slowly, and each rock is pushed away from
 * the cursor (a ray cast into the field), springing back when the cursor leaves.
 */
export const DebrisField = () => {
  const { scene } = useGLTF(ROCKS_URL, DRACO_PATH);
  const groupRef = useRef<THREE.Group>(null);
  const gl = useThree((state) => state.gl);

  // Rock geometries (sorted for a stable mapping) + one shared, emissive-lifted,
  // anisotropically-filtered material.
  const { geometries, material } = useMemo(() => {
    const found: { name: string; geometry: THREE.BufferGeometry }[] = [];
    let source: THREE.Material | null = null;
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        found.push({ name: object.name, geometry: object.geometry });
        if (!source) source = object.material as THREE.Material;
      }
    });
    found.sort((a, b) => a.name.localeCompare(b.name));

    const debrisMaterial = (source as THREE.Material | null)?.clone();
    if (debrisMaterial instanceof THREE.MeshStandardMaterial) {
      debrisMaterial.emissive = new THREE.Color(DEBRIS.emissiveColor);
      debrisMaterial.emissiveIntensity = DEBRIS.emissiveIntensity;
      if (debrisMaterial.map) {
        const map = debrisMaterial.map.clone();
        map.anisotropy = gl.capabilities.getMaxAnisotropy();
        map.needsUpdate = true;
        debrisMaterial.map = map;
      }
    }

    return {
      geometries: found.map((entry) => entry.geometry),
      material: debrisMaterial ?? new THREE.MeshStandardMaterial(),
    };
  }, [scene, gl]);

  // Build the helix and bucket each shard by geometry index.
  const perGeo = useMemo<Shard[][]>(() => {
    const result: Shard[][] = geometries.map(() => []);
    if (geometries.length === 0) return result;

    const rng = mulberry32(DEBRIS.seed);
    const { minScale, maxScale, spiral } = DEBRIS;
    // Fewer shards on the fill-bound tiers (read once at construction).
    const count = DEBRIS_COUNTS[deviceTier()];
    const angleStep = (spiral.turns * Math.PI * 2) / count;
    const euler = new THREE.Euler();

    for (let i = 0; i < count; i += 1) {
      const t = i / count;
      const angle = i * angleStep + (rng() - 0.5) * spiral.angleJitter;
      const radius = spiral.radius + (rng() - 0.5) * spiral.radiusJitter;
      const y = spiral.yBottom + t * spiral.ySpan + (rng() - 0.5) * spiral.yJitter;

      euler.set(rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2);
      const spinAxis = new THREE.Vector3(
        rng() * 2 - 1,
        rng() * 2 - 1,
        rng() * 2 - 1,
      ).normalize();
      const spinRate = (rng() * 2 - 1) * DEBRIS.selfSpin;
      const sizeRand = rng();
      const shard: Shard = {
        basePos: new THREE.Vector3(
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius + spiral.zCenter,
        ),
        quat: new THREE.Quaternion().setFromEuler(euler),
        spinAxis,
        spinRate,
        scale: minScale + sizeRand * (maxScale - minScale),
        offset: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        // Bigger rocks (higher sizeRand) get a lower natural frequency → heavier.
        omega:
          DEBRIS.repel.freqLight +
          sizeRand * (DEBRIS.repel.freqHeavy - DEBRIS.repel.freqLight),
      };
      result[Math.floor(rng() * geometries.length)].push(shard);
    }

    return result;
  }, [geometries]);

  const meshRefs = useMemo<MeshRef[]>(
    () => geometries.map(() => ({ current: null })),
    [geometries],
  );

  // Reusable temporaries.
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
      matrix: new THREE.Matrix4(),
      spin: new THREE.Quaternion(),
    }),
    [],
  );

  useLayoutEffect(() => {
    perGeo.forEach((shards, gi) => {
      const mesh = meshRefs[gi].current;
      if (!mesh) return;
      mesh.layers.enable(MASK_LAYER);
      mesh.layers.enable(OCCLUDER_LAYER);
      shards.forEach((shard, i) => {
        tmp.matrix.compose(shard.basePos, shard.quat, tmp.scale.setScalar(shard.scale));
        mesh.setMatrixAt(i, tmp.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [perGeo, meshRefs, tmp]);

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

    // The cursor ray, expressed in the field's LOCAL space so it lines up with
    // each shard's rest position (basePos). Repulsion keys off a shard's
    // perpendicular distance to this ray — i.e. how close it is to the cursor ON
    // SCREEN, at ANY depth — so the rocks under the pointer part smoothly and
    // distant ones stay put, instead of depending on a single fixed-depth point.
    tmp.raycaster.setFromCamera(pointer, camera);
    tmp.invMatrix.copy(group.matrixWorld).invert();
    tmp.localRay.copy(tmp.raycaster.ray).applyMatrix4(tmp.invMatrix);
    tmp.localRay.direction.normalize();

    // Damped-oscillator integration. dt is clamped so a dropped frame (e.g. tab
    // refocus) can't blow the integrator up.
    const dt = Math.min(delta, 1 / 30);
    const zeta = DEBRIS.repel.damping;
    // Gate on hasPointer: before the first real move the cursor is NDC (0,0) —
    // dead centre — so an ungated field would punch a hole through the middle on
    // touch devices and untouched loads. Off entirely on the mobile tier.
    const active = radius > 0 && strength > 0 && hasPointer();

    perGeo.forEach((shards, gi) => {
      const mesh = meshRefs[gi].current;
      if (!mesh) return;
      shards.forEach((shard, i) => {
        // Per-rock tumble on its own axis (speed scaled live from the panel).
        tmp.spin.setFromAxisAngle(shard.spinAxis, shard.spinRate * spinScale * delta);
        shard.quat.multiply(tmp.spin);

        // Target push: radially away from the cursor ray, magnitude bounded by
        // `strength` (no 1/d spike) and faded to zero at the radius edge with a
        // smoothstep, so every affected rock eases rather than snapping.
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

        // Mass-normalized damped oscillator toward the target (semi-implicit
        // Euler):  accel = −ω²·(offset − target) − 2ζω·velocity
        // Low ω (esp. big rocks) + underdamped ζ → the rock is slow to get moving,
        // carries momentum, overshoots, and settles heavily instead of snapping.
        const omega = shard.omega;
        tmp.accel
          .copy(shard.offset)
          .sub(tmp.push)
          .multiplyScalar(-omega * omega)
          .addScaledVector(shard.velocity, -2 * zeta * omega);
        shard.velocity.addScaledVector(tmp.accel, dt);
        shard.offset.addScaledVector(shard.velocity, dt);

        tmp.pos.copy(shard.basePos).add(shard.offset);
        tmp.matrix.compose(tmp.pos, shard.quat, tmp.scale.setScalar(shard.scale));
        mesh.setMatrixAt(i, tmp.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <group ref={groupRef}>
      {geometries.map((geometry, gi) => (
        <instancedMesh
          key={gi}
          ref={meshRefs[gi]}
          args={[geometry, material, perGeo[gi].length]}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
};

useGLTF.preload(ROCKS_URL, DRACO_PATH);
