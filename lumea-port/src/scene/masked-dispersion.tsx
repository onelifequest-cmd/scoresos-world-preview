

import { useMemo, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import { wrapEffect } from "@react-three/postprocessing";
import { Effect } from "postprocessing";
import * as THREE from "three";

import { MASK_LAYER, OCCLUDER_LAYER, POST } from "./scene-config";
import { useDispersionStore } from "./dispersion-store";

/**
 * Chromatic aberration confined to a mask. `uMask` is a full-frame texture that
 * is white on the debris rocks and black everywhere else; the RGB channels are
 * sampled at a radial offset scaled by that mask, so only rock pixels split.
 * `inputBuffer` is provided by postprocessing.
 *
 * The split is tinted by two live colours: `uColorA`'s channels are pulled from
 * the +offset sample, `uColorB`'s from the −offset sample, and whatever neither
 * claims stays on the un-shifted pixel. Default red/cyan reproduces a clean film
 * aberration (red one side, cyan the other); any two colours are valid.
 */
const fragmentShader = /* glsl */ `
uniform sampler2D uMask;
uniform float uStrength;
uniform vec3 uColorA;
uniform vec3 uColorB;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float mask = texture(uMask, uv).r;
  if (mask < 0.01) {
    outputColor = inputColor;
    return;
  }

  vec2 offset = (uv - 0.5) * uStrength * mask;
  vec3 base = inputColor.rgb;
  vec3 plus = texture(inputBuffer, uv + offset).rgb;
  vec3 minus = texture(inputBuffer, uv - offset).rgb;

  vec3 baseWeight = clamp(1.0 - uColorA - uColorB, 0.0, 1.0);
  vec3 color = base * baseWeight + plus * uColorA + minus * uColorB;
  outputColor = vec4(color, inputColor.a);
}
`;

interface MaskedDispersionOptions {
  strength?: number;
  colorA?: string;
  colorB?: string;
}

export class MaskedDispersionEffect extends Effect {
  constructor({
    strength = POST.dispersion.strength,
    colorA = POST.dispersion.colorA,
    colorB = POST.dispersion.colorB,
  }: MaskedDispersionOptions = {}) {
    super("MaskedDispersion", fragmentShader, {
      uniforms: new Map<string, THREE.Uniform>([
        ["uMask", new THREE.Uniform(null)],
        ["uStrength", new THREE.Uniform(strength)],
        ["uColorA", new THREE.Uniform(new THREE.Color(colorA))],
        ["uColorB", new THREE.Uniform(new THREE.Color(colorB))],
      ]),
    });
  }

  setMask(texture: THREE.Texture) {
    const uniform = this.uniforms.get("uMask");
    if (uniform) uniform.value = texture;
  }

  /** Live-update the fringe colours + strength (called each frame from the
      mask renderer, driven by the Rocks panel). Colours are passed as reusable
      THREE.Color instances so no allocation happens per frame. */
  setControls(colorA: THREE.Color, colorB: THREE.Color, strength: number) {
    const a = this.uniforms.get("uColorA");
    if (a) (a.value as THREE.Color).copy(colorA);
    const b = this.uniforms.get("uColorB");
    if (b) (b.value as THREE.Color).copy(colorB);
    const s = this.uniforms.get("uStrength");
    if (s) s.value = strength;
  }
}

/** JSX wrapper so the effect can live inside <EffectComposer>. */
export const MaskedDispersion = wrapEffect(MaskedDispersionEffect);

interface DispersionMaskRendererProps {
  effectRef: RefObject<MaskedDispersionEffect | null>;
}

/**
 * Renders a debris-only mask into an offscreen buffer each frame and hands it to
 * the dispersion effect. Runs at default frame priority, i.e. before the
 * EffectComposer (priority 1), so the mask is ready when the effect samples it.
 * Only the rocks carry MASK_LAYER, so restricting the camera to that layer and
 * overriding every material with flat white yields their silhouettes alone.
 */
export const DispersionMaskRenderer = ({
  effectRef,
}: DispersionMaskRendererProps) => {
  const size = useThree((state) => state.size);

  // Full-res mask: a half-res mask shimmers along rock edges as the camera orbits.
  const fbo = useFBO(Math.max(1, size.width), Math.max(1, size.height));

  // Two override materials: black lays down the whole scene's depth (so
  // occluders like the monk mask out rocks behind them); white then paints only
  // the debris, depth-tested against that pass so hidden rocks stay black.
  const blackMaterial = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
    material.fog = false;
    return material;
  }, []);

  const whiteMaterial = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    material.fog = false;
    material.depthWrite = false;
    return material;
  }, []);

  const prevClearColor = useMemo(() => new THREE.Color(), []);

  // Reusable colour scratch so the per-frame control push never allocates.
  const controlColors = useMemo(
    () => ({ a: new THREE.Color(), b: new THREE.Color() }),
    [],
  );

  // gl / scene / camera come off the per-frame state (not captured from a hook),
  // so mutating them each frame is the idiomatic, lint-clean path.
  useFrame(({ gl, scene, camera }) => {
    const prevLayerMask = camera.layers.mask;
    const prevTarget = gl.getRenderTarget();
    const prevOverride = scene.overrideMaterial;
    const prevBackground = scene.background;
    const prevAutoClear = gl.autoClear;
    gl.getClearColor(prevClearColor);
    const prevClearAlpha = gl.getClearAlpha();

    scene.background = null;
    gl.autoClear = false;
    gl.setRenderTarget(fbo);
    gl.setClearColor(0x000000, 1);
    gl.clear();

    // Pass 1: solid occluders only, in black, writing depth (transparent
    // volumetrics are excluded so they never mask out rocks behind them).
    camera.layers.set(OCCLUDER_LAYER);
    scene.overrideMaterial = blackMaterial;
    gl.render(scene, camera);

    // Pass 2: debris only in white, depth-tested against pass 1 (no occluded rocks).
    camera.layers.set(MASK_LAYER);
    scene.overrideMaterial = whiteMaterial;
    gl.render(scene, camera);

    gl.setRenderTarget(prevTarget);
    gl.setClearColor(prevClearColor, prevClearAlpha);
    gl.autoClear = prevAutoClear;
    scene.overrideMaterial = prevOverride;
    scene.background = prevBackground;
    camera.layers.mask = prevLayerMask;

    effectRef.current?.setMask(fbo.texture);

    // Push the live fringe colours + strength from the Rocks panel.
    const dispersion = useDispersionStore.getState();
    controlColors.a.set(dispersion.colorA);
    controlColors.b.set(dispersion.colorB);
    effectRef.current?.setControls(
      controlColors.a,
      controlColors.b,
      dispersion.strength,
    );
  });

  return null;
};
