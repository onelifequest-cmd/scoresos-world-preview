import { createWorld } from './world.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]static=1/.test(location.search);
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 720;

const loader = document.getElementById('loader');
const loaderFill = document.getElementById('loader-fill');
const loaderPct = document.getElementById('loader-pct');
const canvas = document.getElementById('world');
const cursor = document.getElementById('cursor');
const hint = document.getElementById('scroll-hint');
const dotsWrap = document.getElementById('beat-dots');

const beats = [...document.querySelectorAll('.beat')];
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

setLoad(0.04);

const world = await createWorld(canvas, {
  isMobile,
  reduced,
  onProgress: (p) => setLoad(0.04 + p * 0.9),
});
setLoad(0.96);


// ——— Quick cameos (robot opening, Maxine on dispute beat) ———
const isMobileCameo = isMobile;
const robotVid = document.getElementById('cameo-robot');
const maxineVid = document.getElementById('cameo-maxine');
if (robotVid && isMobileCameo) robotVid.src = './media/clips/cameo-robot-mobile.mp4';
if (maxineVid && isMobileCameo) maxineVid.src = './media/clips/cameo-maxine-mobile.mp4';

const cameos = [
  // Robot: brief hero entrance early in beat 1 — few seconds only
  { el: robotVid, start: 0.015, end: 0.075, played: false, name: 'robot' },
  // Maxine: brief AI dispute-engine cameo mid beat 2 — few seconds only
  { el: maxineVid, start: 0.20, end: 0.26, played: false, name: 'maxine' },
];

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
      // Allow replay if user scrolls back into the window
      if (progress < c.start - 0.02) c.played = false;
    }
  });
}


const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);

let lenis = null;
if (!reduced && window.Lenis) {
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

beats.forEach((sec) => {
  const ov = sec.querySelector('.overlay');
  ScrollTrigger.create({
    trigger: sec,
    start: 'top 65%',
    end: 'bottom 35%',
    onEnter: () => ov?.classList.add('on'),
    onEnterBack: () => ov?.classList.add('on'),
    onLeave: () => { if (!sec.classList.contains('finale')) ov?.classList.remove('on'); },
    onLeaveBack: () => { if (!sec.classList.contains('finale')) ov?.classList.remove('on'); },
  });
});
beats[0]?.querySelector('.overlay')?.classList.add('on');

ScrollTrigger.create({
  trigger: scrollRoot,
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: (self) => {
    world.setProgress(self.progress);
    updateCameos(self.progress);
    const idx = Math.min(beats.length - 1, Math.floor(self.progress * beats.length));
    dots.forEach((d, i) => d.classList.toggle('on', i === idx));
    if (self.progress > 0.03) hint?.classList.add('hide');
  },
});

// ——— Cursor + world mouse (UV for ripple shader) ———
let mx = window.innerWidth / 2;
let my = window.innerHeight / 2;
let cx = mx, cy = my;

window.addEventListener('pointermove', (e) => {
  mx = e.clientX; my = e.clientY;
  const nx = (e.clientX / window.innerWidth) * 2 - 1;
  const ny = -((e.clientY / window.innerHeight) * 2 - 1);
  const uvx = e.clientX / window.innerWidth;
  const uvy = 1 - e.clientY / window.innerHeight;
  world.setMouse(nx, ny, uvx, uvy);
  const hot = e.target.closest && e.target.closest('a, button, [data-magnetic]');
  cursor?.classList.toggle('hot', !!hot);
}, { passive: true });

window.addEventListener('pointerdown', (e) => {
  world.setPointerDown(true);
  world.pulseRipple(0.9);
}, { passive: true });
window.addEventListener('pointerup', () => world.setPointerDown(false), { passive: true });
window.addEventListener('pointerleave', () => world.setPointerDown(false), { passive: true });

// Touch: feed first touch into mouse so mobile still reacts
window.addEventListener('touchmove', (e) => {
  const t = e.touches[0];
  if (!t) return;
  const nx = (t.clientX / window.innerWidth) * 2 - 1;
  const ny = -((t.clientY / window.innerHeight) * 2 - 1);
  world.setMouse(nx, ny, t.clientX / window.innerWidth, 1 - t.clientY / window.innerHeight);
}, { passive: true });

// ——— Magnetic buttons ———
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

// Smooth cursor lag
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
  world.setProgress(prog);
  updateCameos(prog);
  document.body.classList.toggle('beat-pricing-active', prog > 0.78);
  world.update(reduced ? 0 : dt);
  updateCursor();
  if (!isMobile && !reduced) updateMagnets();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

setLoad(1);
setTimeout(() => loader?.classList.add('done'), 320);

if (reduced) {
  world.setProgress(0.08);
  document.querySelectorAll('.overlay').forEach((o) => o.classList.add('on'));
  hint?.classList.add('hide');
}

window.addEventListener('resize', () => ScrollTrigger.refresh());
