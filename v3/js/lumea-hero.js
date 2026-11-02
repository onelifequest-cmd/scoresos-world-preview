/**
 * Lumea-style live WebGL opening — Blender jewelry gauge + displaced rock,
 * sparse spiral debris, volumetric shaft + dust, DOF.
 * Free stack only. No Meshy/Tripo.
 */
import * as THREE from 'three';
import { RGBELoader } from '../vendor/loaders/RGBELoader.js';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { DRACOLoader } from '../vendor/loaders/DRACOLoader.js';
import { EffectComposer } from '../vendor/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/postprocessing/UnrealBloomPass.js';
import { BokehPass } from '../vendor/postprocessing/BokehPass.js';
import { OutputPass } from '../vendor/postprocessing/OutputPass.js';

const CHIP_LABELS = ['DENIED', 'LATE', 'COLLECTION'];

function makeChipTexture(label) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#0a0e0c';
  g.fillRect(0, 0, 256, 96);
  g.strokeStyle = 'rgba(212,175,55,0.45)';
  g.lineWidth = 3;
  g.strokeRect(6, 6, 244, 84);
  g.fillStyle = '#e8d5a3';
  g.font = '600 32px Inter, system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(label, 128, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function enhanceMaterials(root, envMap, isMobile) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m, i) => {
      const name = ((o.name || '') + ' ' + (m.name || '')).toLowerCase();
      const isGlass = name.includes('glass') || (m.transmission && m.transmission > 0.2);
      const isGold = name.includes('gold') || name.includes('jewel') || name.includes('needle') || name.includes('bezel') || name.includes('hub') || name.includes('tick') || name.includes('lip') || name.includes('step') || name.includes('mark') || name.includes('spine');
      const isGreen = name.includes('green') || name.includes('scorearc') || name.includes('arc');
      let next = m;
      if (isGlass) {
        // Transmission often fails on software GL — keep a clear see-through lens
        next = new THREE.MeshPhysicalMaterial({
          color: 0xeaf6f0,
          metalness: 0,
          roughness: 0.06,
          transmission: isMobile ? 0.2 : 0.65,
          thickness: 0.6,
          ior: 1.45,
          clearcoat: 1,
          clearcoatRoughness: 0.04,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
          envMap,
          envMapIntensity: 1.25,
          side: THREE.DoubleSide,
        });
      } else if (isGold) {
        next = new THREE.MeshPhysicalMaterial({
          color: name.includes('jewel') ? 0xf4d96b : 0xd4af37,
          metalness: 1,
          roughness: name.includes('jewel') ? 0.12 : 0.16,
          clearcoat: 1,
          clearcoatRoughness: 0.05,
          envMap,
          envMapIntensity: 1.7,
          emissive: name.includes('jewel') ? 0xf0c94a : 0xb8860b,
          emissiveIntensity: name.includes('jewel') ? 0.25 : 0.05,
        });
      } else if (isGreen) {
        next = new THREE.MeshPhysicalMaterial({
          color: 0x1a6b3c,
          metalness: 0.45,
          roughness: 0.26,
          clearcoat: 0.55,
          emissive: 0x0a3d22,
          emissiveIntensity: 0.28,
          envMap,
          envMapIntensity: 1.0,
        });
      } else if (name.includes('dial') || name.includes('rocktmp') || (!name && m.color && m.color.getHex() < 0x222222)) {
        next = new THREE.MeshPhysicalMaterial({
          color: 0x101814,
          metalness: 0.35,
          roughness: 0.45,
          clearcoat: 0.35,
          envMap,
          envMapIntensity: 0.7,
        });
      } else {
        if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
          m.envMap = envMap;
          m.envMapIntensity = 0.6;
          m.needsUpdate = true;
        }
        return;
      }
      if (Array.isArray(o.material)) o.material[i] = next;
      else o.material = next;
      o.castShadow = true;
      o.receiveShadow = true;
    });
  });
}

function scoreToAngle(score) {
  const t = THREE.MathUtils.clamp((score - 580) / (760 - 580), 0, 1);
  // NeedlePivot rotates around Z (face-on gauge); map to elegant sweep
  const start = 0.95;
  const end = -0.85;
  return start + (end - start) * t;
}

export async function createLumeaHero(canvas, {
  isMobile = false,
  reduced = false,
  onProgress = () => {},
} = {}) {
  const dprCap = isMobile ? 1.35 : 1.75;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x030507, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.82;
  renderer.shadowMap.enabled = !isMobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030507);
  scene.fog = new THREE.FogExp2(0x030507, 0.042);

  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 80);
  camera.position.set(0, 1.45, 7.4);

  const key = new THREE.SpotLight(0xffe6b8, 32, 42, Math.PI / 9, 0.62, 1.2);
  key.position.set(0.15, 11.2, 1.0);
  key.target.position.set(0, 1.0, 0);
  key.castShadow = !isMobile;
  if (!isMobile) {
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0002;
  }
  scene.add(key, key.target);

  const rim = new THREE.DirectionalLight(0xb0c8f0, 1.25);
  rim.position.set(-6.2, 3.8, -4.2);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0x6a7a90, 0.32);
  fill.position.set(5, 2.2, 6);
  scene.add(fill);
  scene.add(new THREE.HemisphereLight(0x4a5568, 0x050608, 0.3));
  scene.add(new THREE.AmbientLight(0x121820, 0.2));

  // Extra cool rim skim on emblem glass/gold
  const rim2 = new THREE.PointLight(0xdde8ff, 18, 8, 2);
  rim2.position.set(1.8, 2.2, 2.4);
  scene.add(rim2);
  const faceLight = new THREE.SpotLight(0xfff0d0, 40, 12, Math.PI / 7, 0.45, 1.1);
  faceLight.position.set(0.2, 2.4, 4.2);
  faceLight.target.position.set(-0.2, 1.45, 0);
  scene.add(faceLight, faceLight.target);

  onProgress(0.06);

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
  onProgress(0.18);

  const texLoader = new THREE.TextureLoader();
  async function loadTex(url, srgb = false) {
    const t = await texLoader.loadAsync(url);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy?.() || 4);
    t.repeat.set(1.8, 1.8);
    return t;
  }
  let rockDiff = null, rockNor = null, rockRough = null;
  try {
    rockDiff = await loadTex('./media/textures/rock/diff_2k.jpg', true);
    rockNor = await loadTex('./media/textures/rock/nor_gl_2k.jpg');
    rockRough = await loadTex('./media/textures/rock/rough_2k.jpg');
  } catch (_) {
    try {
      rockDiff = await loadTex('./media/textures/rock/diff_1k.jpg', true);
      rockNor = await loadTex('./media/textures/rock/nor_gl_1k.jpg');
      rockRough = await loadTex('./media/textures/rock/rough_1k.jpg');
    } catch (__) {}
  }
  onProgress(0.3);

  const draco = new DRACOLoader();
  draco.setDecoderPath('./vendor/draco/');
  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(draco);

  const root = new THREE.Group();
  scene.add(root);

  // --- Rock from Blender ---
  let rock = null;
  try {
    const rockGltf = await gltfLoader.loadAsync('./media/models/rock.glb');
    rock = rockGltf.scene;
    rock.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      const geo = o.geometry;
      if (geo && !geo.attributes.tangent && geo.attributes.uv && geo.attributes.normal) {
        try { geo.computeTangents(); } catch (_) {}
      }
      o.material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        map: rockDiff || null,
        normalMap: rockNor || null,
        normalScale: new THREE.Vector2(1.35, 1.35),
        roughnessMap: rockRough || null,
        roughness: 0.92,
        metalness: 0.04,
        clearcoat: 0.06,
        clearcoatRoughness: 0.75,
        envMapIntensity: 0.35,
      });
    });
    rock.position.set(0.05, -0.35, 0);
    rock.scale.setScalar(0.92);
    root.add(rock);
  } catch (e) {
    console.warn('rock.glb failed', e);
  }
  onProgress(0.5);

  // --- Jewelry gauge from Blender ---
  let gauge = new THREE.Group();
  let needlePivot = null;
  try {
    const gaugeGltf = await gltfLoader.loadAsync('./media/models/gauge.glb');
    gauge = gaugeGltf.scene;
    enhanceMaterials(gauge, envMap, isMobile);
    gauge.traverse((o) => {
      if (o.name === 'NeedlePivot' || o.name.includes('NeedlePivot')) needlePivot = o;
      if (!o.isMesh) return;
      const n = (o.name || '').toLowerCase();
      if (n.includes('glass')) { o.visible = false; } // dial jewelry must read; glass occludes on swiftshader
      if (n.includes('tick') || n.includes('needle') || n.includes('scorearc') || n.includes('jewel') || n.includes('hub') || n.includes('logo')) {
        o.renderOrder = 1;
        // Ensure gold needle/ticks not culled
        if (o.material) { o.material.side = THREE.DoubleSide; o.material.needsUpdate = true; }
      }
    });
    // Face camera: Blender exported Y-up, gauge face was +Z in Blender → after Yup export face is +Z
    gauge.scale.setScalar(1.35);
    gauge.position.set(0.05, 1.72, 0.35);
    // Flip so dial/glass/needle face camera (Blender apply left face on -Z)
    gauge.rotation.set(0.05, Math.PI, 0);
    if (needlePivot) needlePivot.scale.setScalar(1.25);
    root.add(gauge);
  } catch (e) {
    console.warn('gauge.glb failed', e);
  }
  onProgress(0.65);

  // Orbit rings
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffc857,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.007, 12, 128), ringMat);
  ringA.rotation.x = Math.PI / 2.15;
  root.add(ringA);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.005, 12, 128), ringMat.clone());
  ringB.rotation.x = Math.PI / 1.95;
  ringB.rotation.y = 0.32;
  root.add(ringB);

  // Soft volumetric shaft
  const shaftMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(0xffe2a8) },
      uOpacity: { value: 0.17 },
      uTime: { value: 0 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity; uniform float uTime; varying vec2 vUv;
      void main(){
        float axial = smoothstep(0.0,0.12,vUv.y)*smoothstep(1.0,0.48,vUv.y);
        float radial = pow(1.0 - abs(vUv.x-0.5)*2.0, 2.2);
        float pulse = 0.9 + 0.1*sin(uTime*0.55);
        float dust = 0.85 + 0.15*sin(vUv.y*40.0 + uTime*1.2)*sin(vUv.x*30.0);
        gl_FragColor = vec4(uColor, axial*radial*uOpacity*pulse*dust);
      }`,
  });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 1.5, 11, 32, 1, true), shaftMat);
  shaft.position.y = 5.4;
  root.add(shaft);

  const moteCount = isMobile ? 80 : 170;
  const moteGeo = new THREE.BufferGeometry();
  const motePos = new Float32Array(moteCount * 3);
  const motePhase = new Float32Array(moteCount);
  for (let i = 0; i < moteCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.55;
    motePos[i * 3] = Math.cos(a) * r;
    motePos[i * 3 + 1] = Math.random() * 8.5 + 0.5;
    motePos[i * 3 + 2] = Math.sin(a) * r;
    motePhase[i] = Math.random() * Math.PI * 2;
  }
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const motes = new THREE.Points(
    moteGeo,
    new THREE.PointsMaterial({
      color: 0xffe6c0,
      size: isMobile ? 0.025 : 0.017,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
  root.add(motes);

  // Sparse elegant spiral debris (25–40)
  const chipCount = isMobile ? 26 : 34;
  const chipGeo = new THREE.BoxGeometry(0.26, 0.09, 0.024);
  const chipMats = CHIP_LABELS.map((lab) => new THREE.MeshStandardMaterial({
    map: makeChipTexture(lab),
    roughness: 0.5,
    metalness: 0.2,
    envMapIntensity: 0.35,
  }));
  const debrisGroups = [];
  const debrisData = [];
  const per = Math.floor(chipCount / CHIP_LABELS.length);
  const dummy = new THREE.Object3D();

  CHIP_LABELS.forEach((lab, li) => {
    const mesh = new THREE.InstancedMesh(chipGeo, chipMats[li], per);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    root.add(mesh);
    debrisGroups.push(mesh);
    for (let i = 0; i < per; i++) {
      const t = (i + li * 0.33) / per;
      const a = t * Math.PI * 2.4 + li * 0.9;
      const spiral = 2.7 + t * 3.9;
      const y = (t - 0.5) * 3.9 + Math.sin(a) * 0.22;
      const depthTier = (Math.sin(a * 1.7 + li) * 0.5 + 0.5);
      debrisData.push({
        mesh, index: i,
        base: new THREE.Vector3(Math.cos(a) * spiral, y, Math.sin(a) * spiral * 0.9),
        pos: new THREE.Vector3(Math.cos(a) * spiral, y, Math.sin(a) * spiral * 0.9),
        vel: new THREE.Vector3(),
        spin: new THREE.Vector3((Math.random() - 0.5) * 0.55, (Math.random() - 0.5) * 0.85, (Math.random() - 0.5) * 0.55),
        rot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
        phase: Math.random() * Math.PI * 2,
        depthTier,
        baseScale: 0.5 + depthTier * 0.5,
      });
    }
  });
  onProgress(0.78);

  const fogDisc = new THREE.Mesh(
    new THREE.CircleGeometry(14, 48),
    new THREE.MeshBasicMaterial({ color: 0x05080c, transparent: true, opacity: 0.65, depthWrite: false }),
  );
  fogDisc.rotation.x = -Math.PI / 2;
  fogDisc.position.y = -1.55;
  scene.add(fogDisc);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    isMobile ? 0.12 : 0.16, 0.4, 0.9,
  );
  composer.addPass(bloom);

  let bokehPass = null;
  if (!isMobile && !reduced) {
    try {
      bokehPass = new BokehPass(scene, camera, {
        focus: 7.0,
        aperture: 0.00024,
        maxblur: 0.008,
      });
      composer.addPass(bokehPass);
    } catch (e) {
      console.warn('BokehPass unavailable', e);
    }
  }
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
    const ease = 1 - Math.exp(-dt * 5);
    mouseSmooth.x += (mouse.x - mouseSmooth.x) * ease;
    mouseSmooth.y += (mouse.y - mouseSmooth.y) * ease;

    const orbit = time * 0.08;
    const radius = THREE.MathUtils.lerp(7.4, 2.35, flight);
    const elev = THREE.MathUtils.lerp(1.45, 0.4, flight);
    const lookY = THREE.MathUtils.lerp(0.95, 1.85, flight);
    camera.position.x = Math.sin(orbit) * radius + mouseSmooth.x * 0.28;
    camera.position.z = Math.cos(orbit) * radius - flight * 4.2;
    camera.position.y = elev + mouseSmooth.y * 0.18 + flight * 1.1;
    camera.lookAt(mouseSmooth.x * 0.12, lookY + flight * 2.2, 0);

    if (bokehPass?.material?.uniforms?.focus) {
      bokehPass.material.uniforms.focus.value = camera.position.distanceTo(new THREE.Vector3(0, 1.15, 0));
    }

    root.rotation.y = Math.sin(time * 0.1) * 0.025;
    gauge.rotation.y = Math.sin(time * 0.11) * 0.06;
    ringA.rotation.z = time * 0.2;
    ringB.rotation.z = -time * 0.16;
    shaftMat.uniforms.uTime.value = time;
    shaftMat.uniforms.uOpacity.value = THREE.MathUtils.lerp(0.17, 0.04, flight);

    if (needlePivot) {
      const cycle = (Math.sin(time * 0.22) * 0.5 + 0.5);
      const score = 580 + cycle * 180;
      needlePivot.rotation.z = scoreToAngle(score);
    }

    const mp = motes.geometry.attributes.position;
    for (let i = 0; i < moteCount; i++) {
      let y = mp.getY(i) + dt * (0.12 + (i % 5) * 0.02);
      if (y > 9.2) y = 0.4;
      const ph = motePhase[i];
      mp.setX(i, Math.cos(time * 0.3 + ph) * (0.15 + (i % 7) * 0.04));
      mp.setY(i, y);
      mp.setZ(i, Math.sin(time * 0.25 + ph * 1.3) * (0.15 + (i % 5) * 0.04));
    }
    mp.needsUpdate = true;

    raycaster.setFromCamera(new THREE.Vector2(mouseSmooth.x, mouseSmooth.y), camera);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(partPlane, hit)) cursorWorld.copy(hit);
    else cursorWorld.set(mouseSmooth.x * 3.2, mouseSmooth.y * 2.0, 0);

    const pushR = 1.9, pushF = 11;
    const spinT = time * 0.05;
    for (let i = 0; i < debrisData.length; i++) {
      const d = debrisData[i];
      const bx = d.base.x * Math.cos(spinT) - d.base.z * Math.sin(spinT);
      const bz = d.base.x * Math.sin(spinT) + d.base.z * Math.cos(spinT);
      const by = d.base.y + Math.sin(time * 0.35 + d.phase) * 0.12;
      d.vel.x += (bx - d.pos.x) * 1.6 * dt;
      d.vel.y += (by - d.pos.y) * 1.6 * dt;
      d.vel.z += (bz - d.pos.z) * 1.6 * dt;
      const dx = d.pos.x - cursorWorld.x;
      const dy = d.pos.y - cursorWorld.y;
      const dz = d.pos.z - cursorWorld.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001;
      if (dist < pushR) {
        const f = (1 - dist / pushR) * pushF;
        d.vel.x += (dx / dist) * f * dt;
        d.vel.y += (dy / dist) * f * dt;
        d.vel.z += (dz / dist) * f * dt * 0.45;
      }
      d.vel.multiplyScalar(0.92);
      d.pos.addScaledVector(d.vel, dt);
      d.rot.x += d.spin.x * dt;
      d.rot.y += d.spin.y * dt;
      d.rot.z += d.spin.z * dt;
      const camDist = d.pos.distanceTo(camera.position);
      const dof = THREE.MathUtils.clamp(1 - Math.abs(camDist - 7.0) / 6.5, 0.35, 1);
      const scale = THREE.MathUtils.lerp(d.baseScale * dof, 0.12, flight);
      dummy.position.copy(d.pos);
      dummy.rotation.copy(d.rot);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      d.mesh.setMatrixAt(d.index, dummy.matrix);
    }
    debrisGroups.forEach((m) => { m.instanceMatrix.needsUpdate = true; m.visible = flight < 0.95; });

    root.position.y = flight * -1.15;
    if (rock) rock.visible = flight < 0.98;
    motes.visible = flight < 0.9;

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
    draco.dispose();
  }

  update(0);
  onProgress(1);

  const api = { setMouse, setFlight, setVisible, update, dispose, renderer, scene, camera, root, gauge, needlePivot };
  if (typeof window !== 'undefined') window.__lumeaHero = api;
  return api;
}
