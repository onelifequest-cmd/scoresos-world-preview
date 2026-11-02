import { chromium } from '../../../v4/qa/_tools/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(__dirname, '..');
const BASE = process.env.V5L_BASE || 'http://127.0.0.1:8765/v5/?v=v5l';

async function record(label, opts, seconds = 13) {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome-stable',
    args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
  });
  const context = await browser.newContext({
    ...opts,
    recordVideo: { dir: out, size: { width: opts.viewport.width, height: opts.viewport.height } },
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // wait until loader gone AND video playing (fly-in start)
  await page.waitForFunction(() => {
    const loader = document.getElementById('loader');
    const stage = document.getElementById('hero-stage');
    const v = document.getElementById('hero-video');
    return loader?.classList.contains('done') && stage?.classList.contains('video-playing') && v && !v.paused;
  }, { timeout: 20000 }).catch(async () => {
    await page.evaluate(async () => {
      const v = document.getElementById('hero-video');
      if (v) { v.muted = true; try { v.currentTime = 0; await v.play(); } catch (e) {} }
      document.getElementById('loader')?.classList.add('done');
    });
  });
  // mark t0 of content for stills — record continues for `seconds` from fly-in start
  const t0 = Date.now();
  await page.waitForTimeout(seconds * 1000);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  await context.close();
  await browser.close();
  const files = fs.readdirSync(out).filter(f => f.endsWith('.webm')).map(f => ({
    f, m: fs.statSync(path.join(out, f)).mtimeMs
  })).sort((a,b) => b.m - a.m);
  const src = path.join(out, files[0].f);
  const destWebm = path.join(out, `v5l-${label}-recording.webm`);
  const destMp4 = path.join(out, `v5l-${label}-recording.mp4`);
  if (fs.existsSync(destWebm)) fs.unlinkSync(destWebm);
  if (fs.existsSync(destMp4)) fs.unlinkSync(destMp4);
  fs.renameSync(src, destWebm);
  spawnSync('ffmpeg', ['-y', '-i', destWebm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-an', destMp4], { stdio: 'pipe' });
  // find first bright frame (post-loader) then extract +0.2,+0.8,+2.0 from there
  let first = 0;
  for (let t = 0; t < 8; t += 0.2) {
    const tmp = `/tmp/probe-${label}-${t}.jpg`;
    spawnSync('ffmpeg', ['-y', '-ss', String(t), '-i', destMp4, '-frames:v', '1', '-update', '1', '-q:v', '5', tmp], { stdio: 'pipe' });
    // use filesize heuristic
    const sz = fs.existsSync(tmp) ? fs.statSync(tmp).size : 0;
    if (sz > 40000) { first = t; break; }
  }
  console.log(label, 'first-content≈', first, 'elapsedContent', elapsed);
  for (const off of [0.15, 0.8, 2.0]) {
    const t = (first + off).toFixed(2);
    const name = `v5l-${label}-rec-t${String(off).replace('.', 'p')}.jpg`;
    spawnSync('ffmpeg', ['-y', '-ss', t, '-i', destMp4, '-frames:v', '1', '-update', '1', '-q:v', '2', path.join(out, name)], { stdio: 'pipe' });
  }
  console.log('recorded', label, destMp4, 'bytes', fs.statSync(destMp4).size);
}

await record('desk', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, 13);
await record('phone', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }, 13);
console.log('done');
