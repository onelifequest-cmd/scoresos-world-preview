import { createWorld } from './world.js';

const qaMode = /[?&]qa=1/.test(location.search);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]static=1/.test(location.search);
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 720;

const loader = document.getElementById('loader');
const loaderFill = document.getElementById('loader-fill');
const loaderPct = document.getElementById('loader-pct');
const canvas = document.getElementById('world');
const heroRoot = document.getElementById('lumea-hero-root') || document.getElementById('hero-canvas');
const cursor = document.getElementById('cursor');
const hint = document.getElementById('scroll-hint');
const dotsWrap = document.getElementById('beat-dots');

const beats = [...document.querySelectorAll('.beat[data-beat]')].filter((b) => b.dataset.beat !== 'hero');
beats.forEach((_, i) => {
  const d = document.createElement('i');
  if (i === 0) d.classList.add('on');
  dotsWrap.appendChild(d);
});
const dots = [...dotsWrap.querySelectorAll('i')];

function setLoad(p) {
  const pct = Math.round(Math.min(1, Math.max(0, p)) * 100);
  if (loaderFill) loaderFill.style.width = pct + '%';
  if (loaderPct) loaderPct.textContent = pct + '%';
}

setLoad(0.03);

// R3F Lumea port mounts itself onto #lumea-hero-root (see hero-r3f/lumea-hero.js).
// Thin shim keeps scroll-flight fade / mouse API used below.
const hero = {
  setFlight(v) { this._flight = v; },
  setMouse() {},
  setVisible(v) {
    if (!heroRoot) return;
    heroRoot.style.opacity = v ? '' : '0';
    heroRoot.style.pointerEvents = v ? '' : 'none';
  },
  update() {},
  _flight: 0,
};
setLoad(0.4);

const world = await createWorld(canvas, {
  isMobile,
  reduced: reduced || qaMode, // ?qa=1 skips Runway video preload for hero recording
  onProgress: (p) => setLoad(0.4 + p * 0.55),
});
setLoad(0.98);

// Cameos folded into the 3D hero (Maxine + robot billboards). Keep layer hidden.
const robotVid = document.getElementById('cameo-robot');
const maxineVid = document.getElementById('cameo-maxine');
const cameos = [];

function updateCameos(progress) {
  if (reduced) return;
  cameos.forEach((c) => {
    if (!c.el) return;
    const active = progress >= c.start && progress <= c.end;
    if (active) {
      c.el.classList.add('on');
      if (!c.played) {
        c.played = true;
        try {
          c.el.currentTime = 0;
          const p = c.el.play();
          if (p && p.catch) p.catch(() => {});
        } catch (_) {}
      }
    } else {
      c.el.classList.remove('on');
      if (c.el.paused === false) {
        try { c.el.pause(); } catch (_) {}
      }
      if (progress < c.start - 0.02) c.played = false;
    }
  });
}

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
if (gsap && ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
} else {
  console.warn('[v3] gsap/ScrollTrigger missing — scroll polish disabled; loader still completes');
}

let lenis = null;
if (gsap && ScrollTrigger && !reduced && window.Lenis) {
  lenis = new window.Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.15,
  });
  window.__lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);
}

const scrollRoot = document.getElementById('scroll-root');
const totalHeight = () => scrollRoot.scrollHeight - window.innerHeight;

function progressFromScroll() {
  const y = lenis ? lenis.scroll : window.scrollY || document.documentElement.scrollTop;
  return Math.min(1, Math.max(0, y / Math.max(1, totalHeight())));
}

/** Map full-page progress → hero flight (0–1) then Runway world progress (0–1). */
function remapProgress(p) {
  const heroEnd = 0.14;
  if (p <= heroEnd) {
    return { heroFlight: p / heroEnd, worldProgress: 0, inHero: true };
  }
  return {
    heroFlight: 1,
    worldProgress: (p - heroEnd) / (1 - heroEnd),
    inHero: false,
  };
}

if (ScrollTrigger) {
  document.querySelectorAll('.beat .overlay, .calm-section').forEach((el) => {
    const ov = el.classList?.contains('overlay') ? el : null;
    if (ov) {
      ScrollTrigger.create({
        trigger: ov.closest('.beat'),
        start: 'top 65%',
        end: 'bottom 35%',
        onEnter: () => ov.classList.add('on'),
        onEnterBack: () => ov.classList.add('on'),
        onLeave: () => { if (!ov.closest('.finale')) ov.classList.remove('on'); },
        onLeaveBack: () => { if (!ov.closest('.finale')) ov.classList.remove('on'); },
      });
    }
  });
  ScrollTrigger.create({
    trigger: scrollRoot,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      const { heroFlight, worldProgress, inHero } = remapProgress(self.progress);
      hero.setFlight(heroFlight);
      world.setProgress(inHero ? 0 : worldProgress);
      updateCameos(self.progress);
      document.body.classList.toggle('world-visible', !inHero || heroFlight > 0.55);
      document.body.classList.toggle('hero-done', heroFlight > 0.92);
      hero.setVisible(heroFlight < 0.98);
      const idx = Math.min(beats.length - 1, Math.floor(worldProgress * beats.length));
      dots.forEach((d, i) => d.classList.toggle('on', !inHero && i === idx));
      if (self.progress > 0.03) hint?.classList.add('hide');
    },
  });
}
document.querySelector('#beat-1 .overlay')?.classList.add('on');

let mx = window.innerWidth / 2;
let my = window.innerHeight / 2;
let cx = mx, cy = my;

window.addEventListener('pointermove', (e) => {
  mx = e.clientX; my = e.clientY;
  const nx = (e.clientX / window.innerWidth) * 2 - 1;
  const ny = -((e.clientY / window.innerHeight) * 2 - 1);
  const uvx = e.clientX / window.innerWidth;
  const uvy = 1 - e.clientY / window.innerHeight;
  hero.setMouse(nx, ny);
  world.setMouse(nx, ny, uvx, uvy);
  const hot = e.target.closest && e.target.closest('a, button, [data-magnetic]');
  cursor?.classList.toggle('hot', !!hot);
}, { passive: true });

window.addEventListener('pointerdown', () => {
  world.setPointerDown(true);
  world.pulseRipple(0.9);
}, { passive: true });
window.addEventListener('pointerup', () => world.setPointerDown(false), { passive: true });
window.addEventListener('pointerleave', () => world.setPointerDown(false), { passive: true });

window.addEventListener('touchmove', (e) => {
  const t = e.touches[0];
  if (!t) return;
  const nx = (t.clientX / window.innerWidth) * 2 - 1;
  const ny = -((t.clientY / window.innerHeight) * 2 - 1);
  hero.setMouse(nx, ny);
  world.setMouse(nx, ny, t.clientX / window.innerWidth, 1 - t.clientY / window.innerHeight);
}, { passive: true });

const magnets = [...document.querySelectorAll('[data-magnetic]')].filter((el) => !el.classList.contains('price-card') && !el.closest('.price-card'));
const magState = magnets.map((el) => ({ el, x: 0, y: 0, tx: 0, ty: 0 }));

function updateMagnets() {
  magState.forEach((m) => {
    const rect = m.el.getBoundingClientRect();
    const cx0 = rect.left + rect.width / 2;
    const cy0 = rect.top + rect.height / 2;
    const dx = mx - cx0;
    const dy = my - cy0;
    const dist = Math.hypot(dx, dy);
    const radius = Math.max(rect.width, rect.height) * 0.55 + 18;
    if (dist < radius) {
      const strength = (1 - dist / radius) * 0.08;
      m.tx = dx * strength;
      m.ty = dy * strength;
    } else {
      m.tx = 0; m.ty = 0;
    }
    m.x += (m.tx - m.x) * 0.18;
    m.y += (m.ty - m.y) * 0.18;
    m.el.style.transform = `translate(${m.x.toFixed(2)}px, ${m.y.toFixed(2)}px)`;
  });
}

function updateCursor() {
  if (!cursor) return;
  cx += (mx - cx) * 0.28;
  cy += (my - cy) * 0.28;
  cursor.style.transform = `translate(${cx}px, ${cy}px)`;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const prog = progressFromScroll();
  const { heroFlight, worldProgress, inHero } = remapProgress(prog);
  hero.setFlight(heroFlight);
  world.setProgress(inHero ? 0 : worldProgress);
  updateCameos(prog);
  document.body.classList.toggle('beat-pricing-active', prog > 0.82);
  document.body.classList.toggle('world-visible', !inHero || heroFlight > 0.55);
  document.body.classList.toggle('hero-done', heroFlight > 0.92);
  hero.setVisible(heroFlight < 0.98);
  hero.update(reduced ? 0 : dt);
  world.update(reduced ? 0 : dt);
  updateCursor();
  if (!isMobile && !reduced) updateMagnets();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

setLoad(1);
setTimeout(() => loader?.classList.add('done'), 320);

if (qaMode) {
  // Hero-only recording path: no Runway video preload, stay on opener
  world.setProgress(0);
  hero.setFlight(0);
  document.body.classList.remove('world-visible', 'hero-done');
  document.getElementById('world')?.style && (document.getElementById('world').style.display = 'none');
  document.getElementById('cameo-layer')?.style && (document.getElementById('cameo-layer').style.display = 'none');
  hint?.classList.add('hide');
  document.querySelector('.hero-copy')?.classList.add('qa-hide');
} else if (reduced) {
  world.setProgress(0.08);
  hero.setFlight(1);
  document.body.classList.add('world-visible', 'hero-done');
  document.querySelectorAll('.overlay').forEach((o) => o.classList.add('on'));
  hint?.classList.add('hide');
}

window.addEventListener('resize', () => ScrollTrigger?.refresh?.());
