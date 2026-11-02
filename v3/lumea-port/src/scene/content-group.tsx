

import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { useContentStore } from "./content-store";

/**
 * Wraps the whole scene content (monk, base rock, debris, lights) in one group
 * whose transform is driven by the content store, so the entire composition can
 * be moved / rotated / scaled together from the panel. Read off the store each
 * frame via getState() (no re-subscription).
 */
export const ContentGroup = ({ children }: { children: ReactNode }) => {
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    const group = ref.current;
    if (!group) return;
    const c = useContentStore.getState();
    group.position.set(c.posX, c.posY, c.posZ);
    group.rotation.y = c.rotationY;
    group.scale.setScalar(c.scale);
  });

  return <group ref={ref}>{children}</group>;
};
