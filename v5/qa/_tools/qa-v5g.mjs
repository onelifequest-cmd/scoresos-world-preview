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
  { w: 1920, h: 1080, name: '1920' },
  { w: 1536, h: 864, name: '1536' },
  { w: 1440, h: 900, name: '1440' },
  { w: 1366, h: 768, name: '1366' },
  { w: 1280, h: 800, name: '1280' },
  { w: 820, h: 1180, name: '820' },
  { w: 430, h: 932, name: '430' },
  { w: 390, h: 844, name: '390' },
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
        // keep CSS transform from stylesheet
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
  await page.waitForTimeout(250);
}

async function measure(page) {
  return page.evaluate(() => {
    const wall = document.getElementById('wall');
    const wr = wall?.getBoundingClientRect();
    const tiles = [...document.querySelectorAll('.tile')].map((t, i) => {
      const r = t.getBoundingClientRect();
      return { i, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) };
    });
    const copy = document.querySelector('.hero-copy')?.getBoundingClientRect();
    const headline = document.querySelector('.headline')?.getBoundingClientRect();
    const maxineApprox = { x: innerWidth * 0.42, right: innerWidth * 0.62 }; // rough
    const fund = document.querySelector('.funding-line')?.getBoundingClientRect();
    const fundText = document.querySelector('.funding-line')?.innerText;
    const cs = wall ? getComputedStyle(wall) : null;
    const overlap = (a, b) => a && b && !(a.right < b.x || a.x > b.right || a.bottom < b.y || a.y > b.bottom);
    return {
      vw: innerWidth, vh: innerHeight,
      wallDisplay: cs?.display,
      wall: wr ? {
        x: Math.round(wr.x), y: Math.round(wr.y), w: Math.round(wr.width), h: Math.round(wr.height),
        right: Math.round(wr.right),
        leftPct: +(wr.x / innerWidth * 100).toFixed(1),
        rightPct: +(wr.right / innerWidth * 100).toFixed(1),
        cxPct: +((wr.x + wr.width / 2) / innerWidth * 100).toFixed(1),
        bottomPct: +(wr.bottom / innerHeight * 100).toFixed(1),
      } : null,
      tileCount: tiles.length,
      tiles,
      copy: copy ? { x: Math.round(copy.x), y: Math.round(copy.y), right: Math.round(copy.right), bottom: Math.round(copy.bottom) } : null,
      headline: headline ? { x: Math.round(headline.x), y: Math.round(headline.y), right: Math.round(headline.right) } : null,
      fund: fund ? { w: Math.round(fund.width), h: Math.round(fund.height), text: fundText } : null,
      copyOverlapsWall: overlap(
        copy && { x: copy.x, y: copy.y, right: copy.right, bottom: copy.bottom },
        wr && { x: wr.x, y: wr.y, right: wr.right, bottom: wr.bottom }
      ),
      score: document.getElementById('score-num')?.textContent,
    };
  });
}

const metrics = {};
for (const size of sizes) {
  const mobile = size.w < 860;
  const page = await browser.newPage({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:8765/v5/?v=v5g', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await forceSettle(page, { mobile });
  const info = await measure(page);
  metrics[size.name] = info;
  const file = path.join(out, `v5g-${size.name}-settle.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 90 });
  await page.close();
  console.log(size.name, JSON.stringify({
    wall: info.wall, tiles: info.tileCount, score: info.score,
    fund: info.fund, copyOverlapsWall: info.copyOverlapsWall,
    copy: info.copy, headline: info.headline,
  }));
}
fs.writeFileSync(path.join(out, 'v5g-metrics.json'), JSON.stringify(metrics, null, 2));
await browser.close();
console.log('v5g qa done');
