/**
 * Score OS world v3 — Runway cinematic heroes + real-time WebGL interaction.
 * Footage: gen-4-turbo I2V 10s per beat. Overlay: ripple shader, spring dust,
 * push/attract particles, parallax tilt, scroll dissolve.
 */
import * as THREE from 'three';
import { EffectComposer } from '../vendor/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/postprocessing/RenderPass.js';
import { ShaderPass } from '../vendor/postprocessing/ShaderPass.js';

const BEAT_META = [
  { id: '01', still: './media/stills/beat-01.jpg', video: './media/clips/beat-01.mp4', mobile: './media/clips/beat-01-mobile.mp4', label: 'gauge' },
  { id: '02', still: './media/stills/beat-02.jpg', video: './media/clips/beat-02.mp4', mobile: './media/clips/beat-02-mobile.mp4', label: 'maxine' },
  { id: '03', still: './media/stills/beat-03.jpg', video: './media/clips/beat-03.mp4', mobile: './media/clips/beat-03-mobile.mp4', label: 'bureaus' },
  { id: '04', still: './media/stills/beat-04.jpg', video: './media/clips/beat-04.mp4', mobile: './media/clips/beat-04-mobile.mp4', label: 'deck' },
  { id: '05', still: './media/stills/beat-05.jpg', video: './media/clips/beat-05.mp4', mobile: './media/clips/beat-05-mobile.mp4', label: 'funding' },
  { id: '06', still: './media/stills/beat-06.jpg', video: './media/clips/beat-06.mp4', mobile: './media/clips/beat-06-mobile.mp4', label: 'pricing' },
];

/** Film grain on the final composite */
const GrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    amount: { value: 0.04 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float amount;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float n = hash(vUv * vec2(1920.0,1080.0) + time) - 0.5;
      c.rgb += n * amount;
      gl_FragColor = c;
    }
  `,
};

/**
 * Hero footage material: video/still map + cursor ripple displacement/refraction
 * + soft radial vignette + crossfade wipe.
 */
const HeroShader = {
  uniforms: {
    map: { value: null },
    opacity: { value: 1 },
    time: { value: 0 },
    mouse: { value: new THREE.Vector2(0.5, 0.5) },
    rippleStrength: { value: 0 },
    wipe: { value: 0 }, // 0 = fully show, 1 = wiped out (edge dissolve)
    wipeDir: { value: 1 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D map;
    uniform float opacity;
    uniform float time;
    uniform vec2 mouse;
    uniform float rippleStrength;
    uniform float wipe;
    uniform float wipeDir;
    varying vec2 vUv;

    void main(){
      vec2 uv = vUv;

      // Cursor ripple / refraction
      vec2 d = uv - mouse;
      float dist = length(d);
      float ripple = sin(dist * 48.0 - time * 6.0) * exp(-dist * 7.0) * rippleStrength;
      vec2 dir = dist > 0.0001 ? d / dist : vec2(0.0);
      uv += dir * ripple * 0.018;
      // Soft magnification near cursor
      uv += (mouse - uv) * rippleStrength * 0.012 * exp(-dist * 5.0);

      vec4 color = texture2D(map, clamp(uv, 0.0, 1.0));

      // Soft film vignette
      float vig = smoothstep(1.15, 0.35, length(vUv - 0.5));
      color.rgb *= mix(0.78, 1.0, vig);

      // Edge wipe / dissolve for beat transitions
      float edge = wipeDir > 0.0 ? vUv.x : (1.0 - vUv.x);
      float wipeMask = smoothstep(wipe - 0.12, wipe + 0.12, edge + 0.08);
      // Noise dissolve on wipe edge
      float n = fract(sin(dot(vUv * 400.0, vec2(12.9898,78.233))) * 43758.5453);
      wipeMask = smoothstep(0.0, 1.0, wipeMask + (n - 0.5) * 0.08 * step(0.01, wipe) * step(wipe, 0.99));

      float a = opacity * wipeMask;
      if (a < 0.01) discard;
      gl_FragColor = vec4(color.rgb, a);
    }
  `,
};

function loadTexture(loader, url) {
  return new Promise((resolve) => {
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        resolve(tex);
      },
      undefined,
      () => resolve(null)
    );
  });
}

function makeVideoEl(src) {
  const v = document.createElement('video');
  v.src = src;
  v.crossOrigin = 'anonymous';
  v.muted = true;
  v.playsInline = true;
  v.loop = true;
  v.preload = 'auto';
  v.setAttribute('playsinline', '');
  v.setAttribute('muted', '');
  return v;
}

export async function createWorld(canvas, opts = {}) {
  const isMobile = !!opts.isMobile;
  const reduced = !!opts.reduced;
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : () => {};
  const dprCap = isMobile ? 1.1 : 1.75;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050706');
  scene.fog = new THREE.FogExp2('#050706', isMobile ? 0.01 : 0.0045);

  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 8.2);

  const amb = new THREE.AmbientLight(0xb8cfc0, 0.4);
  scene.add(amb);
  const key = new THREE.DirectionalLight(0xfff2d6, 0.6);
  key.position.set(3, 6, 8);
  scene.add(key);

  // Pivot group for mouse-follow parallax tilt of the whole footage stack
  const tiltPivot = new THREE.Group();
  scene.add(tiltPivot);
  const root = new THREE.Group();
  tiltPivot.add(root);

  const texLoader = new THREE.TextureLoader();
  const layers = [];
  const videos = [];

  const planeW = 14.4;
  const planeH = 8.1;
  // Higher-res plane so ripple reads crisply
  const planeGeo = new THREE.PlaneGeometry(planeW, planeH, 1, 1);

  onProgress(0.08);

  for (let i = 0; i < BEAT_META.length; i++) {
    const meta = BEAT_META[i];
    const group = new THREE.Group();
    group.position.z = -i * 0.12;
    root.add(group);

    const stillTex = await loadTexture(texLoader, meta.still);
    onProgress(0.08 + (i + 0.35) / BEAT_META.length * 0.55);

    const uniforms = THREE.UniformsUtils.clone(HeroShader.uniforms);
    uniforms.map.value = stillTex;
    uniforms.opacity.value = i === 0 ? 1 : 0;
    uniforms.mouse.value = new THREE.Vector2(0.5, 0.5);
    uniforms.wipe.value = 0;
    uniforms.wipeDir.value = 1;

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: HeroShader.vertexShader,
      fragmentShader: HeroShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    const mesh = new THREE.Mesh(planeGeo, mat);
    group.add(mesh);

    let video = null;
    let videoTex = null;
    const clipSrc = isMobile ? (meta.mobile || meta.video) : meta.video;

    if (clipSrc && !reduced) {
      video = makeVideoEl(clipSrc);
      videoTex = new THREE.VideoTexture(video);
      videoTex.colorSpace = THREE.SRGBColorSpace;
      videoTex.minFilter = THREE.LinearFilter;
      videoTex.magFilter = THREE.LinearFilter;
      videoTex.generateMipmaps = false;

      const ok = await new Promise((resolve) => {
        const onMeta = () => { cleanup(); resolve(true); };
        const onErr = () => { cleanup(); resolve(false); };
        const cleanup = () => {
          video.removeEventListener('loadedmetadata', onMeta);
          video.removeEventListener('error', onErr);
        };
        video.addEventListener('loadedmetadata', onMeta);
        video.addEventListener('error', onErr);
        video.load();
        setTimeout(() => { cleanup(); resolve(video.readyState >= 1); }, 4000);
      });

      if (ok) {
        uniforms.map.value = videoTex;
        video.pause();
        // Prefetch a couple of frames so first scrub isn't black
        try { video.currentTime = 0.05; } catch (_) {}
        videos.push({ video, tex: videoTex, index: i });
      } else {
        video = null;
        videoTex?.dispose();
        videoTex = null;
      }
    }

    layers.push({ group, mesh, mat, uniforms, video, videoTex, stillTex, meta });
    onProgress(0.08 + (i + 1) / BEAT_META.length * 0.55);
  }

  // ——— Spring particle field (push + attract) ———
  const dustCount = isMobile ? 220 : 720;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  const dustVel = new Float32Array(dustCount * 3);
  const dustBase = new Float32Array(dustCount * 3);
  const dustSize = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    const x = (Math.random() - 0.5) * 16;
    const y = (Math.random() - 0.5) * 10;
    const z = (Math.random() - 0.5) * 5 - 0.5;
    dustPos[i * 3] = x; dustPos[i * 3 + 1] = y; dustPos[i * 3 + 2] = z;
    dustBase[i * 3] = x; dustBase[i * 3 + 1] = y; dustBase[i * 3 + 2] = z;
    dustVel[i * 3] = 0; dustVel[i * 3 + 1] = 0; dustVel[i * 3 + 2] = 0;
    dustSize[i] = 0.5 + Math.random() * 1.5;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute('aSize', new THREE.BufferAttribute(dustSize, 1));

  const dustMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0xd4b46a) },
      uOpacity: { value: 0.55 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, dprCap) },
    },
    vertexShader: /* glsl */`
      attribute float aSize;
      uniform float uPixelRatio;
      varying float vAlpha;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelRatio * (90.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
        vAlpha = clamp(1.2 + mv.z * 0.08, 0.15, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vAlpha;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float soft = smoothstep(0.5, 0.05, d);
        gl_FragColor = vec4(uColor, soft * uOpacity * vAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  // Soft cursor light orb
  const glowGeo = new THREE.SphereGeometry(0.55, 24, 24);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xe8c96a,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.set(0, 0, 5.2);
  scene.add(glow);

  // Post
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const grain = new ShaderPass(GrainShader);
  grain.uniforms.amount.value = isMobile ? 0.025 : 0.036;
  composer.addPass(grain);

  let progress = 0;
  let mouse = { x: 0, y: 0 };         // -1..1
  let mouseSmooth = { x: 0, y: 0 };
  let mouseUV = { x: 0.5, y: 0.5 };   // 0..1 for shader
  let mouseUVSmooth = { x: 0.5, y: 0.5 };
  let ripple = 0;
  let pointerDown = false;
  let time = 0;
  let lastBeat = 0;

  // Demo score DOM
  let scoreEl = document.getElementById('live-score');
  if (!scoreEl) {
    scoreEl = document.createElement('div');
    scoreEl.id = 'live-score';
    scoreEl.setAttribute('aria-hidden', 'true');
    scoreEl.innerHTML = '<span class="ls-label">Demo score</span><span class="ls-num">580</span>';
    document.body.appendChild(scoreEl);
  }

  function beatBlend(p) {
    const n = BEAT_META.length;
    const x = p * (n - 0.001);
    const i0 = Math.floor(x);
    const i1 = Math.min(n - 1, i0 + 1);
    const f = x - i0;
    const t = f * f * (3 - 2 * f);
    return { i0, i1, t, local: f };
  }

  function setProgress(p) {
    progress = Math.min(1, Math.max(0, p));
  }
  function setMouse(nx, ny, uvx, uvy) {
    mouse.x = nx;
    mouse.y = ny;
    if (uvx != null) mouseUV.x = uvx;
    if (uvy != null) mouseUV.y = uvy;
  }
  function pulseRipple(strength = 1) {
    ripple = Math.min(1.6, ripple + strength);
  }
  function setPointerDown(v) { pointerDown = !!v; }

  function scrubVideo(entry, localT) {
    if (!entry.video || !entry.video.duration || !isFinite(entry.video.duration)) return;
    const dur = entry.video.duration;
    const target = Math.min(dur - 0.05, Math.max(0, localT * dur));
    if (Math.abs(entry.video.currentTime - target) > 0.035) {
      try { entry.video.currentTime = target; } catch (_) {}
    }
  }

  function update(dt) {
    time += dt;
    const ease = 1 - Math.exp(-dt * 7);
    mouseSmooth.x += (mouse.x - mouseSmooth.x) * ease;
    mouseSmooth.y += (mouse.y - mouseSmooth.y) * ease;
    mouseUVSmooth.x += (mouseUV.x - mouseUVSmooth.x) * ease;
    mouseUVSmooth.y += (mouseUV.y - mouseUVSmooth.y) * ease;

    // Ripple decays; pointer-down keeps a soft field
    ripple += ((pointerDown ? 0.55 : 0) - ripple) * (1 - Math.exp(-dt * 3.2));
    // Motion boost
    const mouseDelta = Math.hypot(mouse.x - mouseSmooth.x, mouse.y - mouseSmooth.y);
    ripple = Math.min(1.5, ripple + mouseDelta * 2.2);

    const { i0, i1, t, local } = beatBlend(progress);
    if (i0 !== lastBeat) {
      pulseRipple(0.45);
      lastBeat = i0;
    }

    layers.forEach((L, i) => {
      let op = 0;
      let wipe = 0;
      let wipeDir = 1;
      if (i === i0) {
        op = 1 - t;
        wipe = t; // wipe out as we leave
        wipeDir = 1;
      }
      if (i === i1) {
        op = t;
        wipe = 1 - t; // wipe in
        wipeDir = -1;
      }
      if (progress > 0.93 && i === layers.length - 1) {
        op = 1; wipe = 0;
      }
      L.uniforms.opacity.value = Math.max(0, Math.min(1, op * 1.02));
      L.uniforms.wipe.value = wipe;
      L.uniforms.wipeDir.value = wipeDir;
      L.uniforms.time.value = time;
      L.uniforms.mouse.value.set(mouseUVSmooth.x, mouseUVSmooth.y);
      L.uniforms.rippleStrength.value = (i === i0 || i === i1) ? ripple : 0;
      L.mesh.visible = L.uniforms.opacity.value > 0.01;

      const focus = i === i0 || i === i1;
      const parallax = focus ? 1 : 0.35;
      L.group.position.x = mouseSmooth.x * 0.22 * parallax;
      L.group.position.y = mouseSmooth.y * 0.14 * parallax;
      const baseScale = 1 + (focus ? 0.02 : 0);
      L.group.scale.setScalar(baseScale + Math.abs(mouseSmooth.x) * 0.02);

      if (L.video && focus && L.uniforms.opacity.value > 0.12) {
        const beatStart = i / BEAT_META.length;
        const beatEnd = (i + 1) / BEAT_META.length;
        const scrub = (progress - beatStart) / Math.max(0.001, beatEnd - beatStart);
        scrubVideo(L, Math.min(1, Math.max(0, scrub)));
        if (L.videoTex) L.videoTex.needsUpdate = true;
      }
    });

    // Mouse-follow parallax tilt of footage plane
    const targetRotX = -mouseSmooth.y * 0.09;
    const targetRotY = mouseSmooth.x * 0.12;
    tiltPivot.rotation.x += (targetRotX - tiltPivot.rotation.x) * ease;
    tiltPivot.rotation.y += (targetRotY - tiltPivot.rotation.y) * ease;

    camera.position.x = mouseSmooth.x * 0.28;
    camera.position.y = mouseSmooth.y * 0.16;
    camera.position.z = 8.2 - progress * 0.4;
    camera.lookAt(mouseSmooth.x * 0.12, mouseSmooth.y * 0.06, 0);

    // Spring particles: attract to cursor, push when fast / down
    const attractX = mouseSmooth.x * 5.5;
    const attractY = mouseSmooth.y * 3.4;
    const pushR = pointerDown ? 2.4 : 1.35;
    const pushForce = pointerDown ? 18 : (6 + mouseDelta * 40);
    const attractForce = pointerDown ? 1.2 : 3.6;
    const pos = dust.geometry.attributes.position.array;

    for (let i = 0; i < dustCount; i++) {
      const ix = i * 3;
      let x = pos[ix];
      let y = pos[ix + 1];
      let z = pos[ix + 2];

      // Spring back to base
      const bx = dustBase[ix], by = dustBase[ix + 1], bz = dustBase[ix + 2];
      dustVel[ix] += (bx - x) * 1.8 * dt;
      dustVel[ix + 1] += (by - y) * 1.8 * dt;
      dustVel[ix + 2] += (bz - z) * 1.2 * dt;

      // Attract toward cursor plane
      const dx = attractX - x;
      const dy = attractY - y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;

      if (dist < pushR) {
        // Push away
        const f = (1 - dist / pushR) * pushForce;
        dustVel[ix] -= (dx / dist) * f * dt;
        dustVel[ix + 1] -= (dy / dist) * f * dt;
      } else if (dist < 5.5) {
        // Soft attract
        const f = attractForce / (dist * dist);
        dustVel[ix] += dx * f * dt;
        dustVel[ix + 1] += dy * f * dt;
      }

      // Gentle drift
      dustVel[ix + 1] += Math.sin(time * 0.4 + i * 0.17) * 0.15 * dt;

      // Dampen + integrate
      dustVel[ix] *= 0.92;
      dustVel[ix + 1] *= 0.92;
      dustVel[ix + 2] *= 0.94;
      x += dustVel[ix] * dt * 60 * 0.016;
      y += dustVel[ix + 1] * dt * 60 * 0.016;
      z += dustVel[ix + 2] * dt * 60 * 0.016;
      pos[ix] = x; pos[ix + 1] = y; pos[ix + 2] = z;
    }
    dust.geometry.attributes.position.needsUpdate = true;
    dustMat.uniforms.uOpacity.value = 0.35 + Math.min(0.45, ripple * 0.35 + mouseDelta * 0.5);

    // Cursor glow
    glow.position.x = mouseSmooth.x * 3.6;
    glow.position.y = mouseSmooth.y * 2.2;
    glowMat.opacity = Math.min(0.14, 0.02 + ripple * 0.08 + mouseDelta * 0.25);
    glow.scale.setScalar(0.7 + ripple * 0.6);
    glow.visible = glowMat.opacity > 0.01;

    // Demo score climb on beat 1
    const onGauge = progress < 0.17;
    scoreEl.classList.toggle('on', onGauge);
    if (onGauge) {
      const climb = Math.min(1, progress / 0.15);
      const score = Math.round(580 + (760 - 580) * climb);
      scoreEl.querySelector('.ls-num').textContent = String(score);
    }

    grain.uniforms.time.value = time;
    composer.render();
  }

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    dustMat.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, dprCap);
  }
  window.addEventListener('resize', onResize);

  function dispose() {
    window.removeEventListener('resize', onResize);
    videos.forEach(({ video, tex }) => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      tex.dispose();
    });
    layers.forEach((L) => {
      L.stillTex?.dispose();
      L.mat.dispose();
    });
    planeGeo.dispose();
    dustGeo.dispose();
    dustMat.dispose();
    glowGeo.dispose();
    glowMat.dispose();
    renderer.dispose();
  }

  update(0);
  onProgress(0.95);

  return {
    setProgress,
    setMouse,
    pulseRipple,
    setPointerDown,
    update,
    dispose,
    renderer,
    scene,
    camera,
  };
}
