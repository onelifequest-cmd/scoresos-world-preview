

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { PARTICLE_COUNTS, deviceTier } from "./device";
import { PARTICLES } from "./scene-config";

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

const vertexShader = /* glsl */ `
attribute float phase;
attribute float bright;
uniform float uTime;
uniform float uSize;
uniform float uDrift;
varying float vBright;

void main() {
  vBright = bright;
  vec3 p = position;
  p.y += sin(uTime * uDrift + phase) * 0.35;
  p.x += cos(uTime * uDrift * 0.7 + phase * 1.3) * 0.25;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  // Keep a min size well above 1px: sub-pixel points twinkle/flicker in motion.
  gl_PointSize = clamp(uSize * (220.0 / -mv.z), 2.0, 7.0);
  gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vBright;

void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float alpha = smoothstep(0.5, 0.0, d) * uOpacity * vBright;
  gl_FragColor = vec4(uColor, alpha);
}
`;

/**
 * A slow field of white dust motes drifting through the scene. Round soft points
 * (a ShaderMaterial discards outside the disc), seeded so the layout is stable,
 * with a gentle per-particle bob driven by a time uniform.
 */
export const DustParticles = () => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  // Fewer motes on the fill-bound tiers (read once at construction).
  const count = useMemo(() => PARTICLE_COUNTS[deviceTier()], []);

  const geometry = useMemo(() => {
    const rng = mulberry32(PARTICLES.seed);
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const brights = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = PARTICLES.center[0] + (rng() - 0.5) * PARTICLES.radius * 2;
      positions[i * 3 + 1] = PARTICLES.center[1] + (rng() - 0.5) * PARTICLES.height;
      positions[i * 3 + 2] = PARTICLES.center[2] + (rng() - 0.5) * PARTICLES.radius * 2;
      phases[i] = rng() * Math.PI * 2;
      // Varied brightness for depth, with a visible floor.
      brights[i] = 0.4 + Math.pow(rng(), 1.5) * 0.6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
    geo.setAttribute("bright", new THREE.BufferAttribute(brights, 1));
    return geo;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: PARTICLES.size * 4 },
      uDrift: { value: PARTICLES.driftSpeed },
      uColor: { value: new THREE.Color(PARTICLES.color) },
      uOpacity: { value: PARTICLES.opacity },
    }),
    [],
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
