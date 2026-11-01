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
  const pct = Math.round(p * 100);
  if (loaderFill) loaderFill.style.width = pct + '%';
  if (loaderPct) loaderPct.textContent = pct + '%';
}

setLoad(0.05);

const world = await createWorld(canvas, { isMobile, reduced });
setLoad(0.85);

// Lenis + GSAP
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);

let lenis = null;
if (!reduced && window.Lenis) {
  lenis = new window.Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  window.__lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);
}

const scrollRoot = document.getElementById('scroll-root');
const totalHeight = () => scrollRoot.scrollHeight - window.innerHeight;

function progressFromScroll() {
  const y = lenis ? lenis.scroll : window.scrollY || document.documentElement.scrollTop;
  return Math.min(1, Math.max(0, y / Math.max(1, totalHeight())));
}

// Overlay visibility per beat
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
// First overlay on immediately
beats[0]?.querySelector('.overlay')?.classList.add('on');

ScrollTrigger.create({
  trigger: scrollRoot,
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: (self) => {
    world.setProgress(self.progress);
    const idx = Math.min(beats.length - 1, Math.floor(self.progress * beats.length));
    dots.forEach((d, i) => d.classList.toggle('on', i === idx));
    if (self.progress > 0.04) hint?.classList.add('hide');
  },
});

// Cursor
let mx = window.innerWidth / 2;
let my = window.innerHeight / 2;
window.addEventListener('pointermove', (e) => {
  mx = e.clientX; my = e.clientY;
  if (cursor) {
    cursor.style.transform = `translate(${mx}px, ${my}px)`;
  }
  const nx = (e.clientX / window.innerWidth) * 2 - 1;
  const ny = -((e.clientY / window.innerHeight) * 2 - 1);
  world.setMouse(nx, ny);
  const hot = e.target.closest && e.target.closest('a, button, .price-card');
  cursor?.classList.toggle('hot', !!hot);
}, { passive: true });

// RAF update world (Lenis drives scroll; we still need world clock)
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  // Keep progress synced even without ST callback
  world.setProgress(progressFromScroll());
  world.update(reduced ? 0 : dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

setLoad(1);
setTimeout(() => loader?.classList.add('done'), 280);

// Reduced motion: jump to emblem still-ish mid
if (reduced) {
  world.setProgress(0.08);
  document.querySelectorAll('.overlay').forEach((o) => o.classList.add('on'));
  hint?.classList.add('hide');
}

window.addEventListener('resize', () => ScrollTrigger.refresh());
