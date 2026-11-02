

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { CAMERA } from "./scene-config";
import { useCameraStore } from "./camera-store";
import { hasPointer } from "./pointer-state";

/**
 * Drives the default camera each frame from the camera store:
 *  - free      → OrbitControls own it (rig stands down)
 *  - autoOrbit → circles the model at a fixed radius/height, looking at it
 *  - otherwise → static from the panel sliders, with optional sway/parallax
 * A dutch-tilt roll is applied after lookAt (which would otherwise level the
 * horizon). The camera is read off the per-frame state, not a hook, so mutating
 * it is lint-clean.
 */
export const CameraRig = () => {
  const orbitTarget = useMemo(() => new THREE.Vector3(...CAMERA.orbit.lookAt), []);
  const staticTarget = useMemo(() => new THREE.Vector3(), []);
  const parallax = useRef(new THREE.Vector2(0, 0));

  useFrame(({ camera, clock, pointer }) => {
    const c = useCameraStore.getState();
    if (c.free) return;

    const t = clock.elapsedTime;

    if (c.autoOrbit) {
      // Low-pass the pointer so cursor-driven rotation glides in/out. Gated on
      // hasPointer so it stays put on mobile / before the first move (no drift
      // toward NDC (0,0)).
      const smooth = parallax.current;
      const px = hasPointer() ? pointer.x : 0;
      const py = hasPointer() ? pointer.y : 0;
      smooth.x += (px - smooth.x) * CAMERA.pointerOrbit.ease;
      smooth.y += (py - smooth.y) * CAMERA.pointerOrbit.ease;

      const angle =
        CAMERA.orbit.azimuth +
        t * c.orbitSpeed +
        smooth.x * CAMERA.pointerOrbit.azimuth;
      camera.position.set(
        CAMERA.orbit.pivotX + Math.cos(angle) * CAMERA.orbit.radius,
        CAMERA.orbit.height + smooth.y * CAMERA.pointerOrbit.height,
        CAMERA.orbit.pivotZ + Math.sin(angle) * CAMERA.orbit.radius,
      );
      camera.lookAt(orbitTarget);
      camera.rotation.z += c.roll;
    } else {
      const sway = parallax.current;
      const swayX = c.sway ? Math.sin(t * CAMERA.swaySpeedX) * CAMERA.swayX : 0;
      const swayY = c.sway ? Math.sin(t * CAMERA.swaySpeedY) * CAMERA.swayY : 0;
      const px = c.parallax ? pointer.x : 0;
      const py = c.parallax ? pointer.y : 0;
      sway.x += (px - sway.x) * CAMERA.parallaxEase;
      sway.y += (py - sway.y) * CAMERA.parallaxEase;

      camera.position.set(
        c.posX + swayX + sway.x * CAMERA.parallaxX,
        c.posY + swayY + sway.y * CAMERA.parallaxY,
        c.posZ,
      );
      staticTarget.set(c.targetX, c.targetY, c.targetZ);
      camera.lookAt(staticTarget);
      camera.rotation.z += c.roll;
    }

    if (camera instanceof THREE.PerspectiveCamera && camera.fov !== c.fov) {
      camera.fov = c.fov;
      camera.updateProjectionMatrix();
    }

    c.setLive(camera.position.x, camera.position.y, camera.position.z);
  });

  return null;
};
