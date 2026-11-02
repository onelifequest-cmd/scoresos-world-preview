import { chromium } from '../../../v4/qa/_tools/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(__dirname, '..');
const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome-stable',
  args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
});

const sizes = [
  { w: 1920, h: 1080, name: '1920x1080' },
  { w: 1536, h: 864, name: '1536x864' },
  { w: 1440, h: 900, name: '1440x900' },
  { w: 1366, h: 768, name: '1366x768' },
  { w: 1280, h: 800, name: '1280x800' },
  { w: 820, h: 1180, name: '820x1180' },
  { w: 430, h: 932, name: '430x932' },
  { w: 390, h: 844, name: '390x844' },
];

async function forceSettle(page, { mobile }) {
  await page.evaluate(({ mobile }) => {
    document.getElementById('loader')?.classList.add('done');
    document.body.classList.add('ready');
    const style = document.createElement('style');
    style.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
    document.head.appendChild(style);
    const v = document.getElementById('hero-video');
    const stage = document.querySelector('.hero-stage');
    const wall = document.getElementById('wall');
    const beam = document.getElementById('control-beam');
    const pulse = document.getElementById('tablet-pulse');
    const score = document.getElementById('score-num');
    const settle = document.querySelector('.hero-settle');
    if (v) {
      try { v.pause(); v.loop = false; v.style.display = 'none'; } catch (_) {}
    }
    if (!mobile) {
      stage?.classList.add('settled', 'settled-solid');
      if (settle) {
        settle.style.opacity = '1';
        settle.style.transition = 'none';
        settle.style.transform = 'scale(1.22) translate3d(5.5%, 0, 0)';
      }
    }
    wall?.classList.add('revealed', 'react', 'beam-hit', 'settled');
    document.querySelectorAll('.tile').forEach((t) => t.classList.add('on'));
    beam?.classList.add('on');
    pulse?.classList.add('on');
    if (score) {
      score.textContent = '742';
      score.classList.add('settled-score');
      score.closest('.score-tile')?.classList.add('score-filled');
    }
  }, { mobile });
  await page.waitForTimeout(200);
}

async function measure(page) {
  return page.evaluate(() => {
    const wall = document.getElementById('wall');
    const wr = wall?.getBoundingClientRect();
    const tiles = [...document.querySelectorAll('.tile')].map((t) => {
      const r = t.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) };
    });
    const copy = document.querySelector('.hero-copy')?.getBoundingClientRect();
    const cs = wall ? getComputedStyle(wall) : null;
    return {
      vw: innerWidth, vh: innerHeight,
      wallDisplay: cs?.display,
      wall: wr ? {
        x: Math.round(wr.x), y: Math.round(wr.y), w: Math.round(wr.width), h: Math.round(wr.height),
        right: Math.round(wr.right), cx: Math.round(wr.x + wr.width / 2),
        cxPct: +((wr.x + wr.width / 2) / innerWidth * 100).toFixed(1),
        leftPct: +(wr.x / innerWidth * 100).toFixed(1),
        rightPct: +(wr.right / innerWidth * 100).toFixed(1),
      } : null,
      transform: cs?.transform,
      tileCount: tiles.length,
      tiles,
      copy: copy ? { x: Math.round(copy.x), y: Math.round(copy.y), right: Math.round(copy.right) } : null,
    };
  });
}

async function shoot(label, url, size, mobile) {
  const page = await browser.newPage({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await forceSettle(page, { mobile });
  const info = await measure(page);
  const file = path.join(out, `${label}-${size.name}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 88 });
  await page.close();
  console.log(label, size.name, JSON.stringify({
    wall: info.wall, tileCount: info.tileCount, wallDisplay: info.wallDisplay,
    firstTile: info.tiles[0], transform: info.transform?.slice(0, 80),
  }));
  return info;
}

const metrics = { v5f3: {}, v4g: {} };
for (const size of sizes) {
  const mobile = size.w < 860;
  metrics.v5f3[size.name] = await shoot('diag-v5f3', 'http://127.0.0.1:8765/v5/?v=v5f3', size, mobile);
  metrics.v4g[size.name] = await shoot('diag-v4g', 'http://127.0.0.1:8765/v4/?v=v4g', size, mobile);
}

// Side-by-side compares at 1440 and 390
async function sideBySide(w, h, name) {
  const { createRequire } = await import('module');
  // use sharp via python instead
}
fs.writeFileSync(path.join(out, 'diag-wall-metrics.json'), JSON.stringify(metrics, null, 2));
await browser.close();
console.log('done diagnose');
