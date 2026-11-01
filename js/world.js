import * as THREE from 'three';
import { RGBELoader } from '../vendor/loaders/RGBELoader.js';
import { EffectComposer } from '../vendor/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from '../vendor/postprocessing/ShaderPass.js';
import { OutputPass } from '../vendor/postprocessing/OutputPass.js';

const FilmGrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uStrength: { value: 0.028 },
    uCA: { value: 0.0009 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uStrength; uniform float uCA;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      float r = texture2D(tDiffuse, uv + vec2(uCA, 0.0)).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - vec2(uCA, 0.0)).b;
      float n = hash(uv * vec2(1600.0, 900.0) + uTime * 40.0);
      // soft vignette
      float vig = smoothstep(1.15, 0.35, length(uv - 0.5));
      vec3 col = vec3(r,g,b) * vig + (n - 0.5) * uStrength;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

function makeMat(opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: opts.color ?? '#1a2a22',
    metalness: opts.metalness ?? 0.85,
    roughness: opts.roughness ?? 0.25,
    emissive: opts.emissive ?? '#000000',
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    clearcoat: opts.clearcoat ?? 0.7,
    clearcoatRoughness: opts.clearcoatRoughness ?? 0.18,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    transmission: opts.transmission ?? 0,
    thickness: opts.thickness ?? 0,
    ior: opts.ior ?? 1.5,
    envMapIntensity: opts.envMapIntensity ?? 1.35,
    side: opts.side ?? THREE.FrontSide,
  });
}

export async function createWorld(canvas, opts = {}) {
  const isMobile = opts.isMobile;
  const reduced = opts.reduced;
  const dprCap = isMobile ? 1.2 : 1.75;

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
  renderer.shadowMap.enabled = !isMobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#040706');
  // Lighter fog so distant geometry stays readable
  scene.fog = new THREE.FogExp2('#040706', isMobile ? 0.01 : 0.0055);

  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 280);
  camera.position.set(0, 1.6, 9);

  const hemi = new THREE.HemisphereLight('#c8ffe8', '#050a08', 0.45);
  scene.add(hemi);

  const key = new THREE.DirectionalLight('#fff1d0', 2.6);
  key.position.set(8, 16, 6);
  key.castShadow = !isMobile;
  if (!isMobile) {
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 80;
    key.shadow.camera.left = -30;
    key.shadow.camera.right = 30;
    key.shadow.camera.top = 30;
    key.shadow.camera.bottom = -30;
    key.shadow.bias = -0.0002;
  }
  scene.add(key);

  const fill = new THREE.PointLight('#2fd46a', 55, 55, 2);
  fill.position.set(-5, 4, 3);
  scene.add(fill);
  const rim = new THREE.PointLight('#f0c94a', 42, 50, 2);
  rim.position.set(6, 3, -8);
  scene.add(rim);
  // Volumetric-feel spot
  const spot = new THREE.SpotLight('#dfffea', 18, 40, Math.PI / 7, 0.55, 1.4);
  spot.position.set(0, 14, 4);
  spot.target.position.set(0, 0, 0);
  scene.add(spot);
  scene.add(spot.target);

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  let envMap = null;
  try {
    const hdr = await new RGBELoader().loadAsync('./assets/studio_small_09_1k.hdr');
    envMap = pmrem.fromEquirectangular(hdr).texture;
    hdr.dispose();
    scene.environment = envMap;
  } catch (e) {
    console.warn('HDRI load failed', e);
  }

  const worldRoot = new THREE.Group();
  scene.add(worldRoot);

  const zones = {
    emblem: buildEmblem(isMobile),
    report: buildReport(isMobile),
    bureaus: buildBureaus(isMobile),
    deck: buildDeck(isMobile),
    city: buildCity(isMobile),
    finale: buildFinale(isMobile),
  };

  // Zone centers along -Z corridor
  zones.emblem.group.position.set(0, 0, 0);
  zones.report.group.position.set(0, 0, -32);
  zones.bureaus.group.position.set(0, 0, -64);
  zones.deck.group.position.set(0, 0, -96);
  zones.city.group.position.set(0, 0, -128);
  zones.finale.group.position.set(0, 1.2, -168);

  Object.values(zones).forEach((z) => worldRoot.add(z.group));

  const dust = buildDust(isMobile ? 350 : 1100);
  scene.add(dust.points);

  // Cinematic camera path — push-in, weave, rise over city, settle on finale
  // Camera & look share similar parameterization so framing stays on-subject
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, 1.5, 8.2),      // 0 opening
    new THREE.Vector3(0.2, 1.2, 3.4),      // 1 push-in
    new THREE.Vector3(-0.5, 1.4, -10),     // 2 exit emblem
    new THREE.Vector3(1.2, 1.6, -26),      // 3 approach report
    new THREE.Vector3(0.0, 1.45, -32),     // 4 report
    new THREE.Vector3(-3.4, 2.5, -52),     // 5 weave
    new THREE.Vector3(0.0, 2.9, -64),      // 6 bureaus
    new THREE.Vector3(2.6, 2.5, -82),      // 7 toward deck
    new THREE.Vector3(0.0, 2.7, -94),      // 8 deck
    new THREE.Vector3(-1.0, 6.5, -114),    // 9 climb
    new THREE.Vector3(-3.0, 11.0, -126),   // 10 overlook
    new THREE.Vector3(2.0, 13.0, -134),    // 11 crest
    new THREE.Vector3(0.0, 4.2, -154),     // 12 descend
    new THREE.Vector3(0.0, 2.5, -164),     // 13 finale
  ], false, 'catmullrom', 0.25);

  const lookPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.9, 0),          // emblem
    new THREE.Vector3(0, 1.0, -2),
    new THREE.Vector3(0, 1.1, -20),
    new THREE.Vector3(0, 1.2, -32),        // report
    new THREE.Vector3(0, 2.6, -64),        // bureaus
    new THREE.Vector3(0, 2.1, -94),        // deck
    new THREE.Vector3(0, 3.0, -128),       // city core WHILE climbing
    new THREE.Vector3(0, 2.5, -132),       // city
    new THREE.Vector3(0, 1.8, -168),       // finale
  ], false, 'catmullrom', 0.25);

  let composer = null;
  let grainPass = null;
  let bloomPass = null;
  try {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      isMobile ? 0.22 : 0.32,
      0.55,
      0.35,
    );
    composer.addPass(bloomPass);
    if (!isMobile) {
      grainPass = new ShaderPass(FilmGrainShader);
      composer.addPass(grainPass);
    }
    composer.addPass(new OutputPass());
  } catch (e) {
    console.warn('Composer failed', e);
    composer = null;
  }

  const clock = new THREE.Clock();
  let progress = 0;
  let targetProgress = 0;
  const mouse = new THREE.Vector2(0, 0);
  const mouseSmooth = new THREE.Vector2(0, 0);
  let hoverBoost = 0;

  function setProgress(p) {
    targetProgress = THREE.MathUtils.clamp(p, 0, 1);
  }
  function setMouse(nx, ny) {
    mouse.set(nx, ny);
  }

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  const tmpCam = new THREE.Vector3();
  const tmpLook = new THREE.Vector3();

  function update(dt) {
    progress += (targetProgress - progress) * Math.min(1, dt * 3.8);
    mouseSmooth.lerp(mouse, 1 - Math.exp(-5.5 * dt));
    hoverBoost += ((Math.abs(mouse.x) + Math.abs(mouse.y) > 0.02 ? 1 : 0) - hoverBoost) * Math.min(1, dt * 3);

    const t = progress;
    path.getPointAt(Math.min(0.999, t), tmpCam);
    lookPath.getPointAt(Math.min(0.999, t * 1.01), tmpLook);

    tmpCam.x += mouseSmooth.x * 0.45;
    tmpCam.y += mouseSmooth.y * 0.22;
    camera.position.copy(tmpCam);
    camera.lookAt(
      tmpLook.x + mouseSmooth.x * 0.18,
      tmpLook.y + mouseSmooth.y * 0.1,
      tmpLook.z,
    );

    // Spot follows look
    spot.position.set(tmpCam.x, tmpCam.y + 6, tmpCam.z + 2);
    spot.target.position.copy(tmpLook);

    const time = clock.elapsedTime;
    zones.emblem.update(time, t, mouseSmooth);
    zones.report.update(time, t, mouseSmooth);
    zones.bureaus.update(time, t, mouseSmooth);
    zones.deck.update(time, t, mouseSmooth);
    zones.city.update(time, t, mouseSmooth);
    zones.finale.update(time, t, mouseSmooth);
    dust.update(time, mouseSmooth);

    fill.intensity = 40 + Math.sin(time * 1.2) * 8 + hoverBoost * 12;
    rim.intensity = 28 + Math.cos(time * 0.85) * 6;

    if (grainPass) {
      grainPass.uniforms.uTime.value = time;
      grainPass.uniforms.uStrength.value = reduced ? 0 : 0.022;
      grainPass.uniforms.uCA.value = reduced ? 0 : 0.0007 + hoverBoost * 0.0004;
    }

    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  function dispose() {
    window.removeEventListener('resize', onResize);
    renderer.dispose();
    envMap?.dispose();
    pmrem.dispose();
  }

  return { setProgress, setMouse, update, dispose, renderer, scene, camera };
}

/* ========== ZONE BUILDERS ========== */

function buildEmblem(isMobile) {
  const group = new THREE.Group();

  // Brushed pedestal
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.8, 0.55, 64),
    makeMat({ color: '#1a1c1a', metalness: 0.95, roughness: 0.32, clearcoat: 0.4 }),
  );
  pedestal.position.y = -1.55;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  group.add(pedestal);

  const pedTop = new THREE.Mesh(
    new THREE.CylinderGeometry(2.15, 2.15, 0.08, 64),
    makeMat({ color: '#c9a227', metalness: 1, roughness: 0.18, emissive: '#3a2a08', emissiveIntensity: 0.25 }),
  );
  pedTop.position.y = -1.24;
  group.add(pedTop);

  // Vertical gauge assembly facing camera (+Z)
  const gauge = new THREE.Group();
  gauge.position.set(0, 0.35, 0);

  // Chrome bezel
  const bezel = new THREE.Mesh(
    new THREE.TorusGeometry(1.55, 0.14, 28, isMobile ? 64 : 96),
    makeMat({ color: '#d8c078', metalness: 1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.8 }),
  );
  gauge.add(bezel);

  // Outer dark housing
  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(1.7, 1.78, 0.42, 64),
    makeMat({ color: '#0c1210', metalness: 0.9, roughness: 0.28 }),
  );
  housing.rotation.x = Math.PI / 2;
  housing.position.z = -0.12;
  housing.castShadow = true;
  gauge.add(housing);

  // Gauge face
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(1.42, 64),
    makeMat({ color: '#08140e', metalness: 0.35, roughness: 0.45, emissive: '#0c2418', emissiveIntensity: 0.35 }),
  );
  face.position.z = 0.12;
  gauge.add(face);

  // Tick marks
  const tickMat = makeMat({ color: '#e8f5ec', metalness: 0.5, roughness: 0.3, emissive: '#2fd46a', emissiveIntensity: 0.4 });
  for (let i = 0; i <= 12; i++) {
    const a = -Math.PI * 0.75 + (i / 12) * Math.PI * 1.5;
    const tick = new THREE.Mesh(new THREE.BoxGeometry(i % 3 === 0 ? 0.045 : 0.025, i % 3 === 0 ? 0.22 : 0.12, 0.02), tickMat);
    tick.position.set(Math.sin(a) * 1.15, Math.cos(a) * 1.15, 0.14);
    tick.rotation.z = -a;
    gauge.add(tick);
  }

  // Glass cover (transmission)
  if (!isMobile) {
    const glass = new THREE.Mesh(
      new THREE.CircleGeometry(1.48, 64),
      makeMat({
        color: '#ffffff', metalness: 0, roughness: 0.05,
        transmission: 0.92, thickness: 0.35, transparent: true, opacity: 1,
        clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.2,
      }),
    );
    glass.position.z = 0.22;
    gauge.add(glass);
  }

  // Needle pivot (rotate around Z, face toward +Z)
  const needlePivot = new THREE.Group();
  needlePivot.position.z = 0.16;
  const needle = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 1.15, 0.03),
    makeMat({ color: '#ffe08a', metalness: 1, roughness: 0.12, emissive: '#f0c94a', emissiveIntensity: 1.4 }),
  );
  needle.position.y = 0.45;
  needlePivot.add(needle);
  const hub = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 24, 24),
    makeMat({ color: '#f5d56a', metalness: 1, roughness: 0.08, emissive: '#f0c94a', emissiveIntensity: 1.0 }),
  );
  needlePivot.add(hub);
  gauge.add(needlePivot);

  // Green accent ring
  const accent = new THREE.Mesh(
    new THREE.TorusGeometry(1.78, 0.035, 12, 80),
    makeMat({ color: '#2fd46a', metalness: 0.7, roughness: 0.2, emissive: '#2fd46a', emissiveIntensity: 1.1 }),
  );
  gauge.add(accent);

  group.add(gauge);

  // Floating crystal above
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 1),
    makeMat({
      color: '#6dffb0', metalness: 0.15, roughness: 0.05,
      emissive: '#2fd46a', emissiveIntensity: 1.5,
      transmission: isMobile ? 0 : 0.55, thickness: 0.7, transparent: true, opacity: 0.95,
      clearcoat: 1,
    }),
  );
  core.position.set(0, 2.55, 0.3);
  group.add(core);

  // Orbiting brushed-gold shards
  const orbit = new THREE.Group();
  const shardGeo = new THREE.OctahedronGeometry(0.11, 0);
  const shardMat = makeMat({ color: '#e0c060', metalness: 1, roughness: 0.15, emissive: '#f0c94a', emissiveIntensity: 0.65, envMapIntensity: 1.6 });
  const nShards = isMobile ? 10 : 18;
  for (let i = 0; i < nShards; i++) {
    const s = new THREE.Mesh(shardGeo, shardMat);
    const a = (i / nShards) * Math.PI * 2;
    s.position.set(Math.cos(a) * 2.9, 0.6 + Math.sin(i * 1.7) * 0.5, Math.sin(a) * 2.9);
    s.castShadow = true;
    orbit.add(s);
  }
  group.add(orbit);

  // Score readout
  const scoreCanvas = document.createElement('canvas');
  scoreCanvas.width = 512; scoreCanvas.height = 256;
  const scoreTex = new THREE.CanvasTexture(scoreCanvas);
  scoreTex.colorSpace = THREE.SRGBColorSpace;
  const scorePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 1.3),
    new THREE.MeshBasicMaterial({ map: scoreTex, transparent: true, depthWrite: false }),
  );
  scorePlane.position.set(0, 3.55, 0.85);
  scorePlane.scale.setScalar(1.15);
  group.add(scorePlane);

  // Soft ground disc reflection catcher
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(7, 64),
    makeMat({ color: '#060a08', metalness: 0.95, roughness: 0.25, envMapIntensity: 0.8 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.82;
  floor.receiveShadow = true;
  group.add(floor);

  let shownScore = 580;
  function drawScore(v, label) {
    const ctx = scoreCanvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 256);
    ctx.font = '800 118px Syne, Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f2faf5';
    ctx.shadowColor = '#2fd46a';
    ctx.shadowBlur = 28;
    ctx.fillText(String(Math.round(v)), 256, 128);
    ctx.shadowBlur = 0;
    ctx.font = '700 26px Inter, sans-serif';
    ctx.fillStyle = '#f0c94a';
    ctx.fillText(label, 256, 188);
    scoreTex.needsUpdate = true;
  }
  drawScore(580, 'DEMO · SAMPLE START');

  return {
    group,
    update(time, t, mouse) {
      const local = THREE.MathUtils.clamp(t / 0.13, 0, 1);
      const climb = THREE.MathUtils.smootherstep(local, 0.12, 0.95);
      const score = 580 + (760 - 580) * climb;
      if (Math.abs(score - shownScore) > 0.35) {
        shownScore = score;
        drawScore(score, climb > 0.88 ? 'DEMO · SAMPLE DESTINATION' : 'DEMO · SAMPLE CLIMB');
      }
      // Needle: -135° → +135° around Z
      needlePivot.rotation.z = THREE.MathUtils.lerp(Math.PI * 0.75, -Math.PI * 0.75, climb);
      core.rotation.x = time * 0.45;
      core.rotation.y = time * 0.6;
      core.position.y = 2.55 + Math.sin(time * 1.4) * 0.07;
      orbit.rotation.y = time * 0.22;
      accent.rotation.z = time * 0.08;
      gauge.rotation.y = mouse.x * 0.18;
      gauge.rotation.x = mouse.y * 0.08;
      group.scale.setScalar(0.92 + local * 0.18);
    },
  };
}

function buildReport(isMobile) {
  const group = new THREE.Group();
  const papers = new THREE.Group();
  const shards = new THREE.Group();
  const letters = new THREE.Group();
  group.add(papers, shards, letters);

  // Realistic paper sheets with printed lines (canvas texture)
  function paperTexture(seed) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 340;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f3f7f4';
    ctx.fillRect(0, 0, 256, 340);
    ctx.fillStyle = '#1a4030';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.fillText('CREDIT REPORT · DEMO', 18, 28);
    ctx.strokeStyle = '#c5d5cb';
    ctx.beginPath(); ctx.moveTo(18, 36); ctx.lineTo(238, 36); ctx.stroke();
    ctx.fillStyle = '#4a6356';
    for (let y = 56; y < 300; y += 14) {
      const w = 120 + ((seed * 37 + y * 13) % 90);
      ctx.fillRect(18, y, w, 4);
      if ((y + seed) % 28 === 0) {
        ctx.fillStyle = '#c45c4a';
        ctx.fillRect(200, y, 38, 4);
        ctx.fillStyle = '#4a6356';
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  for (let i = 0; i < 6; i++) {
    const tex = paperTexture(i + 3);
    const p = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.018, 2.05),
      new THREE.MeshPhysicalMaterial({
        map: tex, metalness: 0.05, roughness: 0.55, clearcoat: 0.2,
        emissive: '#101810', emissiveIntensity: 0.04,
      }),
    );
    p.position.set((i - 2.5) * 0.06, 0.55 + i * 0.025, i * 0.03);
    p.rotation.z = (i - 2.5) * 0.015;
    p.castShadow = true;
    p.userData = { i };
    papers.add(p);
  }

  const shardGeo = new THREE.BoxGeometry(0.14, 0.02, 0.2);
  const shardMat = makeMat({ color: '#7dffb0', metalness: 0.35, roughness: 0.18, emissive: '#2fd46a', emissiveIntensity: 1.25 });
  const shardCount = isMobile ? 70 : 160;
  const shardData = [];
  for (let i = 0; i < shardCount; i++) {
    const m = new THREE.Mesh(shardGeo, shardMat);
    const a = Math.random() * Math.PI * 2;
    const r = 0.15 + Math.random() * 0.5;
    m.position.set(Math.cos(a) * r, 0.6, Math.sin(a) * r);
    m.userData = {
      ox: m.position.x, oy: m.position.y, oz: m.position.z,
      tx: (Math.random() - 0.5) * 9,
      ty: Math.random() * 4.5 + 0.4,
      tz: (Math.random() - 0.5) * 7,
      lx: (Math.random() - 0.5) * 2.6,
      ly: 0.35 + Math.random() * 1.8,
      lz: -0.15 + (Math.random() - 0.5) * 0.5,
      spin: 1 + Math.random() * 3,
    };
    shards.add(m);
    shardData.push(m);
  }

  // Rebuilt dispute letters with letterhead texture
  function letterTex(i) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 320;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fbfffc';
    ctx.fillRect(0, 0, 256, 320);
    ctx.fillStyle = '#0d3b28';
    ctx.fillRect(0, 0, 256, 36);
    ctx.fillStyle = '#f0c94a';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText('DISPUTE DRAFT · DEMO', 14, 24);
    ctx.fillStyle = '#2a4034';
    for (let y = 56; y < 280; y += 12) {
      ctx.fillRect(16, y, 180 + (i * 17 + y) % 40, 3);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  for (let i = 0; i < 5; i++) {
    const L = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 0.022, 1.6),
      new THREE.MeshPhysicalMaterial({
        map: letterTex(i), metalness: 0.08, roughness: 0.4, clearcoat: 0.25,
        emissive: '#0a2818', emissiveIntensity: 0.12,
      }),
    );
    L.position.set(-1.1 + i * 0.55, 0.25, 0.35);
    L.rotation.y = -0.4 + i * 0.15;
    L.castShadow = true;
    letters.add(L);
  }

  // Maxine — layered glass orb with inner core
  const orbGroup = new THREE.Group();
  const orbCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 32, 32),
    makeMat({ color: '#2fd46a', metalness: 0.1, roughness: 0.05, emissive: '#2fd46a', emissiveIntensity: 2.2 }),
  );
  orbGroup.add(orbCore);
  const orbShell = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 32, 32),
    makeMat({
      color: '#b8ffd4', metalness: 0.05, roughness: 0.05,
      transmission: isMobile ? 0 : 0.75, thickness: 0.9, transparent: true, opacity: 0.9,
      clearcoat: 1, clearcoatRoughness: 0.05, emissive: '#1a5030', emissiveIntensity: 0.35,
    }),
  );
  orbGroup.add(orbShell);
  const orbRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.78, 0.028, 12, 64),
    makeMat({ color: '#f0c94a', metalness: 1, roughness: 0.15, emissive: '#f0c94a', emissiveIntensity: 1.2 }),
  );
  orbRing.rotation.x = Math.PI / 2.5;
  orbGroup.add(orbRing);
  const orbRing2 = orbRing.clone();
  orbRing2.rotation.x = Math.PI / 1.7;
  orbRing2.scale.setScalar(0.85);
  orbGroup.add(orbRing2);
  orbGroup.position.set(2.4, 1.7, 0.6);
  group.add(orbGroup);

  const label = makeTextSprite('MAXINE · DEMO', '#f0c94a');
  label.position.set(2.4, 2.55, 0.6);
  group.add(label);

  // Stage floor
  const stage = new THREE.Mesh(
    new THREE.CylinderGeometry(5.5, 5.5, 0.08, 64),
    makeMat({ color: '#0a100e', metalness: 0.92, roughness: 0.28 }),
  );
  stage.position.y = -0.2;
  stage.receiveShadow = true;
  group.add(stage);

  return {
    group,
    update(time, t, mouse) {
      const local = THREE.MathUtils.clamp((t - 0.12) / 0.2, 0, 1);
      const explode = THREE.MathUtils.smootherstep(local, 0.04, 0.42);
      const rebuild = THREE.MathUtils.smootherstep(local, 0.48, 0.95);

      papers.children.forEach((p, i) => {
        p.position.y = 0.55 + i * 0.025 + explode * (1.4 + i * 0.4);
        p.position.x = (i - 2.5) * 0.06 + explode * (i - 2.5) * 0.7;
        p.rotation.x = explode * (0.9 + i * 0.12);
        p.rotation.z = (i - 2.5) * 0.015 + explode * (i - 2.5) * 0.45;
        p.material.opacity = 1 - explode * 0.97;
        p.material.transparent = true;
        p.visible = explode < 0.98;
      });

      shardData.forEach((m) => {
        const u = m.userData;
        const px = THREE.MathUtils.lerp(u.ox, u.tx, explode);
        const py = THREE.MathUtils.lerp(u.oy, u.ty, explode);
        const pz = THREE.MathUtils.lerp(u.oz, u.tz, explode);
        m.position.x = THREE.MathUtils.lerp(px, u.lx, rebuild);
        m.position.y = THREE.MathUtils.lerp(py, u.ly, rebuild);
        m.position.z = THREE.MathUtils.lerp(pz, u.lz, rebuild);
        m.rotation.x = time * u.spin * (1 - rebuild * 0.85);
        m.rotation.y = time * u.spin * 0.65;
        m.scale.setScalar(0.55 + explode * 0.9 - rebuild * 0.35);
        m.visible = explode > 0.02;
      });

      letters.children.forEach((L, i) => {
        L.position.y = 0.25 + rebuild * (0.55 + i * 0.1) + Math.sin(time * 2 + i) * 0.035 * rebuild;
        L.scale.setScalar(0.15 + rebuild * 0.85);
        L.material.emissiveIntensity = 0.12 + rebuild * 0.55;
      });

      orbGroup.position.x = 2.4 + mouse.x * 0.45;
      orbGroup.position.y = 1.7 + Math.sin(time * 2.1) * 0.12 + mouse.y * 0.22;
      orbGroup.scale.setScalar(0.9 + rebuild * 0.3 + Math.sin(time * 3) * 0.04);
      orbRing.rotation.z = time * 1.1;
      orbRing2.rotation.z = -time * 0.9;
      label.position.copy(orbGroup.position).add(new THREE.Vector3(0, 0.95, 0));
    },
  };
}

function buildBureaus(isMobile) {
  const group = new THREE.Group();
  const names = ['EQUIFAX', 'EXPERIAN', 'TRANSUNION'];
  const scores = [652, 665, 639];
  const towers = [];

  names.forEach((name, i) => {
    const g = new THREE.Group();
    const h = 7.2 + i * 1.1;
    // Main tower body — brushed metal
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(1.85, h, 1.85),
      makeMat({
        color: i === 1 ? '#1c2210' : '#121a16',
        metalness: 0.88, roughness: 0.22,
        emissive: i === 1 ? '#3a2a08' : '#0a2818',
        emissiveIntensity: 0.4,
        clearcoat: 0.5,
        envMapIntensity: 1.5,
      }),
    );
    tower.position.y = h / 2;
    tower.castShadow = true;
    tower.receiveShadow = true;
    g.add(tower);

    // Chrome crown
    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.18, 2.0),
      makeMat({ color: i === 1 ? '#f0c94a' : '#2fd46a', metalness: 1, roughness: 0.12, emissive: i === 1 ? '#f0c94a' : '#2fd46a', emissiveIntensity: 0.7 }),
    );
    crown.position.y = h + 0.05;
    g.add(crown);

    // Edge glow strips
    const stripMat = new THREE.MeshBasicMaterial({
      color: i === 1 ? '#f0c94a' : '#2fd46a',
      transparent: true, opacity: 0.55,
    });
    for (let s = 0; s < 4; s++) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.04, h * 0.92, 0.04), stripMat);
      const sx = (s % 2 === 0 ? 1 : -1) * 0.94;
      const sz = (s < 2 ? 1 : -1) * 0.94;
      strip.position.set(sx, h / 2, sz);
      g.add(strip);
    }

    // Holo score
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.55, 1.55),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    plane.position.set(0, h + 1.15, 1.05);
    g.add(plane);

    // Glass hologram frame
    const holoFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 1.65, 0.06),
      makeMat({
        color: '#a8ffd0', metalness: 0.1, roughness: 0.1,
        transmission: isMobile ? 0 : 0.6, thickness: 0.2, transparent: true, opacity: 0.35,
        emissive: i === 1 ? '#3a2a08' : '#0a2818', emissiveIntensity: 0.3,
      }),
    );
    holoFrame.position.copy(plane.position);
    holoFrame.position.z -= 0.04;
    g.add(holoFrame);

    g.position.set((i - 1) * 4.6, 0, 0);
    g.userData = { name, base: scores[i], canvas: c, ctx, tex, plane, h, i };
    group.add(g);
    towers.push(g);
  });

  const pathMesh = new THREE.Mesh(
    new THREE.BoxGeometry(16, 0.06, 10),
    makeMat({ color: '#080e0c', metalness: 0.95, roughness: 0.3 }),
  );
  pathMesh.position.y = -0.03;
  pathMesh.receiveShadow = true;
  group.add(pathMesh);

  // Ambient pillars light
  const pathLight = new THREE.PointLight('#2fd46a', 30, 18, 2);
  pathLight.position.set(0, 3, 2);
  group.add(pathLight);

  return {
    group,
    update(time, t, mouse) {
      const local = THREE.MathUtils.clamp((t - 0.30) / 0.2, 0, 1);
      towers.forEach((g) => {
        const u = g.userData;
        const climb = THREE.MathUtils.smootherstep(local, 0.08 + u.i * 0.1, 0.75 + u.i * 0.08);
        const score = Math.round(u.base - 45 + 55 * climb);
        const ctx = u.ctx;
        ctx.clearRect(0, 0, 256, 256);
        ctx.fillStyle = 'rgba(4,10,8,0.65)';
        ctx.fillRect(16, 16, 224, 224);
        ctx.strokeStyle = u.i === 1 ? '#f0c94a' : '#2fd46a';
        ctx.lineWidth = 3;
        ctx.strokeRect(16, 16, 224, 224);
        ctx.fillStyle = '#f2faf5';
        ctx.font = '800 78px Syne, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = u.i === 1 ? '#f0c94a' : '#2fd46a';
        ctx.shadowBlur = 18;
        ctx.fillText(String(score), 128, 128);
        ctx.shadowBlur = 0;
        ctx.font = '700 18px Inter, sans-serif';
        ctx.fillStyle = u.i === 1 ? '#f0c94a' : '#2fd46a';
        ctx.fillText(u.name, 128, 168);
        ctx.font = '600 13px Inter, sans-serif';
        ctx.fillStyle = '#9bb5a6';
        ctx.fillText('DEMO · NOT LIVE', 128, 196);
        u.tex.needsUpdate = true;
        u.plane.quaternion.copy(u.plane.parent.getWorldQuaternion(new THREE.Quaternion()));
        // billboard-ish toward +Z roughly
        u.plane.rotation.set(0, 0, 0);
        g.position.y = Math.sin(time * 1.1 + u.i) * 0.1 * climb;
        g.scale.y = 0.5 + climb * 0.5;
        g.rotation.y = mouse.x * 0.06 * (u.i - 1);
      });
    },
  };
}

function buildDeck(isMobile) {
  const group = new THREE.Group();

  // Central glass platform
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.5, 0.12, 64),
    makeMat({
      color: '#14241c', metalness: 0.6, roughness: 0.12,
      transmission: isMobile ? 0 : 0.25, thickness: 0.4, transparent: true, opacity: 0.9,
      emissive: '#0a2018', emissiveIntensity: 0.3, clearcoat: 1,
    }),
  );
  platform.position.y = 0.8;
  platform.receiveShadow = true;
  group.add(platform);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(4.4, 0.06, 12, 80),
    makeMat({ color: '#f0c94a', metalness: 1, roughness: 0.15, emissive: '#f0c94a', emissiveIntensity: 0.9 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.88;
  group.add(ring);

  // Vertical chrome column
  const col = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.35, 3.6, 32),
    makeMat({ color: '#d4b44a', metalness: 1, roughness: 0.1, clearcoat: 1, emissive: '#3a2a08', emissiveIntensity: 0.35, envMapIntensity: 1.8 }),
  );
  col.position.y = 2.4;
  col.castShadow = true;
  group.add(col);

  const titles = ['CLIENT PORTAL', 'WHITE-LABEL', 'AUTOMATIONS', 'CRM SYNC', 'MESSAGING', 'BOOKING'];
  const panels = [];

  function dashTex(title, accent) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 320;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0a1410';
    ctx.fillRect(0, 0, 512, 320);
    // glass sheen
    const grd = ctx.createLinearGradient(0, 0, 512, 320);
    grd.addColorStop(0, 'rgba(47,212,106,0.12)');
    grd.addColorStop(1, 'rgba(240,201,74,0.08)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 512, 320);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, 496, 304);
    ctx.fillStyle = accent;
    ctx.font = '700 22px Inter, sans-serif';
    ctx.fillText(title, 28, 42);
    // fake chart bars
    for (let i = 0; i < 8; i++) {
      const h = 40 + ((i * 47) % 120);
      ctx.fillStyle = i % 2 ? '#2fd46a' : '#f0c94a';
      ctx.globalAlpha = 0.75;
      ctx.fillRect(40 + i * 55, 260 - h, 36, h);
    }
    ctx.globalAlpha = 1;
    // KPI pills
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(28, 60, 140, 36);
    ctx.fillRect(180, 60, 140, 36);
    ctx.fillStyle = '#e8f5ec';
    ctx.font = '600 14px Inter, sans-serif';
    ctx.fillText('DEMO DATA', 44, 84);
    ctx.fillText('LIVE PREVIEW', 196, 84);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const g = new THREE.Group();
    const tex = dashTex(titles[i], i % 2 ? '#f0c94a' : '#2fd46a');
    // Glass panel body
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 1.75, 0.1),
      makeMat({
        color: '#101a16', metalness: 0.55, roughness: 0.12,
        transmission: isMobile ? 0 : 0.18, thickness: 0.25, transparent: true, opacity: 0.92,
        emissive: i % 2 ? '#2a1e08' : '#0a2818', emissiveIntensity: 0.35,
        clearcoat: 0.9,
      }),
    );
    g.add(panel);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 1.55),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
    );
    screen.position.z = 0.05;
    g.add(screen);
    // Metal frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(2.9, 1.85, 0.06),
      makeMat({ color: '#c9a227', metalness: 1, roughness: 0.2, envMapIntensity: 1.5 }),
    );
    frame.position.z = -0.02;
    g.add(frame);

    g.position.set(Math.cos(ang) * 3.6, 2.15, Math.sin(ang) * 3.6);
    g.lookAt(0, 2.15, 0);
    g.userData = { ang, i, baseY: 2.15 };
    group.add(g);
    panels.push(g);
  }

  // Connecting energy beams
  const beamMat = new THREE.MeshBasicMaterial({ color: '#2fd46a', transparent: true, opacity: 0.4 });
  const beams = [];
  for (let i = 0; i < 6; i++) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.8, 6), beamMat);
    group.add(beam);
    beams.push(beam);
  }

  // Floor mirror
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(7, 64),
    makeMat({ color: '#030605', metalness: 0.6, roughness: 0.45 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  group.add(floor);

  const deckLight = new THREE.PointLight('#f0c94a', 28, 16, 2);
  deckLight.position.set(0, 4, 0);
  group.add(deckLight);

  return {
    group,
    update(time, t, mouse) {
      const local = THREE.MathUtils.clamp((t - 0.44) / 0.2, 0, 1);
      const on = THREE.MathUtils.smootherstep(local, 0.0, 0.55);
      group.rotation.y = time * 0.08 + mouse.x * 0.12;
      panels.forEach((p, i) => {
        const u = p.userData;
        const floatY = u.baseY + Math.sin(time * 1.4 + i) * 0.14 * on;
        const r = 3.6 - on * 0.4 + mouse.y * 0.12;
        p.position.set(Math.cos(u.ang + time * 0.08) * r, floatY, Math.sin(u.ang + time * 0.08) * r);
        p.lookAt(0, floatY, 0);
        p.scale.setScalar(0.55 + on * 0.55);
        beams[i].position.set(p.position.x * 0.5, (floatY + 1.5) * 0.5, p.position.z * 0.5);
        beams[i].lookAt(p.position);
        beams[i].rotateX(Math.PI / 2);
        beams[i].material.opacity = 0.12 + on * 0.4;
      });
      col.scale.y = 0.45 + on * 0.55;
      ring.scale.setScalar(0.7 + on * 0.3);
    },
  };
}

function buildCity(isMobile) {
  const group = new THREE.Group();
  const count = isMobile ? 60 : 140;
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = makeMat({
    color: '#15241c',
    metalness: 0.9,
    roughness: 0.22,
    emissive: '#0e2a1c',
    emissiveIntensity: 0.35,
    clearcoat: 0.3,
    envMapIntensity: 1.3,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.castShadow = !isMobile;
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const data = [];
  // Dense downtown cluster
  for (let i = 0; i < count; i++) {
    const ring = Math.floor(i / 20);
    const a = (i / count) * Math.PI * 2 * 3.2 + i * 0.37;
    const r = 1.5 + (i % 17) * 0.55 + ring * 0.3;
    const x = Math.cos(a) * r * (0.7 + (i % 5) * 0.08);
    const z = Math.sin(a) * r * 0.85;
    const h = 2.4 + (i % 11) * 1.15 + (i % 3) * 2.2 + (i % 9 === 0 ? 4 : 0);
    data.push({ x, z, h, phase: Math.random() * Math.PI * 2, w: 0.65 + (i % 4) * 0.2 });
  }
  group.add(mesh);

  // Window lights as second instanced emissive boxes
  const winCount = isMobile ? 80 : 220;
  const winGeo = new THREE.BoxGeometry(0.12, 0.12, 0.04);
  const winMat = new THREE.MeshBasicMaterial({ color: '#f0c94a', transparent: true, opacity: 0.85 });
  const wins = new THREE.InstancedMesh(winGeo, winMat, winCount);
  const winDummy = new THREE.Object3D();
  const winData = [];
  for (let i = 0; i < winCount; i++) {
    const b = data[i % count];
    winData.push({
      x: b.x + (Math.random() - 0.5) * b.w,
      z: b.z + (Math.random() - 0.5) * b.w,
      yBase: 0.4 + Math.random() * b.h,
      bIdx: i % count,
      phase: Math.random() * Math.PI * 2,
    });
  }
  group.add(wins);

  // Gold light trails
  const trails = [];
  for (let i = 0; i < (isMobile ? 4 : 8); i++) {
    const pts = [];
    for (let k = 0; k < 24; k++) {
      pts.push(new THREE.Vector3(
        Math.sin(k * 0.35 + i * 1.1) * (5 + i * 0.6),
        0.8 + k * 0.35,
        Math.cos(k * 0.28 + i) * (4 + i * 0.4) - 2,
      ));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 80, 0.045, 6, false),
      makeMat({ color: '#f0c94a', metalness: 1, roughness: 0.12, emissive: '#f0c94a', emissiveIntensity: 1.6 }),
    );
    group.add(tube);
    trails.push(tube);
  }

  // Ground
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(22, 64),
    makeMat({ color: '#030605', metalness: 0.55, roughness: 0.55, emissive: '#020403', emissiveIntensity: 0.05 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // Horizon glow orb
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 32, 32),
    makeMat({ color: '#f0c94a', metalness: 0.2, roughness: 0.3, emissive: '#f0c94a', emissiveIntensity: 2.5 }),
  );
  sun.position.set(0, 4.5, -14);
  group.add(sun);
  const sunRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.05, 12, 64),
    makeMat({ color: '#ffe08a', metalness: 1, roughness: 0.2, emissive: '#f0c94a', emissiveIntensity: 1.2 }),
  );
  sunRing.position.copy(sun.position);
  group.add(sunRing);
  const sunRing2 = sunRing.clone();
  sunRing2.scale.setScalar(1.35);
  sunRing2.rotation.x = Math.PI / 3;
  group.add(sunRing2);

  const readiness = makeTextSprite('SAMPLE READINESS · DEMO · NO FUNDING PROMISE', '#f0c94a');
  readiness.position.set(0, 8.5, 0);
  readiness.scale.set(6, 0.6, 1);
  group.add(readiness);

  const cityLight = new THREE.PointLight('#f0c94a', 50, 40, 2);
  cityLight.position.set(0, 8, -6);
  group.add(cityLight);

  return {
    group,
    update(time, t, mouse) {
      const local = THREE.MathUtils.clamp((t - 0.55) / 0.28, 0, 1);
      const rise = THREE.MathUtils.smootherstep(local, 0.0, 0.55);
      data.forEach((d, i) => {
        const h = d.h * rise * (0.9 + 0.1 * Math.sin(time * 0.8 + d.phase));
        dummy.position.set(d.x, h / 2, d.z);
        dummy.scale.set(d.w, Math.max(0.08, h), d.w);
        dummy.rotation.y = (i % 7) * 0.08;
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;

      winData.forEach((w, i) => {
        const b = data[w.bIdx];
        const h = b.h * rise;
        const y = Math.min(w.yBase, h) * (0.3 + rise * 0.7);
        winDummy.position.set(w.x, y, w.z + b.w * 0.5);
        const on = (Math.sin(time * 2 + w.phase) * 0.5 + 0.5) > 0.25 && rise > 0.2;
        winDummy.scale.setScalar(on ? 1 : 0.01);
        winDummy.updateMatrix();
        wins.setMatrixAt(i, winDummy.matrix);
      });
      wins.instanceMatrix.needsUpdate = true;

      trails.forEach((tr, i) => {
        tr.rotation.y = time * 0.06 * (i % 2 ? 1 : -1);
        tr.scale.setScalar(0.25 + rise * 0.75);
        tr.position.y = rise * 0.8;
      });
      sun.position.y = 3.5 + rise * 2.5;
      sunRing.rotation.z = time * 0.2;
      sunRing2.rotation.z = -time * 0.15;
      readiness.position.y = 7 + rise * 3 + mouse.y * 0.4;
      readiness.material.opacity = 0.25 + rise * 0.75;
      group.rotation.y = mouse.x * 0.06;
    },
  };
}

function buildFinale(isMobile) {
  const group = new THREE.Group();

  // Reflective stage
  const stage = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 5.5, 0.15, 64),
    makeMat({ color: '#0c1210', metalness: 0.98, roughness: 0.15, envMapIntensity: 1.6 }),
  );
  stage.position.y = -0.8;
  stage.receiveShadow = true;
  group.add(stage);

  const emblem = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.25, 1),
    makeMat({
      color: '#6dffb0', metalness: 0.25, roughness: 0.05,
      emissive: '#2fd46a', emissiveIntensity: 1.7,
      transmission: isMobile ? 0 : 0.45, thickness: 1.1, transparent: true,
      clearcoat: 1, clearcoatRoughness: 0.05,
    }),
  );
  emblem.position.y = 0.9;
  group.add(emblem);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.15, 0.09, 20, 100),
    makeMat({ color: '#f0c94a', metalness: 1, roughness: 0.12, emissive: '#f0c94a', emissiveIntensity: 1.2, envMapIntensity: 1.8 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.9;
  group.add(ring);
  const ring2 = ring.clone();
  ring2.scale.setScalar(1.28);
  ring2.rotation.x = Math.PI / 3;
  group.add(ring2);
  const ring3 = ring.clone();
  ring3.scale.setScalar(1.55);
  ring3.rotation.x = Math.PI / 2.4;
  ring3.rotation.y = Math.PI / 5;
  group.add(ring3);

  const burstCount = isMobile ? 50 : 120;
  const burstGeo = new THREE.SphereGeometry(0.055, 8, 8);
  const burstMat = makeMat({ color: '#ffe08a', metalness: 1, roughness: 0.18, emissive: '#f0c94a', emissiveIntensity: 1.6 });
  const burst = new THREE.Group();
  for (let i = 0; i < burstCount; i++) {
    burst.add(new THREE.Mesh(burstGeo, burstMat));
  }
  group.add(burst);

  const finaleLight = new THREE.PointLight('#2fd46a', 40, 20, 2);
  finaleLight.position.set(0, 3, 2);
  group.add(finaleLight);

  return {
    group,
    update(time, t, mouse) {
      const local = THREE.MathUtils.clamp((t - 0.82) / 0.18, 0, 1);
      const collapse = THREE.MathUtils.smootherstep(local, 0.0, 0.55);
      const reveal = THREE.MathUtils.smootherstep(local, 0.35, 1);
      emblem.rotation.x = time * 0.55;
      emblem.rotation.y = time * 0.72;
      emblem.scale.setScalar(0.35 + collapse * 1.0 + Math.sin(time * 2) * 0.04);
      ring.rotation.z = time * 0.45;
      ring2.rotation.z = -time * 0.32;
      ring3.rotation.z = time * 0.2;
      ring.scale.setScalar(1.6 - collapse * 0.55 + reveal * 0.25);
      burst.children.forEach((s, i) => {
        const a = (i / burstCount) * Math.PI * 2;
        const r = (1 - collapse) * 7 + reveal * (1.6 + (i % 5) * 0.22);
        s.position.set(
          Math.cos(a + time * 0.6) * r,
          0.9 + Math.sin(a * 1.4 + time) * r * 0.35,
          Math.sin(a + time * 0.6) * r,
        );
      });
      group.position.x = mouse.x * 0.25;
      group.position.y = 1.2 + mouse.y * 0.15;
    },
  };
}

function buildDust(count) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 70;
    pos[i * 3 + 1] = Math.random() * 22 - 2;
    pos[i * 3 + 2] = -Math.random() * 190 + 12;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: '#9dffc8', size: 0.04, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  return {
    points,
    update(time, mouse) {
      points.rotation.y = time * 0.015 + mouse.x * 0.015;
      const arr = geo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        arr[i * 3 + 1] += Math.sin(time * 0.7 + i) * 0.0012;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

function makeTextSprite(text, color) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 1024, 256);
  ctx.font = '700 64px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.fillText(text, 512, 140);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  return new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.7), mat);
}
