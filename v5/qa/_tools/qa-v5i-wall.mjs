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
  { w: 1440, h: 900, name: '1440' },
  { w: 1366, h: 768, name: '1366' },
  { w: 1280, h: 800, name: '1280' },
];

async function settle(page) {
  await page.evaluate(() => {
    document.getElementById('loader')?.classList.add('done');
    document.body.classList.add('ready');
    const style = document.createElement('style');
    style.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
    document.head.appendChild(style);
    const v = document.getElementById('hero-video');
    if (v) { try { v.pause(); v.loop = false; v.style.display = 'none'; } catch (_) {} }
    document.querySelector('.hero-stage')?.classList.add('settled', 'settled-solid');
    const settle = document.querySelector('.hero-settle');
    if (settle) settle.style.opacity = '1';
    document.getElementById('wall')?.classList.add('revealed', 'react', 'beam-hit', 'settled');
    document.querySelectorAll('.tile').forEach((t) => t.classList.add('on'));
    const score = document.getElementById('score-num');
    if (score) {
      score.textContent = '742';
      score.classList.add('settled-score');
      score.closest('.score-tile')?.classList.add('score-filled');
    }
  });
  await page.waitForTimeout(200);
}

const metrics = {};
for (const size of sizes) {
  const page = await browser.newPage({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:8765/v5/?v=v5i', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await settle(page);
  const info = await page.evaluate(() => {
    const wall = document.getElementById('wall');
    const wr = wall.getBoundingClientRect();
    const tiles = [...document.querySelectorAll('.tile')].map((t, i) => {
      const r = t.getBoundingClientRect();
      return { i, w: Math.round(r.width), h: Math.round(r.height), ar: +(r.width / r.height).toFixed(2) };
    });
    const copy = document.querySelector('.hero-copy')?.getBoundingClientRect();
    const headline = document.querySelector('.headline')?.getBoundingClientRect();
    const nav = document.querySelector('header, .site-header, .topbar, nav')?.getBoundingClientRect()
      || document.querySelector('.logo')?.closest('header, div')?.getBoundingClientRect();
    const fund = document.querySelector('.funding-tile')?.getBoundingClientRect();
    const fundLine = document.querySelector('.funding-line');
    const overlap = (a, b) => a && b && !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
    return {
      wall: {
        leftPct: +(wr.left / innerWidth * 100).toFixed(1),
        rightPct: +(wr.right / innerWidth * 100).toFixed(1),
        topPct: +(wr.top / innerHeight * 100).toFixed(1),
        bottomPct: +(wr.bottom / innerHeight * 100).toFixed(1),
        x: Math.round(wr.x), y: Math.round(wr.y),
        w: Math.round(wr.width), h: Math.round(wr.height),
        right: Math.round(wr.right),
      },
      tiles,
      avgTileAR: +(tiles.reduce((s, t) => s + t.ar, 0) / tiles.length).toFixed(2),
      copy: copy ? { leftPct: +(copy.left / innerWidth * 100).toFixed(1), x: Math.round(copy.x) } : null,
      headline: headline ? { leftPct: +(headline.left / innerWidth * 100).toFixed(1) } : null,
      wallCopyOverlap: overlap(
        { left: wr.left, right: wr.right, top: wr.top, bottom: wr.bottom },
        copy && { left: copy.left, right: copy.right, top: copy.top, bottom: copy.bottom }
      ),
      fundText: fundLine?.innerText?.replace(/\n/g, ' '),
      fund: fund ? { w: Math.round(fund.width), h: Math.round(fund.height), x: Math.round(fund.x), y: Math.round(fund.y) } : null,
      score: document.getElementById('score-num')?.textContent,
      navBottom: nav ? Math.round(nav.bottom) : null,
      wallBelowNav: nav ? wr.top > nav.bottom - 2 : null,
    };
  });
  metrics[size.name] = info;
  await page.screenshot({ path: path.join(out, `v5i-${size.name}-settle.jpg`), type: 'jpeg', quality: 90 });
  if (info.fund) {
    const t = info.fund;
    await page.screenshot({
      path: path.join(out, `v5i-${size.name}-funding-crop.jpg`),
      type: 'jpeg', quality: 95,
      clip: { x: Math.max(0, t.x - 4), y: Math.max(0, t.y - 4), width: t.w + 8, height: t.h + 8 },
    });
  }
  console.log(size.name, JSON.stringify({
    leftPct: info.wall.leftPct, rightPct: info.wall.rightPct,
    topPct: info.wall.topPct, bottomPct: info.wall.bottomPct,
    avgTileAR: info.avgTileAR, wallCopyOverlap: info.wallCopyOverlap,
    fundText: info.fundText, score: info.score,
    wallBelowNav: info.wallBelowNav,
  }));
  await page.close();
}
fs.writeFileSync(path.join(out, 'v5i-wall-metrics.json'), JSON.stringify(metrics, null, 2));
await browser.close();
