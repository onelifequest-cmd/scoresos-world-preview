import { chromium } from '../../../v4/qa/_tools/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(__dirname, '..');
const BASE = process.env.V5K_BASE || 'https://scoresos-world-preview.onrender.com/v5/?v=v5k';

async function stitch(name, opts, capture) {
  const framesDir = path.join(out, '_wt-frames', name);
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome-stable',
    args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
  });
  const context = await browser.newContext(opts);
  const page = await context.newPage();
  let i = 0;
  const shoot = async () => {
    await page.screenshot({
      path: path.join(framesDir, `f${String(i).padStart(4, '0')}.jpg`),
      type: 'jpeg', quality: opts.isMobile ? 76 : 68,
    });
    i++;
  };
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await capture(page, shoot);
  console.log(name, 'frames', i);
  await browser.close();

  const mp4 = path.join(out, `v5k-${name}-walkthrough.mp4`);
  const scale = opts.isMobile ? '390:844' : '1440:900';
  const enc = spawnSync('ffmpeg', [
    '-y', '-framerate', '8', '-i', path.join(framesDir, 'f%04d.jpg'),
    '-an', '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.1',
    '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart',
    '-vf', `scale=${scale}:flags=lanczos,format=yuv420p`,
    '-color_range', 'tv', '-colorspace', 'bt709',
    mp4,
  ], { encoding: 'utf8' });
  if (enc.status !== 0) { console.error(enc.stderr?.slice(-800)); process.exit(1); }
  console.log('encoded', mp4, 'bytes', fs.statSync(mp4).size);
}

await stitch('desktop', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, async (page, shoot) => {
  // Wait loader + first frames, then shoot continuously for ~100 frames
  await page.waitForFunction(() => {
    const v = document.getElementById('hero-video');
    const loader = document.getElementById('loader');
    return loader?.classList.contains('done') && v && v.currentTime > 0.2;
  }, { timeout: 45000 }).catch(() => {});
  await page.evaluate(async () => {
    const v = document.getElementById('hero-video');
    if (v) { v.muted = true; try { await v.play(); } catch (e) {} }
  });
  // Intro through settle (~60 frames)
  for (let n = 0; n < 60; n++) {
    if (n % 10 === 2) await page.mouse.move(200 + (n * 17) % 900, 340 + (n % 5) * 25, { steps: 4 });
    if (n % 10 === 7) await page.mouse.move(1000 - (n % 6) * 40, 420, { steps: 4 });
    await shoot();
    await page.waitForTimeout(90);
  }
  await page.waitForFunction(() => document.getElementById('hero-stage')?.classList.contains('ambient'), { timeout: 12000 }).catch(() => {});
  // Ambient: hover tiles + parallax (~40 frames)
  const boxes = await page.$$eval('.tile.holo', (els) => els.map((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }));
  for (const b of boxes) {
    await page.mouse.move(b.x, b.y, { steps: 6 });
    for (let k = 0; k < 5; k++) { await shoot(); await page.waitForTimeout(90); }
  }
  await page.mouse.move(1180, 500, { steps: 12 });
  for (let k = 0; k < 10; k++) { await shoot(); await page.waitForTimeout(90); }
});

await stitch('phone', {
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 1,
  isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
}, async (page, shoot) => {
  await page.touchscreen.tap(195, 400);
  await page.waitForFunction(() => {
    const v = document.getElementById('hero-video');
    return v && (v.currentTime > 0.15 || !v.paused);
  }, { timeout: 30000 }).catch(() => {});
  await page.evaluate(async () => {
    const v = document.getElementById('hero-video');
    if (v) { v.muted = true; try { await v.play(); } catch (e) {} }
  });
  for (let n = 0; n < 55; n++) { await shoot(); await page.waitForTimeout(95); }
  await page.waitForFunction(() => document.getElementById('hero-stage')?.classList.contains('ambient'), { timeout: 12000 }).catch(() => {});
  await page.evaluate(() => document.getElementById('wins')?.scrollIntoView({ behavior: 'instant', block: 'center' }));
  for (let k = 0; k < 10; k++) { await shoot(); await page.waitForTimeout(95); }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  for (let k = 0; k < 15; k++) { await shoot(); await page.waitForTimeout(95); }
});
