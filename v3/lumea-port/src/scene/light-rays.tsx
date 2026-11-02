import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { RAYS } from "./scene-config";
import { useRaysStore } from "./rays-store";

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  // Bright near the top (source), fading down; soft Gaussian across the width.
  float lengthFade = pow(clamp(vUv.y, 0.0, 1.0), 1.15) * smoothstep(0.0, 0.1, vUv.y);
  float across = exp(-pow((vUv.x - 0.5) * 3.8, 2.0));
  float a = uOpacity * lengthFade * across;
  gl_FragColor = vec4(uColor * a, a);
}
`;

/**
 * Soft vertical light beam onto the emblem, billboarded around Y.
 * Dual planes (core + soft halo) so the shaft reads in stills like the reel.
 */
export const LightRays = () => {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.ShaderMaterial>(null);
  const softRef = useRef<THREE.ShaderMaterial>(null);

  const coreUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(RAYS.color) },
      uOpacity: { value: RAYS.opacity },
    }),
    [],
  );
  const softUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(RAYS.color) },
      uOpacity: { value: RAYS.opacity * 0.45 },
    }),
    [],
  );

  useFrame(({ camera }) => {
    const group = groupRef.current;
    if (!group) return;
    group.rotation.y = Math.atan2(
      camera.position.x - group.position.x,
      camera.position.z - group.position.z,
    );

    const s = useRaysStore.getState();
    if (coreRef.current) {
      coreRef.current.uniforms.uColor.value.set(s.color);
      coreRef.current.uniforms.uOpacity.value = s.opacity;
    }
    if (softRef.current) {
      softRef.current.uniforms.uColor.value.set(s.color);
      softRef.current.uniforms.uOpacity.value = s.opacity * 0.45;
    }
  });

  return (
    <group ref={groupRef} position={[...RAYS.position]}>
      <mesh position-y={-RAYS.length / 2} renderOrder={-1}>
        <planeGeometry args={[RAYS.width, RAYS.length]} />
        <shaderMaterial
          ref={coreRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={coreUniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh position-y={-RAYS.length / 2} renderOrder={-1}>
        <planeGeometry args={[RAYS.width * 2.1, RAYS.length]} />
        <shaderMaterial
          ref={softRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={softUniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};
