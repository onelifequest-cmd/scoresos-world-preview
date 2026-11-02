/**
 * Lumea-style live WebGL opening — extruded Score OS emblem (SVGLoader + ExtrudeGeometry),
 * floating rock, amber rings, volumetric shaft, fog + moonlight, InstancedMesh debris.
 * Free stack only: three.js, Poly Haven HDRI, UnrealBloomPass. No Meshy/Tripo.
 */
import * as THREE from 'three';
import { RGBELoader } from '../vendor/loaders/RGBELoader.js';
import { SVGLoader } from '../vendor/loaders/SVGLoader.js';
import { EffectComposer } from '../vendor/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/postprocessing/OutputPass.js';

const CHIP_LABELS = ['DENIED', 'LATE', 'COLLECTION'];

function makeChipTexture(label) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#0c100e';
  g.fillRect(0, 0, 256, 96);
  g.strokeStyle = 'rgba(212,175,55,0.55)';
  g.lineWidth = 4;
  g.strokeRect(4, 4, 248, 88);
  g.fillStyle = '#e8d5a3';
  g.font = '700 36px Inter, system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(label, 128, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function displaceRock(geo, amount = 0.18) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = Math.sin(v.x * 3.1 + v.y * 2.7) * Math.cos(v.z * 4.2 + v.x * 1.3);
    v.addScaledVector(v.clone().normalize(), n * amount);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function goldMat(extra = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xd4af37,
    metalness: 1,
    roughness: 0.22,
    clearcoat: 0.75,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.45,
    ...extra,
  });
}

function glassMat(isMobile) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xe8f6ef,
    metalness: 0.04,
    roughness: 0.06,
    transmission: isMobile ? 0.5 : 0.86,
    thickness: 0.7,
    ior: 1.48,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    transparent: true,
    opacity: 1,
    envMapIntensity: 1.15,
  });
}

function greenMat() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x1a6b3c,
    metalness: 0.55,
    roughness: 0.28,
    emissive: 0x0a3d22,
    emissiveIntensity: 0.35,
    clearcoat: 0.4,
    envMapIntensity: 0.9,
  });
}

/** Extrude Score OS emblem SVG into real bevelled 3D with glass + gold materials. */
async function buildExtrudedEmblem(isMobile) {
  const loader = new SVGLoader();
  let data;
  try {
    data = await loader.loadAsync('./media/emblem.svg');
  } catch (e) {
    console.warn('emblem.svg load failed, procedural fallback', e);
    return buildProceduralGauge(isMobile);
  }

  const group = new THREE.Group();
  const glass = glassMat(isMobile);
  const gold = goldMat();
  const green = greenMat();
  const jewel = goldMat({ color: 0xf4d96b, emissive: 0xf0c94a, emissiveIntensity: 0.55, roughness: 0.18 });

  // SVG is in pixel space; center + scale to ~1.6 world units
  const box = new THREE.Box3();
  const extrudeSettings = {
    depth: 18,
    bevelEnabled: true,
    bevelThickness: 3.2,
    bevelSize: 2.4,
    bevelOffset: 0,
    bevelSegments: isMobile ? 2 : 4,
  };

  data.paths.forEach((path) => {
    const fill = path.userData?.style?.fill;
    let mat = gold;
    if (fill) {
      const f = String(fill).toLowerCase();
      if (f.includes('1a6b3c') || f.includes('green')) mat = green;
      else if (f.includes('f4d96b') || f.includes('f0c94a')) mat = jewel;
      else if (f.includes('dde') || f.includes('e8') || f.includes('fff')) mat = glass;
      else mat = gold;
    }
    const shapes = SVGLoader.createShapes(path);
    shapes.forEach((shape) => {
      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      box.expandByObject(mesh);
    });
  });

  // Glass dial plate behind the extruded rings
  const dial = new THREE.Mesh(
    new THREE.CylinderGeometry(52, 52, 6, 64),
    glass,
  );
  dial.rotation.x = Math.PI / 2;
  dial.position.set(90, 90, -4);
  dial.castShadow = true;
  group.add(dial);
  box.expandByObject(dial);

  // Normalize: SVG Y-down → flip, center, scale
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);
  group.children.forEach((ch) => {
    ch.position.x -= center.x;
    ch.position.y -= center.y;
    ch.position.z -= center.z;
  });
  group.scale.setScalar(1.65 / Math.max(size.x, size.y, 1));
  group.rotation.x = Math.PI; // flip Y from SVG
  // Face camera: extruded depth along Z after flip
  group.rotation.x = Math.PI;

  // Soft wrap in a facing group so we can spin yaw cleanly
  const wrap = new THREE.Group();
  // After PI flip on X, emblem faces -Z; rotate to face +Z toward default camera
  group.rotation.set(Math.PI, Math.PI, 0);
  wrap.add(group);

  // Extra gold bezel ring in world space for readability
  const bezel = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.045, 16, 80),
    goldMat({ roughness: 0.18 }),
  );
  bezel.rotation.x = Math.PI / 2;
  wrap.add(bezel);

  // Needle
  const needle = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.55, 0.02),
    goldMat({ color: 0xfff2c8, emissive: 0xffe08a, emissiveIntensity: 1.1 }),
  );
  needle.position.set(0.1, 0.18, 0.12);
  needle.rotation.z = -0.5;
  wrap.add(needle);

  return wrap;
}

function buildProceduralGauge(isMobile) {
  const wrap = new THREE.Group();
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.16, 64), glassMat(isMobile));
  dial.rotation.x = Math.PI / 2;
  wrap.add(dial);
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.055, 16, 80), goldMat());
  bezel.rotation.x = Math.PI / 2;
  wrap.add(bezel);
  const arc = new THREE.Mesh(
    new THREE.TorusGeometry(0.52, 0.03, 12, 64, Math.PI * 1.35),
    greenMat(),
  );
  arc.rotation.x = Math.PI / 2;
  arc.rotation.z = -Math.PI * 0.15;
  wrap.add(arc);
  const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 24), goldMat({ emissive: 0xf0c94a, emissiveIntensity: 0.6 }));
  jewel.position.set(0, 0.18, 0.1);
  wrap.add(jewel);
  return wrap;
}

export async function createLumeaHero(canvas, {
  isMobile = false,
  reduced = false,
  onProgress = () => {},
} = {}) {
  const dprCap = isMobile ? 1.5 : 2;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = !isMobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  // Transparent clear so HTML headline can sit behind the monolith
  scene.background = null;
  scene.fog = new THREE.FogExp2(0x060a10, 0.038);

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 80);
  camera.position.set(0, 1.4, 7.2);

  const moon = new THREE.DirectionalLight(0xc4d4f0, 1.25);
  moon.position.set(-7, 11, -5);
  moon.castShadow = !isMobile;
  if (!isMobile) {
    moon.shadow.mapSize.set(1024, 1024);
    moon.shadow.camera.near = 1;
    moon.shadow.camera.far = 32;
    moon.shadow.camera.left = -9;
    moon.shadow.camera.right = 9;
    moon.shadow.camera.top = 9;
    moon.shadow.camera.bottom = -9;
  }
  scene.add(moon);

  // Cool moonlight rim
  const moonFill = new THREE.DirectionalLight(0x8aa0c8, 0.35);
  moonFill.position.set(5, 4, 6);
  scene.add(moonFill);

  const key = new THREE.SpotLight(0xffe2a8, 20, 30, Math.PI / 7, 0.55, 1.4);
  key.position.set(0.35, 9.8, 1.1);
  key.target.position.set(0, 0.7, 0);
  scene.add(key, key.target);

  scene.add(new THREE.HemisphereLight(0x6a7a9a, 0x0a0c10, 0.32));
  scene.add(new THREE.AmbientLight(0x1a2230, 0.22));

  onProgress(0.08);

  const pmrem = new THREE.PMREMGenerator(renderer);
  let envMap = null;
  try {
    const hdr = await new RGBELoader().loadAsync('./media/hdri/moonless_golf_1k.hdr');
    envMap = pmrem.fromEquirectangular(hdr).texture;
    scene.environment = envMap;
    hdr.dispose();
  } catch (_) {
    try {
      const hdr2 = await new RGBELoader().loadAsync('./media/hdri/studio_small_09_1k.hdr');
      envMap = pmrem.fromEquirectangular(hdr2).texture;
      scene.environment = envMap;
      hdr2.dispose();
    } catch (__) {}
  }
  pmrem.dispose();
  onProgress(0.2);

  const texLoader = new THREE.TextureLoader();
  let rockDiff = null, rockNor = null, rockRough = null;
  try {
    rockDiff = await texLoader.loadAsync('./media/textures/rock/diff_1k.jpg');
    rockDiff.colorSpace = THREE.SRGBColorSpace;
    rockDiff.wrapS = rockDiff.wrapT = THREE.RepeatWrapping;
    rockDiff.repeat.set(2, 2);
    rockNor = await texLoader.loadAsync('./media/textures/rock/nor_gl_1k.jpg');
    rockNor.wrapS = rockNor.wrapT = THREE.RepeatWrapping;
    rockNor.repeat.set(2, 2);
    rockRough = await texLoader.loadAsync('./media/textures/rock/rough_1k.jpg');
    rockRough.wrapS = rockRough.wrapT = THREE.RepeatWrapping;
    rockRough.repeat.set(2, 2);
  } catch (_) {}
  onProgress(0.32);

  const root = new THREE.Group();
  scene.add(root);

  const rockGeo = displaceRock(new THREE.IcosahedronGeometry(1.35, 3), 0.22);
  const rock = new THREE.Mesh(rockGeo, new THREE.MeshPhysicalMaterial({
    color: 0x2a2e2c,
    map: rockDiff || null,
    normalMap: rockNor || null,
    roughnessMap: rockRough || null,
    roughness: 0.92,
    metalness: 0.08,
    clearcoat: 0.12,
    clearcoatRoughness: 0.6,
    envMapIntensity: 0.35,
  }));
  rock.position.y = -0.15;
  rock.castShadow = true;
  rock.receiveShadow = true;
  root.add(rock);

  onProgress(0.4);
  const gauge = await buildExtrudedEmblem(isMobile);
  gauge.position.y = 1.58;
  root.add(gauge);
  onProgress(0.55);

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffc857,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.012, 12, 128), ringMat);
  ringA.rotation.x = Math.PI / 2.15;
  root.add(ringA);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.01, 12, 128), ringMat.clone());
  ringB.rotation.x = Math.PI / 1.85;
  ringB.rotation.y = 0.4;
  root.add(ringB);

  const shaftMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(0xffe6b0) },
      uOpacity: { value: 0.22 },
      uTime: { value: 0 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity; uniform float uTime; varying vec2 vUv;
      void main(){
        float axial = smoothstep(0.0,0.15,vUv.y)*smoothstep(1.0,0.55,vUv.y);
        float radial = pow(1.0 - abs(vUv.x-0.5)*2.0, 1.6);
        float pulse = 0.85 + 0.15*sin(uTime*0.7);
        gl_FragColor = vec4(uColor, axial*radial*uOpacity*pulse);
      }`,
  });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 1.8, 10, 32, 1, true), shaftMat);
  shaft.position.y = 5.2;
  root.add(shaft);

  // Soft fog disc + distant moonlight glow
  const fogDisc = new THREE.Mesh(
    new THREE.CircleGeometry(16, 48),
    new THREE.MeshBasicMaterial({ color: 0x0a1218, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  fogDisc.rotation.x = -Math.PI / 2;
  fogDisc.position.y = -1.45;
  scene.add(fogDisc);

  const moonGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xdde6ff, transparent: true, opacity: 0.55 }),
  );
  moonGlow.position.set(-8, 9.5, -10);
  scene.add(moonGlow);
  const moonHalo = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0xa8b8e0, transparent: true, opacity: 0.12,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  moonHalo.position.copy(moonGlow.position);
  scene.add(moonHalo);

  // Debris InstancedMesh (spring parting — Rapier upgrade path noted)
  const chipCount = isMobile ? 70 : 160;
  const chipGeo = new THREE.BoxGeometry(0.42, 0.16, 0.04);
  const chipMats = CHIP_LABELS.map((lab) => new THREE.MeshStandardMaterial({
    map: makeChipTexture(lab), roughness: 0.55, metalness: 0.25, envMapIntensity: 0.4,
  }));
  const debrisGroups = [];
  const per = Math.floor(chipCount / CHIP_LABELS.length);
  const dummy = new THREE.Object3D();
  const debrisData = [];

  CHIP_LABELS.forEach((lab, li) => {
    const mesh = new THREE.InstancedMesh(chipGeo, chipMats[li], per);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    root.add(mesh);
    debrisGroups.push(mesh);
    for (let i = 0; i < per; i++) {
      const a = (i / per) * Math.PI * 2 + li * 0.7;
      const spiral = 1.8 + (i / per) * 4.5;
      const y = ((i % 17) / 17 - 0.5) * 5.5 + Math.sin(a * 2) * 0.4;
      debrisData.push({
        mesh, index: i,
        base: new THREE.Vector3(Math.cos(a) * spiral, y, Math.sin(a) * spiral * 0.85),
        pos: new THREE.Vector3(Math.cos(a) * spiral, y, Math.sin(a) * spiral * 0.85),
        vel: new THREE.Vector3(),
        spin: new THREE.Vector3((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.8, (Math.random() - 0.5) * 1.2),
        rot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
        phase: Math.random() * Math.PI * 2,
      });
    }
  });
  onProgress(0.7);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    isMobile ? 0.28 : 0.42, 0.55, 0.82,
  );
  composer.addPass(bloom);
  try { composer.addPass(new OutputPass()); } catch (_) {}

  let time = 0;
  let flight = 0;
  let mouse = { x: 0, y: 0 };
  let mouseSmooth = { x: 0, y: 0 };
  let visible = true;
  const cursorWorld = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const partPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  function setMouse(nx, ny) { mouse.x = nx; mouse.y = ny; }
  function setFlight(t) { flight = Math.min(1, Math.max(0, t)); }
  function setVisible(v) {
    visible = !!v;
    canvas.style.opacity = visible ? '1' : '0';
  }

  function update(dt) {
    if (!visible && flight >= 0.98) return;
    time += dt;
    const ease = 1 - Math.exp(-dt * 6);
    mouseSmooth.x += (mouse.x - mouseSmooth.x) * ease;
    mouseSmooth.y += (mouse.y - mouseSmooth.y) * ease;

    const orbit = time * 0.12;
    const radius = THREE.MathUtils.lerp(7.2, 2.2, flight);
    const elev = THREE.MathUtils.lerp(1.45, 0.35, flight);
    const lookY = THREE.MathUtils.lerp(0.7, 1.8, flight);
    camera.position.x = Math.sin(orbit) * radius + mouseSmooth.x * 0.35;
    camera.position.z = Math.cos(orbit) * radius - flight * 4.5;
    camera.position.y = elev + mouseSmooth.y * 0.2 + flight * 1.2;
    camera.lookAt(mouseSmooth.x * 0.15, lookY + flight * 2.5, 0);

    root.rotation.y = Math.sin(time * 0.15) * 0.04;
    gauge.rotation.y = time * 0.22;
    ringA.rotation.z = time * 0.35;
    ringB.rotation.z = -time * 0.28;
    shaftMat.uniforms.uTime.value = time;
    shaftMat.uniforms.uOpacity.value = THREE.MathUtils.lerp(0.22, 0.04, flight);

    raycaster.setFromCamera(new THREE.Vector2(mouseSmooth.x, mouseSmooth.y), camera);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(partPlane, hit)) cursorWorld.copy(hit);
    else cursorWorld.set(mouseSmooth.x * 3.5, mouseSmooth.y * 2.2, 0);

    const pushR = 1.65, pushF = 14;
    const spinT = time * 0.08;
    for (let i = 0; i < debrisData.length; i++) {
      const d = debrisData[i];
      const bx = d.base.x * Math.cos(spinT) - d.base.z * Math.sin(spinT);
      const bz = d.base.x * Math.sin(spinT) + d.base.z * Math.cos(spinT);
      const by = d.base.y + Math.sin(time * 0.4 + d.phase) * 0.15;
      d.vel.x += (bx - d.pos.x) * 2.2 * dt;
      d.vel.y += (by - d.pos.y) * 2.2 * dt;
      d.vel.z += (bz - d.pos.z) * 2.2 * dt;
      const dx = d.pos.x - cursorWorld.x;
      const dy = d.pos.y - cursorWorld.y;
      const dz = d.pos.z - cursorWorld.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001;
      if (dist < pushR) {
        const f = (1 - dist / pushR) * pushF;
        d.vel.x += (dx / dist) * f * dt;
        d.vel.y += (dy / dist) * f * dt;
        d.vel.z += (dz / dist) * f * dt * 0.5;
      }
      d.vel.multiplyScalar(0.9);
      d.pos.addScaledVector(d.vel, dt * 60 * 0.016);
      d.rot.x += d.spin.x * dt;
      d.rot.y += d.spin.y * dt;
      d.rot.z += d.spin.z * dt;
      const scale = THREE.MathUtils.lerp(1, 0.15, flight);
      dummy.position.copy(d.pos);
      dummy.rotation.copy(d.rot);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      d.mesh.setMatrixAt(d.index, dummy.matrix);
    }
    debrisGroups.forEach((m) => { m.instanceMatrix.needsUpdate = true; m.visible = flight < 0.95; });

    root.position.y = flight * -1.2;
    rock.visible = flight < 0.98;

    if (visible || flight < 0.98) composer.render();
  }

  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w, h);
  }
  window.addEventListener('resize', onResize);

  function dispose() {
    window.removeEventListener('resize', onResize);
    renderer.dispose();
    envMap?.dispose();
  }

  update(0);
  onProgress(1);

  return { setMouse, setFlight, setVisible, update, dispose, renderer, scene, camera };
}
