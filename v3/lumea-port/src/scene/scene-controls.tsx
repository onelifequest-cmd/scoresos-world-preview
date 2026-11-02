

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

import { useCameraStore } from "./camera-store";

/**
 * Dev-only free-look: when the panel's "orbit" toggle is on, OrbitControls take
 * over the camera (drag to orbit, scroll to dolly) and the CameraRig stands
 * down. The resulting position/target/fov are mirrored back into the store each
 * few frames, so the panel sliders and "copy values" reflect whatever you
 * framed by hand.
 */
export const SceneControls = () => {
  const free = useCameraStore((state) => state.free);
  const controls = useRef<OrbitControlsImpl>(null);
  const frame = useRef(0);

  useFrame(({ camera }) => {
    if (!free) return;
    const store = useCameraStore.getState();
    store.setLive(camera.position.x, camera.position.y, camera.position.z);

    frame.current += 1;
    if (frame.current % 4 === 0 && controls.current) {
      const target = controls.current.target;
      store.setControls({
        posX: camera.position.x,
        posY: camera.position.y,
        posZ: camera.position.z,
        targetX: target.x,
        targetY: target.y,
        targetZ: target.z,
        ...(camera instanceof THREE.PerspectiveCamera
          ? { fov: camera.fov }
          : {}),
      });
    }
  });

  if (!free) return null;

  return <OrbitControls ref={controls} makeDefault enableDamping />;
};
