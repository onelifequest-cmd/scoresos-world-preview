

import { create } from "zustand";

import { CAMERA } from "./scene-config";

/** The tunable camera parameters exposed by the settings panel. */
export interface CameraControls {
  posX: number;
  posY: number;
  posZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  fov: number;
  roll: number;
  /** Auto-orbit the camera around the model. */
  autoOrbit: boolean;
  /** Orbit speed, rad/s. */
  orbitSpeed: number;
  /** Idle sway on/off (static mode only). */
  sway: boolean;
  /** Pointer parallax on/off (static mode only). */
  parallax: boolean;
  /** Dev-only free-look: hand OrbitControls the camera to frame it by dragging. */
  free: boolean;
}

interface CameraStore extends CameraControls {
  /** Live world position of the camera each frame (incl. sway/parallax). */
  liveX: number;
  liveY: number;
  liveZ: number;
  setControls: (patch: Partial<CameraControls>) => void;
  setLive: (x: number, y: number, z: number) => void;
  reset: () => void;
}

const initialControls: CameraControls = {
  posX: CAMERA.position[0],
  posY: CAMERA.position[1],
  posZ: CAMERA.position[2],
  targetX: CAMERA.target[0],
  targetY: CAMERA.target[1],
  targetZ: CAMERA.target[2],
  fov: CAMERA.fov,
  roll: CAMERA.roll,
  autoOrbit: true,
  orbitSpeed: CAMERA.orbit.speed,
  sway: false,
  parallax: false,
  free: false,
};

export const useCameraStore = create<CameraStore>((set) => ({
  ...initialControls,
  liveX: initialControls.posX,
  liveY: initialControls.posY,
  liveZ: initialControls.posZ,
  setControls: (patch) => set(patch),
  setLive: (x, y, z) => set({ liveX: x, liveY: y, liveZ: z }),
  reset: () => set({ ...initialControls }),
}));
