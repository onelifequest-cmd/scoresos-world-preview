/**
 * Score OS world — hybrid photoreal stills/video + interactive Three.js overlays.
 * Heroes are cinematic photographs (and scroll-scrubbed clips). Three.js only
 * handles particles, soft cursor glow, DOM demo-score HUD, and depth parallax.
 */
import * as THREE from 'three';
import { EffectComposer } from '../vendor/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/postprocessing/RenderPass.js';
import { ShaderPass } from '../vendor/postprocessing/ShaderPass.js';

const BEAT_META = [
  { id: '01', still: './media/stills/beat-01.jpg', video: null, label: 'gauge' },
  { id: '02', still: './media/stills/beat-02.jpg', video: './media/clips/beat-02.mp4', label: 'maxine' },
  { id: '03', still: './media/stills/beat-03.jpg', video: './media/clips/beat-03.mp4', label: 'bureaus' },
  { id: '04', still: './media/stills/beat-04.jpg', video: null, label: 'deck' },
  { id: '05', still: './media/stills/beat-05.jpg', video: './media/clips/beat-05.mp4', label: 'funding' },
  { id: '06', still: './media/stills/beat-06.jpg', video: null, label: 'pricing' },
];

const GrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    amount: { value: 0.045 },
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
  return v;
}

export async function createWorld(canvas, opts = {}) {
  const isMobile = !!opts.isMobile;
  const reduced = !!opts.reduced;
  const dprCap = isMobile ? 1.15 : 1.6;

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
  renderer.toneMappingExposure = 0.92;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050706');
  scene.fog = new THREE.FogExp2('#050706', isMobile ? 0.012 : 0.006);

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 8);

  // Soft fill so plane edges don't clip to void harshly
  const amb = new THREE.AmbientLight(0xb8cfc0, 0.35);
  scene.add(amb);
  const key = new THREE.DirectionalLight(0xfff2d6, 0.55);
  key.position.set(3, 6, 8);
  scene.add(key);

  const root = new THREE.Group();
  scene.add(root);

  const texLoader = new THREE.TextureLoader();
  const layers = [];
  const videos = [];

  // Aspect of hero plane (~16:9); sized to fill view with slight overscan for parallax
  const planeW = 14.2;
  const planeH = 8.9;

  for (let i = 0; i < BEAT_META.length; i++) {
    const meta = BEAT_META[i];
    const group = new THREE.Group();
    group.position.z = -i * 0.15; // tiny depth stack for parallax
    root.add(group);

    const stillTex = await loadTexture(texLoader, meta.still);
    const mat = new THREE.MeshBasicMaterial({
      map: stillTex || undefined,
      color: stillTex ? 0xffffff : 0x1a2420,
      transparent: true,
      opacity: i === 0 ? 1 : 0,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), mat);
    group.add(mesh);

    let video = null;
    let videoTex = null;
    if (meta.video && !reduced && !isMobile) {
      video = makeVideoEl(meta.video);
      videoTex = new THREE.VideoTexture(video);
      videoTex.colorSpace = THREE.SRGBColorSpace;
      videoTex.minFilter = THREE.LinearFilter;
      videoTex.magFilter = THREE.LinearFilter;
      // Probe availability; if 404 keep still
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
        setTimeout(() => { cleanup(); resolve(video.readyState >= 1); }, 2500);
      });
      if (ok) {
        mat.map = videoTex;
        mat.needsUpdate = true;
        video.pause();
        videos.push({ video, tex: videoTex, index: i });
      } else {
        video = null;
        videoTex?.dispose();
        videoTex = null;
      }
    }

    layers.push({ group, mesh, mat, video, videoTex, stillTex, meta });
  }

  // Dust / soft particles (interactive layer)
  const dustCount = isMobile ? 180 : 520;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 16;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 10;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xc9b07a,
    size: isMobile ? 0.018 : 0.028,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: THREE.NormalBlending,
    sizeAttenuation: true,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  // Cursor-reactive warm glow orb (subtle)
  const glowGeo = new THREE.SphereGeometry(0.28, 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xd4b46a,
    transparent: true,
    opacity: 0.045,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.set(0, 0, 4.5);
  scene.add(glow);

  // Demo score is DOM-only — no Three.js needle (photo gauge already has a real brass needle)

  // Post
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // Bloom disabled — was blooming photo brass/gold into fake HUD streaks
  const grain = new ShaderPass(GrainShader);
  grain.uniforms.amount.value = isMobile ? 0.028 : 0.038;
  composer.addPass(grain);

  let progress = 0;
  let mouse = { x: 0, y: 0 };
  let mouseSmooth = { x: 0, y: 0 };
  let time = 0;

  // Score HUD element (created once)
  let scoreEl = document.getElementById('live-score');
  if (!scoreEl) {
    scoreEl = document.createElement('div');
    scoreEl.id = 'live-score';
    scoreEl.setAttribute('aria-hidden', 'true');
    scoreEl.innerHTML = '<span class="ls-label">Demo score</span><span class="ls-num">580</span>';
    document.body.appendChild(scoreEl);
  }

  function beatBlend(p) {
    // Soft crossfade across 6 beats
    const n = BEAT_META.length;
    const x = p * (n - 0.001);
    const i0 = Math.floor(x);
    const i1 = Math.min(n - 1, i0 + 1);
    const f = x - i0;
    // smootherstep
    const t = f * f * (3 - 2 * f);
    return { i0, i1, t, local: f };
  }

  function setProgress(p) {
    progress = Math.min(1, Math.max(0, p));
  }
  function setMouse(nx, ny) {
    mouse.x = nx;
    mouse.y = ny;
  }

  function scrubVideo(entry, localT) {
    if (!entry.video || !entry.video.duration || !isFinite(entry.video.duration)) return;
    const dur = entry.video.duration;
    const target = Math.min(dur - 0.04, Math.max(0, localT * dur));
    if (Math.abs(entry.video.currentTime - target) > 0.04) {
      try { entry.video.currentTime = target; } catch (_) { /* ignore seek race */ }
    }
  }

  function update(dt) {
    time += dt;
    mouseSmooth.x += (mouse.x - mouseSmooth.x) * 0.06;
    mouseSmooth.y += (mouse.y - mouseSmooth.y) * 0.06;

    const { i0, i1, t, local } = beatBlend(progress);

    layers.forEach((L, i) => {
      let op = 0;
      if (i === i0) op = 1 - t;
      if (i === i1) op = t;
      // hold finale fully on at end
      if (progress > 0.92 && i === layers.length - 1) op = 1;
      L.mat.opacity = Math.max(0, Math.min(1, op * 1.05));
      L.mesh.visible = L.mat.opacity > 0.01;

      // Parallax: slight scale + offset by mouse and beat depth
      const focus = i === i0 || i === i1;
      const parallax = focus ? 1 : 0.4;
      L.group.position.x = mouseSmooth.x * 0.18 * parallax;
      L.group.position.y = mouseSmooth.y * 0.1 * parallax;
      const baseScale = 1 + (focus ? (1 - Math.abs((i === i0 ? local : local - 1)) * 0.04) : 0);
      L.group.scale.setScalar(baseScale + Math.abs(mouseSmooth.x) * 0.015);

      if (L.video && focus && L.mat.opacity > 0.15) {
        const localT = i === i0 ? local : (i === i1 ? local : 0);
        // Map overall progress within beat span for scrub
        const beatStart = i / (BEAT_META.length);
        const beatEnd = (i + 1) / (BEAT_META.length);
        const scrub = (progress - beatStart) / Math.max(0.001, beatEnd - beatStart);
        scrubVideo(L, Math.min(1, Math.max(0, scrub)));
        if (L.videoTex) L.videoTex.needsUpdate = true;
      }
    });

    // Camera drift
    camera.position.x = mouseSmooth.x * 0.22;
    camera.position.y = mouseSmooth.y * 0.12;
    camera.position.z = 8 - progress * 0.35;
    camera.lookAt(mouseSmooth.x * 0.1, mouseSmooth.y * 0.05, 0);

    // Dust drift
    const pos = dust.geometry.attributes.position.array;
    for (let i = 0; i < dustCount; i++) {
      pos[i * 3 + 1] += Math.sin(time * 0.3 + i) * 0.0008;
      pos[i * 3] += mouseSmooth.x * 0.0004;
    }
    dust.geometry.attributes.position.needsUpdate = true;
    dust.rotation.z = time * 0.01;
    dustMat.opacity = 0.08 + Math.abs(mouseSmooth.x) * 0.04;

    // Cursor glow
    glow.position.x = mouseSmooth.x * 3.2;
    glow.position.y = mouseSmooth.y * 2.0;
    // Keep near-invisible so it never reads as a circle on the photo
    const mouseDelta = Math.hypot(mouse.x - mouseSmooth.x, mouse.y - mouseSmooth.y);
    glowMat.opacity = Math.min(0.04, mouseDelta * 0.08);
    glow.visible = glowMat.opacity > 0.008;

    // Demo score climb on beat 1 — DOM only (no second needle)
    const onGauge = progress < 0.18;
    scoreEl.classList.toggle('on', onGauge);
    if (onGauge) {
      const climb = Math.min(1, progress / 0.16);
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
      L.mesh.geometry.dispose();
    });
    dustGeo.dispose();
    dustMat.dispose();
    glowGeo.dispose();
    glowMat.dispose();
    renderer.dispose();
  }

  // Kick first frame
  update(0);

  return { setProgress, setMouse, update, dispose, renderer, scene, camera };
}
