import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(__dirname, '..');
const url = process.env.QA_URL || 'https://scoresos-world-preview.onrender.com/v4/?v=v4b';

const browser = await chromium.launch({
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
});

async function still(name, size) {
  const page = await browser.newPage({
    viewport: { width: size.w, height: size.h },
    deviceScaleFactor: 1,
  });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // wait for loader to finish + tiles on
  await page.waitForFunction(() => {
    const l = document.getElementById('loader');
    return l && l.classList.contains('done');
  }, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2800); // score tick underway, tiles revealed
  // move cursor toward wall for tilt glow
  await page.mouse.move(Math.round(size.w * 0.18), Math.round(size.h * 0.42));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, name), type: 'png' });
  await page.close();
  console.log('wrote', name);
}

await still('hero-1440x900.png', { w: 1440, h: 900 });
await still('hero-1280x800.png', { w: 1280, h: 800 });
await still('hero-390x844.png', { w: 390, h: 844 });

// 12s recording: tile reveal, score tick, cursor tilt
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: { dir: path.join(out, '_rec'), size: { width: 1440, height: 900 } },
});
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
const t0 = Date.now();
// sweep mouse across wall while score ticks / tiles reveal
for (let i = 0; i < 24; i++) {
  const x = 80 + (i % 8) * 55;
  const y = 220 + Math.floor(i / 8) * 90 + (i % 2) * 20;
  await page.mouse.move(x, y, { steps: 8 });
  await page.waitForTimeout(450);
}
// ensure ~12s
const elapsed = Date.now() - t0;
if (elapsed < 12000) await page.waitForTimeout(12000 - elapsed);
const vid = page.video();
await page.close();
const rawPath = await vid.path();
console.log('raw video', rawPath);

await browser.close();

// Transcode to mp4 via ffmpeg
import { spawnSync } from 'child_process';
const dest = path.join(out, 'hero-12s.mp4');
const r = spawnSync('ffmpeg', ['-y', '-i', rawPath, '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', dest], { encoding: 'utf8' });
if (r.status !== 0) {
  console.error(r.stderr);
  process.exit(1);
}
console.log('wrote', dest);
