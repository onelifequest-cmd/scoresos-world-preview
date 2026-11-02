import { chromium } from '../../../v4/qa/_tools/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(__dirname, '..');
const url = process.env.QA_URL || 'http://127.0.0.1:8765/v5/?v=v5f3';

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome-stable',
  args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
});

async function forceLoader(page) {
  await page.evaluate(() => {
    document.getElementById('loader')?.classList.add('done');
    document.body.classList.add('ready');
  });
}

async function prepSettle(page, { mobile = false } = {}) {
  await forceLoader(page);
  await page.evaluate(({ mobile }) => {
    // Kill transitions for crisp QA stills
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        transition: none !important;
        animation: none !important;
      }
    `;
    document.head.appendChild(style);

    const v = document.getElementById('hero-video');
    const stage = document.querySelector('.hero-stage');
    const wall = document.getElementById('wall');
    const beam = document.getElementById('control-beam');
    const pulse = document.getElementById('tablet-pulse');
    const score = document.getElementById('score-num');
    const settle = document.querySelector('.hero-settle');

    if (v) {
      try {
        v.pause();
        v.loop = false;
        v.style.opacity = '0';
        v.style.visibility = 'hidden';
      } catch (_) {}
    }
    if (!mobile) {
      stage?.classList.add('settled', 'settled-solid');
      if (settle) {
        settle.style.opacity = '1';
        settle.style.transition = 'none';
        // Freeze shared plate transform (no scroll/parallax jitter in still)
        const frozen = getComputedStyle(settle).transform;
        settle.style.transform = frozen === 'none'
          ? 'scale(1.22) translate3d(5.5%, 0, 0)'
          : frozen;
      }
      if (v) {
        v.style.display = 'none';
      }
    }
    wall?.classList.add('revealed', 'react', 'beam-hit', 'settled');
    document.querySelectorAll('.tile').forEach((t) => t.classList.add('on'));
    beam?.classList.add('on');
    pulse?.classList.add('on');
    if (score) {
      score.textContent = '742';
      score.classList.remove('climbing');
      score.classList.add('settled-score');
      score.closest('.score-tile')?.classList.add('score-filled');
    }
  }, { mobile });
  await page.waitForTimeout(250);
}

async function measure(page, label) {
  const info = await page.evaluate(() => {
    const copy = document.querySelector('.hero-copy')?.getBoundingClientRect();
    const h1 = document.querySelector('.hero-copy h1')?.getBoundingClientRect();
    const wall = document.getElementById('wall')?.getBoundingClientRect();
    const poster = document.querySelector('.hero-poster-mobile');
    const posterR = poster?.getBoundingClientRect();
    const score = document.getElementById('score-num')?.textContent;
    const stage = document.querySelector('.hero-stage');
    const video = document.getElementById('hero-video');
    const settle = document.querySelector('.hero-settle');
    const csV = video ? getComputedStyle(video) : null;
    const csS = settle ? getComputedStyle(settle) : null;
    return {
      vw: window.innerWidth, vh: window.innerHeight,
      score,
      settled: stage?.classList.contains('settled'),
      settledSolid: stage?.classList.contains('settled-solid'),
      videoOpacity: csV?.opacity, videoVis: csV?.visibility,
      settleOpacity: csS?.opacity,
      videoOP: csV?.objectPosition, settleOP: csS?.objectPosition,
      copy: copy ? { x: Math.round(copy.x), y: Math.round(copy.y), w: Math.round(copy.width), h: Math.round(copy.height), bottom: Math.round(copy.bottom) } : null,
      h1: h1 ? { x: Math.round(h1.x), y: Math.round(h1.y), w: Math.round(h1.width), h: Math.round(h1.height), right: Math.round(h1.right), bottom: Math.round(h1.bottom) } : null,
      wall: wall ? { x: Math.round(wall.x), y: Math.round(wall.y), w: Math.round(wall.width), h: Math.round(wall.height) } : null,
      poster: posterR ? { y: Math.round(posterR.y), h: Math.round(posterR.height), bottom: Math.round(posterR.bottom) } : null,
      overlapPx: (posterR && copy) ? Math.round(posterR.bottom - copy.y) : null,
      copyMarginTop: poster ? getComputedStyle(document.querySelector('.hero-copy')).marginTop : null,
    };
  });
  console.log(label, JSON.stringify(info));
  return info;
}

async function still(name, size, mobile = false) {
  const page = await browser.newPage({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await prepSettle(page, { mobile });
  await page.mouse.move(Math.round(size.w * 0.12), Math.round(size.h * 0.35));
  await page.waitForTimeout(150);
  const info = await measure(page, name);
  await page.screenshot({ path: path.join(out, name), type: 'jpeg', quality: 90 });
  await page.close();
  console.log('wrote', name);
  return info;
}

const r1440 = await still('v5f3-1440-settle.jpg', { w: 1440, h: 900 }, false);
const r1280 = await still('v5f3-1280-settle.jpg', { w: 1280, h: 800 }, false);
const r390 = await still('v5f3-390-settle.jpg', { w: 390, h: 844 }, true);

fs.writeFileSync(path.join(out, 'v5f3-metrics.json'), JSON.stringify({ r1440, r1280, r390 }, null, 2));
await browser.close();
console.log('done');
