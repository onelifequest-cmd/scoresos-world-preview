import { Suspense, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  Noise,
  SMAA,
  Vignette,
} from "@react-three/postprocessing";
import {
  BlendFunction,
  NoiseEffect,
  type EffectComposer as PostComposer,
} from "postprocessing";
import * as THREE from "three";

import { Backdrop } from "./backdrop";
import { CameraRig } from "./camera-rig";
import { ContentGroup } from "./content-group";
import { DebrisField } from "./debris-field";
import { MULTISAMPLING, clampedPixelRatio, deviceTier } from "./device";
import { DustParticles } from "./dust-particles";
import { FrameGate } from "./frame-gate";
import { LightRays } from "./light-rays";
import { Lighting } from "./lighting";
import {
  DispersionMaskRenderer,
  MaskedDispersion,
  type MaskedDispersionEffect,
} from "./masked-dispersion";
import { EmblemModel } from "./emblem-model";
import { BaseRock } from "./base-rock";
import { Prewarm } from "./prewarm";
import { usePostStore } from "./post-store";
import { CAMERA, FOG, POST } from "./scene-config";

const GrainControl = ({
  noiseRef,
}: {
  noiseRef: RefObject<NoiseEffect | null>;
}) => {
  useFrame(() => {
    const noise = noiseRef.current;
    if (noise) noise.blendMode.opacity.value = usePostStore.getState().grain;
  });
  return null;
};

/** Ported Lumea MonkScene — Score OS emblem hero. */
const MonkScene = () => {
  const dispersionRef = useRef<MaskedDispersionEffect | null>(null);
  const noiseRef = useRef<NoiseEffect | null>(null);
  const composerRef = useRef<PostComposer | null>(null);
  const tier = useMemo(() => deviceTier(), []);
  const isDesktop = tier === "desktop";
  const bloomIntensity = POST.bloom.intensity * (tier === "mobile" ? 0.5 : 1);
  const dispersionOn = tier !== "mobile";
  const smaaOn = MULTISAMPLING[tier] === 0;

  return (
    <Canvas
      frameloop="never"
      shadows={isDesktop}
      dpr={clampedPixelRatio(tier)}
      style={{ width: "100%", height: "100%", display: "block" }}
      gl={{
        antialias: false,
        alpha: false,
        stencil: false,
        depth: true,
        powerPreference: isDesktop ? "high-performance" : "default",
        preserveDrawingBuffer: true,
      }}
      camera={{ position: [...CAMERA.position], fov: CAMERA.fov }}
      onCreated={({ gl }) => {
        gl.debug.checkShaderErrors = false;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.98;
      }}
    >
      <color attach="background" args={[FOG.color]} />
      <fog attach="fog" args={[FOG.color, FOG.near, FOG.far]} />

      <FrameGate />
      <CameraRig />

      <Backdrop />

      <ContentGroup>
        <Lighting />
        <Suspense fallback={null}>
          <BaseRock />
          <EmblemModel />
          <DebrisField />
          <Prewarm composerRef={composerRef} />
        </Suspense>
      </ContentGroup>

      <LightRays />
      <DustParticles />

      {dispersionOn && <DispersionMaskRenderer effectRef={dispersionRef} />}
      <GrainControl noiseRef={noiseRef} />

      <EffectComposer ref={composerRef} multisampling={MULTISAMPLING[tier]}>
        {[
          ...(dispersionOn
            ? [
                <MaskedDispersion
                  key="dispersion"
                  ref={dispersionRef}
                  strength={POST.dispersion.strength}
                />,
              ]
            : []),
          <Bloom
            key="bloom"
            intensity={bloomIntensity}
            luminanceThreshold={POST.bloom.luminanceThreshold}
            luminanceSmoothing={POST.bloom.luminanceSmoothing}
            mipmapBlur={POST.bloom.mipmapBlur}
          />,
          <Vignette
            key="vignette"
            offset={POST.vignette.offset}
            darkness={POST.vignette.darkness}
          />,
          <Noise
            key="noise"
            ref={noiseRef}
            opacity={POST.noise.opacity}
            blendFunction={BlendFunction.OVERLAY}
          />,
          ...(smaaOn ? [<SMAA key="smaa" />] : []),
        ]}
      </EffectComposer>
    </Canvas>
  );
};

export default MonkScene;
