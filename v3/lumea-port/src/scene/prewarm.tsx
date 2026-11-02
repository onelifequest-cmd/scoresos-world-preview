

import { useEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { EffectComposer } from "postprocessing";
import * as THREE from "three";

import { useIntroStore } from "../use-intro-store";

/** Full frames that must render AFTER compilation before the scene counts as
 *  ready — they run through the real composer chain at real resolution, so any
 *  lazily-allocated render target or first texture sample is touched while the
 *  preloader still owns the screen. */
const READY_FRAMES = 3;

/** Every material the post chain owns — pass materials and the ones nested in
 *  effects (bloom's luminance + mip-blur, SMAA's edge/weight passes). Walks
 *  plain object fields a few levels deep; scene graphs, textures and render
 *  targets are not followed. */
const collectMaterials = (
  value: unknown,
  out: Set<THREE.Material>,
  depth = 0,
): void => {
  if (!value || typeof value !== "object" || depth > 4) return;
  if (value instanceof THREE.Material) {
    out.add(value);
    return;
  }
  if (
    value instanceof THREE.Object3D ||
    value instanceof THREE.Texture ||
    value instanceof THREE.WebGLRenderTarget ||
    value instanceof THREE.WebGLRenderer ||
    value instanceof THREE.BufferGeometry
  ) {
    return;
  }
  for (const child of Object.values(value)) {
    collectMaterials(child, out, depth + 1);
  }
};

type AsyncRenderer = THREE.WebGLRenderer & {
  compileAsync?: (
    scene: THREE.Object3D,
    camera: THREE.Camera,
  ) => Promise<unknown>;
};

/**
 * Every program the composer will use, created now and compiled off the main
 * thread. The scene is drawn by the composer's RenderPass into a render
 * target, and a program's key includes where it draws (output colour space,
 * tone mapping) — so the scene is compiled with a target bound: compiled for
 * the screen it was a different program, and the first frame built the real
 * ones synchronously. The post chain draws to targets and, for its last pass,
 * the screen — both variants.
 */
const compileAll = (
  renderer: AsyncRenderer,
  scene: THREE.Object3D,
  camera: THREE.Camera,
  composer: EffectComposer | null | undefined,
): Promise<unknown>[] => {
  const compileAsync = renderer.compileAsync;
  if (!compileAsync) return [];
  const materials = new Set<THREE.Material>();
  if (composer) collectMaterials(composer.passes, materials);
  const quad = new THREE.PlaneGeometry(2, 2);
  const postScene = new THREE.Scene();
  for (const material of materials) {
    const mesh = new THREE.Mesh(quad, material);
    mesh.frustumCulled = false;
    postScene.add(mesh);
  }
  const target = new THREE.WebGLRenderTarget(1, 1);
  const previous = renderer.getRenderTarget();
  const done: Promise<unknown>[] = [];
  // compileAsync creates every program synchronously (with the current target
  // bound) and only waits asynchronously — so the target can be swapped back
  // straight after the calls.
  renderer.setRenderTarget(target);
  done.push(compileAsync.call(renderer, scene, camera));
  if (materials.size > 0)
    done.push(compileAsync.call(renderer, postScene, camera));
  renderer.setRenderTarget(null);
  if (materials.size > 0)
    done.push(compileAsync.call(renderer, postScene, camera));
  renderer.setRenderTarget(previous);
  void Promise.allSettled(done).then(() => {
    target.dispose();
    quad.dispose();
  });
  return done;
};

/** three's program wrapper, as `renderer.info.programs` lists it. */
type ProgramEntry = {
  getUniforms: () => unknown;
  getAttributes: () => unknown;
};

const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * A program's first use reads its link status, info logs and every uniform
 * and attribute location — each a synchronous round trip to the GPU process.
 * Left to the first frame, that was ~60 ms of a phone's main thread in one
 * task (4× CPU). Done here, one program per task, while the preloader shows.
 */
const touchPrograms = async (
  renderer: THREE.WebGLRenderer,
  isCancelled: () => boolean,
) => {
  const programs = (renderer.info.programs ?? []) as unknown as ProgramEntry[];
  for (const program of [...programs]) {
    if (isCancelled()) return;
    await nextTask();
    program.getUniforms();
    program.getAttributes();
  }
};

/**
 * Uploads each drawable's buffers and textures in its own task: one object at
 * a time is drawn into a 1×1 target (the same programs the composer's
 * RenderPass uses — both draw to a target), everything else hidden. Left to
 * the first real frame, the monk's texture and every vertex buffer went up in
 * one ~100 ms task on a phone (4× CPU). Visibility is restored exactly.
 */
const uploadObjects = async (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  isCancelled: () => boolean,
) => {
  const drawables: THREE.Object3D[] = [];
  scene.traverseVisible((object) => {
    const o = object as THREE.Object3D & {
      isMesh?: boolean;
      isPoints?: boolean;
      isLine?: boolean;
    };
    if (o.isMesh || o.isPoints || o.isLine) drawables.push(object);
  });
  if (drawables.length === 0) return;
  const target = new THREE.WebGLRenderTarget(1, 1);
  const previous = renderer.getRenderTarget();
  try {
    for (const object of drawables) {
      await nextTask();
      if (isCancelled()) return;
      for (const other of drawables) other.visible = other === object;
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(previous);
    }
  } finally {
    for (const object of drawables) object.visible = true;
    renderer.setRenderTarget(previous);
    target.dispose();
  }
};

/** The slice of postprocessing's composer and passes the warm-up drives. */
type WarmEffect = {
  update: (
    renderer: THREE.WebGLRenderer,
    inputBuffer: THREE.WebGLRenderTarget,
    deltaTime: number,
  ) => void;
};
type WarmPass = {
  enabled: boolean;
  effects?: WarmEffect[];
  render: (
    renderer: THREE.WebGLRenderer,
    inputBuffer: THREE.WebGLRenderTarget | null,
    outputBuffer: THREE.WebGLRenderTarget | null,
    deltaTime?: number,
    stencilTest?: boolean,
  ) => void;
};

/**
 * The post chain's own programs, built by running it the way a frame does —
 * one effect's `update` (bloom's luminance + mip-blur, SMAA's edge and weight
 * passes) and then one effect pass per task, against the composer's real
 * buffers. `compileAll` cannot reach them: a pass keeps its material behind a
 * getter on a skipped Mesh, and bloom's blur materials sit deeper than the
 * walk goes — so all seven linked inside the first composer frame, one
 * ~30 ms task (~120 ms on a 4× phone). What this draws into the buffers (and
 * the canvas, under the preloader) is overwritten by the first real frame.
 */
const warmPost = async (
  renderer: THREE.WebGLRenderer,
  composer: EffectComposer | null | undefined,
  isCancelled: () => boolean,
) => {
  if (!composer) return;
  const { inputBuffer, outputBuffer } = composer as unknown as {
    inputBuffer: THREE.WebGLRenderTarget;
    outputBuffer: THREE.WebGLRenderTarget;
  };
  const passes = composer.passes as unknown as WarmPass[];
  const previous = renderer.getRenderTarget();
  try {
    for (const pass of passes) {
      if (!pass.enabled || !pass.effects) continue;
      for (const effect of pass.effects) {
        await nextTask();
        if (isCancelled()) return;
        effect.update(renderer, inputBuffer, 0);
      }
      await nextTask();
      if (isCancelled()) return;
      pass.render(renderer, inputBuffer, outputBuffer, 0, false);
    }
  } finally {
    renderer.setRenderTarget(previous);
  }
};

/**
 * Compiles every reachable program (and uploads their textures) once the model
 * has loaded — while the preloader still owns the screen — so the frame loop
 * never compiles a shader mid-scene, which is the classic WebGL micro-freeze.
 *
 * Mounted INSIDE the model's <Suspense>, so by the time this runs every material
 * (figure, rings, debris, beam, backdrop, particles) is in the graph. Uses
 * `compileAsync` (yields to the main thread) where available.
 *
 * Compilation, the programs' first use and the uploads each run in tasks of
 * their own, and the Canvas draws nothing until they are done (it starts at
 * `frameloop="never"`): on a 4× phone the first frame had been one ~110 ms
 * task doing all three. Once they are done and READY_FRAMES more frames have
 * rendered (the FrameGate invalidates continuously, so frames flow during the
 * loader), it flips `sceneReady` — the signal the preloader waits for.
 */
export const Prewarm = ({
  composerRef,
}: {
  composerRef?: RefObject<EffectComposer | null>;
}) => {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const setFrameloop = useThree((state) => state.setFrameloop);
  const compiled = useRef(false);
  const framesAfterCompile = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const markCompiled = () => {
      if (cancelled) return;
      compiled.current = true;
      // Opens the frame loop (the Canvas starts at "never"; FrameGate waits).
      setFrameloop("demand");
      useIntroStore.getState().setSceneCompiled();
    };
    const renderer = gl as AsyncRenderer;
    if (typeof renderer.compileAsync === "function") {
      // Resolve OR reject both mark compiled — a compile error must never
      // strand the preloader.
      void Promise.allSettled(
        compileAll(renderer, scene, camera, composerRef?.current),
      )
        .then(() => touchPrograms(renderer, () => cancelled))
        .then(() => uploadObjects(renderer, scene, camera, () => cancelled))
        .then(() => warmPost(renderer, composerRef?.current, () => cancelled))
        .then(markCompiled, markCompiled);
    } else {
      renderer.compile(scene, camera);
      markCompiled();
    }
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, composerRef, setFrameloop]);

  useFrame(() => {
    if (!compiled.current) return;
    if (useIntroStore.getState().sceneReady) return;
    framesAfterCompile.current += 1;
    if (framesAfterCompile.current >= READY_FRAMES) {
      useIntroStore.getState().setSceneReady();
    }
  });

  return null;
};
