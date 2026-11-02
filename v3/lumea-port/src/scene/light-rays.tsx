
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
  float lengthFade = pow(clamp(vUv.y, 0.0, 1.0), 1.3) * smoothstep(0.0, 0.12, vUv.y);
  float across = exp(-pow((vUv.x - 0.5) * 4.5, 2.0));
  gl_FragColor = vec4(uColor, uOpacity * lengthFade * across);
}
`;

/**
 * One soft vertical light beam onto the monk, billboarded to face the camera.
 *
 * It renders as a BACKGROUND element: `transparent:false` + `renderOrder -1`
 * puts it in the opaque queue AFTER the backdrop (renderOrder -2) and BEFORE the
 * solid geometry (renderOrder 0), so every opaque object (figure, pedestal,
 * rocks) cleanly draws over it. The beam is therefore always behind them and can
 * never cut a hard seam into the geometry — no depth pre-pass, no intersection
 * artifacts at any orbit angle.
 */
export const LightRays = () => {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(RAYS.color) },
      uOpacity: { value: RAYS.opacity },
    }),
    [],
  );

  useFrame(({ camera }) => {
    const group = groupRef.current;
    if (!group) return;
    // Billboard around Y so the beam stays the same broad vertical shaft.
    group.rotation.y = Math.atan2(
      camera.position.x - group.position.x,
      camera.position.z - group.position.z,
    );

    // Live colour + opacity from the panel (read via the material ref, so the
    // scene graph never re-renders on a tweak).
    const material = materialRef.current;
    if (material) {
      const s = useRaysStore.getState();
      material.uniforms.uColor.value.set(s.color);
      material.uniforms.uOpacity.value = s.opacity;
    }
  });

  return (
    <group ref={groupRef} position={[...RAYS.position]}>
      <mesh position-y={-RAYS.length / 2} renderOrder={-1}>
        <planeGeometry args={[RAYS.width, RAYS.length]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent={false}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};
