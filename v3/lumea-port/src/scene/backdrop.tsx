

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { useBackdropStore } from "./backdrop-store";

const vertexShader = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uBottom;
uniform vec3 uGlow;
uniform float uGlowStrength;
uniform float uGlowSharpness;
uniform vec3 uGlowDir;
varying vec3 vDir;

void main() {
  float t = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 base = mix(uBottom, uTop, smoothstep(0.0, 1.0, t));
  float g = pow(max(dot(normalize(vDir), normalize(uGlowDir)), 0.0), uGlowSharpness);
  vec3 color = base + uGlow * (g * uGlowStrength);
  gl_FragColor = vec4(color, 1.0);
}
`;

/**
 * A large inward-facing sphere painted with a vertical gradient plus a soft top
 * glow (the light haze) — a volumetric backdrop instead of a flat clear colour.
 * All parameters are driven live from the backdrop store for tuning.
 */
export const Backdrop = () => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color() },
      uBottom: { value: new THREE.Color() },
      uGlow: { value: new THREE.Color() },
      uGlowStrength: { value: 0 },
      uGlowSharpness: { value: 1 },
      uGlowDir: { value: new THREE.Vector3(0, 1, 0) },
    }),
    [],
  );

  useFrame(() => {
    const material = materialRef.current;
    if (!material) return;
    const s = useBackdropStore.getState();
    const u = material.uniforms;
    u.uTop.value.set(s.topColor);
    u.uBottom.value.set(s.bottomColor);
    u.uGlow.value.set(s.glowColor);
    u.uGlowStrength.value = s.glowStrength;
    u.uGlowSharpness.value = s.glowSharpness;
    u.uGlowDir.value.set(0, s.glowY, s.glowZ);
  });

  return (
    <mesh scale={40} renderOrder={-2}>
      <sphereGeometry args={[1, 32, 32]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  );
};
