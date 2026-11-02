import { chromium } from '../../../v4/qa/_tools/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(__dirname, '..');
const framesDir = path.join(out, '_wt-frames', 'phone-seq');
fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });

const BASE = process.env.V5J_BASE || 'https://scoresos-world-preview.onrender.com/v5/?v=v5j';

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome-stable',
  args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox', '--disable-gpu-compositing'],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1, // 1x for lighter frames / match walkthrough size
  hasTouch: true,
  isMobile: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const page = await context.newPage();
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });

// Wait for loader to clear / video ready
await page.waitForFunction(() => {
  const v = document.getElementById('hero-video');
  const loader = document.querySelector('.boot-loader, .loader, [data-loader]');
  const gone = !loader || getComputedStyle(loader).opacity === '0' || loader.classList.contains('done') || loader.classList.contains('hidden');
  return v && v.readyState >= 2 && (!v.paused || v.currentTime > 0.1);
}, { timeout: 20000 }).catch(() => {});

await page.touchscreen.tap(195, 420);
await page.waitForTimeout(400);

// Force play
await page.evaluate(async () => {
  const v = document.getElementById('hero-video');
  if (!v) return;
  v.muted = true;
  try { await v.play(); } catch (e) {}
});

// Capture ~10s of hero motion at ~8fps while video plays
let i = 0;
const t0 = Date.now();
while (Date.now() - t0 < 8200) {
  const n = String(i).padStart(4, '0');
  await page.screenshot({ path: path.join(framesDir, `f${n}.jpg`), type: 'jpeg', quality: 78 });
  i++;
  await page.waitForTimeout(125);
}

// Scroll to rail
await page.evaluate(() => document.getElementById('wins')?.scrollIntoView({ behavior: 'instant', block: 'center' }));
await page.waitForTimeout(300);
for (let k = 0; k < 8; k++) {
  const n = String(i).padStart(4, '0');
  await page.screenshot({ path: path.join(framesDir, `f${n}.jpg`), type: 'jpeg', quality: 78 });
  i++;
  await page.waitForTimeout(120);
}

// Swipe carousel via touch
const box = await page.evaluate(() => {
  const c = document.getElementById('carousel');
  if (!c) return null;
  const r = c.getBoundingClientRect();
  return { x: r.x + r.width * 0.8, y: r.y + r.height * 0.5, w: r.width };
});
if (box) {
  await page.touchscreen.tap(box.x, box.y);
  // drag via mouse (works with hasTouch)
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  for (let s = 1; s <= 10; s++) {
    await page.mouse.move(box.x - (box.w * 0.6 * s) / 10, box.y);
    const n = String(i).padStart(4, '0');
    await page.screenshot({ path: path.join(framesDir, `f${n}.jpg`), type: 'jpeg', quality: 78 });
    i++;
  }
  await page.mouse.up();
}
await page.waitForTimeout(400);
for (let k = 0; k < 6; k++) {
  const n = String(i).padStart(4, '0');
  await page.screenshot({ path: path.join(framesDir, `f${n}.jpg`), type: 'jpeg', quality: 78 });
  i++;
  await page.waitForTimeout(120);
}

// Back to top settle
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
await page.waitForTimeout(400);
for (let k = 0; k < 12; k++) {
  const n = String(i).padStart(4, '0');
  await page.screenshot({ path: path.join(framesDir, `f${n}.jpg`), type: 'jpeg', quality: 78 });
  i++;
  await page.waitForTimeout(125);
}

const info = await page.evaluate(() => {
  const v = document.getElementById('hero-video');
  return { paused: v?.paused, t: v?.currentTime, src: v?.currentSrc };
});
console.log('frames', i, info);
await browser.close();

const enc = spawnSync('ffmpeg', [
  '-y', '-framerate', '8', '-i', path.join(framesDir, 'f%04d.jpg'),
  '-an', '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.1',
  '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart',
  '-vf', 'scale=390:844:flags=lanczos',
  path.join(out, 'v5j-phone-walkthrough.mp4'),
], { encoding: 'utf8' });
if (enc.status !== 0) {
  console.error(enc.stderr?.slice(-800));
  process.exit(1);
}
console.log('encoded phone walkthrough');
