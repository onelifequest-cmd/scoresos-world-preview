import { chromium, devices } from '../../../v4/qa/_tools/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(__dirname, '..');
const BASE = process.env.V5N_URL || 'http://127.0.0.1:8765/v5/?v=v5n';

async function shot(page, name) {
  const p = path.join(out, name);
  await page.screenshot({ path: p, type: 'jpeg', quality: 90 });
  console.log('wrote', name);
  return p;
}

async function wallMetrics(page) {
  return page.evaluate(() => {
    const wall = document.getElementById('wall');
    const stage = document.getElementById('hero-stage');
    if (!wall) return null;
    const wr = wall.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    const tiles = [...wall.querySelectorAll('.tile')].map(t => {
      const r = t.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), ar: +(r.width / r.height).toFixed(2) };
    });
    return {
      vw: innerWidth, vh: innerHeight,
      wall: {
        left: Math.round(wr.left), right: Math.round(wr.right),
        w: Math.round(wr.width), h: Math.round(wr.height),
        leftPct: +(wr.left / innerWidth * 100).toFixed(1),
        rightPct: +(wr.right / innerWidth * 100).toFixed(1),
      },
      tiles,
      classes: stage?.className,
      wallClasses: wall.className,
    };
  });
}

async function forceSettle(page) {
  await page.evaluate(() => {
    const stage = document.getElementById('hero-stage');
    const wall = document.getElementById('wall');
    const video = document.getElementById('hero-video');
    try { video?.pause(); } catch (_) {}
    // Snap transitions for still capture
    const style = document.createElement('style');
    style.textContent = '.wall, .hero-settle, .hero-ambient, .hero-video { transition: none !important; }';
    document.head.appendChild(style);
    stage?.classList.add('settled', 'settled-solid', 'copy-ready', 'video-playing');
    wall?.classList.add('revealed', 'settled');
    wall?.classList.remove('mid-reveal');
  });
  await page.waitForTimeout(250);
}

async function deskStill(browser, w, h, label, mode) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(400);
  if (mode === 'fly') {
    // seek near t=1s of intro
    await page.evaluate(async () => {
      const v = document.getElementById('hero-video');
      const stage = document.getElementById('hero-stage');
      if (v) {
        try { v.pause(); v.currentTime = 1.0; } catch (_) {}
        stage?.classList.add('video-playing');
        // keep copy hidden on desktop at t~1
        stage?.classList.remove('copy-ready');
      }
    });
    await page.waitForTimeout(350);
    await shot(page, `v5n-${label}-fly-t1.jpg`);
  } else {
    await forceSettle(page);
    await page.waitForTimeout(300);
    const m = await wallMetrics(page);
    await shot(page, `v5n-${label}-settle.jpg`);
    await ctx.close();
    return m;
  }
  await ctx.close();
  return null;
}

async function mobileStill(browser, mode) {
  const iPhone = devices['iPhone 12'];
  const ctx = await browser.newContext({
    ...iPhone,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(500);
  if (mode === 'fly') {
    await page.evaluate(async () => {
      const v = document.getElementById('hero-video');
      const stage = document.getElementById('hero-stage');
      if (v) {
        try { v.pause(); v.currentTime = 1.0; } catch (_) {}
        stage?.classList.add('video-playing', 'copy-ready'); // copy should be on by ~0.3s
      }
    });
    await page.waitForTimeout(350);
    await shot(page, 'v5n-390-fly-t1.jpg');
  } else {
    await forceSettle(page);
    await page.waitForTimeout(300);
    await shot(page, 'v5n-390-settle.jpg');
  }
  await ctx.close();
}

async function record(browser, w, h, name, isMobile) {
  const raw = path.join(out, '_raw');
  fs.mkdirSync(raw, { recursive: true });
  const opts = isMobile
    ? { ...devices['iPhone 12'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, recordVideo: { dir: raw, size: { width: 390, height: 844 } } }
    : { viewport: { width: w, height: h }, deviceScaleFactor: 1, recordVideo: { dir: raw, size: { width: w, height: h } } };
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  // Let intro play ~9s through settle
  await page.waitForTimeout(9500);
  await forceSettle(page);
  await page.waitForTimeout(1500);
  await ctx.close();
  // move video
  const files = fs.readdirSync(raw).filter(f => f.endsWith('.webm'));
  if (files.length) {
    const dest = path.join(out, name);
    fs.renameSync(path.join(raw, files.sort((a,b)=>fs.statSync(path.join(raw,b)).mtimeMs - fs.statSync(path.join(raw,a)).mtimeMs)[0]), dest);
    console.log('wrote', name);
  }
}

const browser = await chromium.launch({ headless: true });
const metrics = {};
metrics['1440'] = await deskStill(browser, 1440, 900, '1440', 'settle');
await deskStill(browser, 1440, 900, '1440', 'fly');
metrics['1280'] = await deskStill(browser, 1280, 800, '1280', 'settle');
metrics['1366'] = await deskStill(browser, 1366, 768, '1366', 'settle');
metrics['1920'] = await deskStill(browser, 1920, 1080, '1920', 'settle');
await mobileStill(browser, 'fly');
await mobileStill(browser, 'settle');

if (process.env.V5N_RECORD === '1') {
  await record(browser, 1440, 900, 'v5n-1440-walkthrough.webm', false);
  await record(browser, 390, 844, 'v5n-390-walkthrough.webm', true);
}

fs.writeFileSync(path.join(out, 'v5n-wall-metrics.json'), JSON.stringify(metrics, null, 2));
console.log(JSON.stringify(metrics, null, 2));
await browser.close();
