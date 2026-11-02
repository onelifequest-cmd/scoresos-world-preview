import { chromium } from '../../../v4/qa/_tools/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(__dirname, '..');
const framesDir = path.join(out, '_wt-frames', 'desk-seq');
fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });

const BASE = process.env.V5J_BASE || 'https://scoresos-world-preview.onrender.com/v5/?v=v5j';

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome-stable',
  args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });

// Wait until loader is done AND video is advancing
await page.waitForFunction(() => {
  const loader = document.getElementById('loader');
  const v = document.getElementById('hero-video');
  const loaderDone = loader && loader.classList.contains('done');
  return loaderDone && v && v.currentTime > 0.2 && !v.paused;
}, { timeout: 45000 });

await page.evaluate(async () => {
  const v = document.getElementById('hero-video');
  if (v) { v.muted = true; try { await v.play(); } catch (e) {} }
});

let i = 0;
const shoot = async () => {
  const n = String(i).padStart(4, '0');
  await page.screenshot({ path: path.join(framesDir, `f${n}.jpg`), type: 'jpeg', quality: 70 });
  i++;
};

// Capture through settle (~7.3s plate + buffer) at ~8fps
const t0 = Date.now();
while (Date.now() - t0 < 9500) {
  if (i % 10 === 2) await page.mouse.move(220 + (i * 19) % 1000, 350 + (i % 6) * 18, { steps: 3 });
  if (i % 10 === 7) await page.mouse.move(1050 - (i % 8) * 30, 410, { steps: 3 });
  await shoot();
  await page.waitForTimeout(125);
}

// short scroll
await page.evaluate(() => window.scrollTo({ top: 420, behavior: 'instant' }));
await page.waitForTimeout(150);
for (let k = 0; k < 6; k++) { await shoot(); await page.waitForTimeout(110); }
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
await page.waitForTimeout(200);
for (let k = 0; k < 8; k++) { await shoot(); await page.waitForTimeout(120); }

const info = await page.evaluate(() => {
  const v = document.getElementById('hero-video');
  const stage = document.querySelector('.hero-stage, #hero-stage, .stage');
  return {
    t: v?.currentTime, paused: v?.paused,
    settled: !!document.querySelector('.settled'),
    stageClass: stage?.className,
  };
});
console.log('desktop frames', i, info);
await browser.close();

// Encode via rawvideo pipe for true yuv420p
const enc = spawnSync('ffmpeg', [
  '-y', '-framerate', '8', '-i', path.join(framesDir, 'f%04d.jpg'),
  '-an', '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.1',
  '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart',
  '-vf', 'scale=1440:900:flags=lanczos,format=yuv420p',
  '-color_range', 'tv', '-colorspace', 'bt709',
  path.join(out, 'v5j-desktop-walkthrough.mp4'),
], { encoding: 'utf8' });
if (enc.status !== 0) {
  console.error(enc.stderr?.slice(-1000));
  process.exit(1);
}
console.log('encoded desktop ok');
