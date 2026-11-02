import { chromium } from '../../../v4/qa/_tools/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(__dirname, '..');
const BASE = process.env.V5L_BASE || 'http://127.0.0.1:8765/v5/?v=v5l';

fs.mkdirSync(out, { recursive: true });

async function shot(page, name) {
  const p = path.join(out, name);
  await page.screenshot({ path: p, type: 'jpeg', quality: 92 });
  console.log('shot', name);
  return p;
}

async function measureScale(page) {
  return page.evaluate(() => {
    const ids = ['hero-video', 'hero-ambient', 'hero-settle', 'hero-plate'];
    const out = {};
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) { out[id] = null; continue; }
      const cs = getComputedStyle(el);
      const tr = cs.transform;
      let scale = 1;
      if (tr && tr !== 'none') {
        const m = tr.match(/matrix\(([^)]+)\)/);
        if (m) {
          const parts = m[1].split(',').map(Number);
          scale = Math.sqrt(parts[0] * parts[0] + parts[1] * parts[1]);
        }
      }
      out[id] = { transform: tr, scale: Number(scale.toFixed(4)), objectFit: cs.objectFit, objectPosition: cs.objectPosition };
    }
    const v = document.getElementById('hero-video');
    out.video = v ? { w: v.videoWidth, h: v.videoHeight, t: v.currentTime, paused: v.paused, src: v.currentSrc } : null;
    const a = document.getElementById('hero-ambient');
    out.ambient = a ? { w: a.videoWidth, h: a.videoHeight, t: a.currentTime, paused: a.paused, src: a.currentSrc } : null;
    out.stageClass = document.getElementById('hero-stage')?.className;
    return out;
  });
}

async function runViewport(label, opts, times) {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome-stable',
    args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
  });
  const context = await browser.newContext(opts);
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.getElementById('loader')?.classList.contains('done'), { timeout: 20000 }).catch(() => {});
  await page.evaluate(async () => {
    const v = document.getElementById('hero-video');
    if (v) { v.muted = true; try { await v.play(); } catch (e) {} }
  });

  const results = { label, scales: [], files: [] };
  for (const t of times) {
    await page.waitForTimeout(Math.max(0, (t * 1000) - (results._last || 0)));
    results._last = t * 1000;
    // force time if possible for early fly-in
    if (t < 7) {
      await page.evaluate((tt) => {
        const v = document.getElementById('hero-video');
        if (v && v.readyState >= 2) { try { v.currentTime = tt; } catch (e) {} }
      }, t).catch(() => {});
      await page.waitForTimeout(180);
    }
    const name = `v5l-${label}-t${String(t).replace('.', 'p')}.jpg`;
    await shot(page, name);
    results.files.push(name);
    const m = await measureScale(page);
    results.scales.push({ t, ...m });
    console.log(label, 't=' + t, 'scale video', m['hero-video']?.scale, 'ambient', m['hero-ambient']?.scale, 'stage', m.stageClass);
  }

  // wait for settle/ambient
  await page.waitForFunction(() => document.getElementById('hero-stage')?.classList.contains('ambient') || document.getElementById('hero-stage')?.classList.contains('settled'), { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2200);
  await shot(page, `v5l-${label}-settle.jpg`);
  const mSettle = await measureScale(page);
  results.settle = mSettle;
  console.log(label, 'SETTLE', mSettle['hero-video']?.scale, mSettle['hero-ambient']?.scale, mSettle.stageClass, mSettle.ambient);

  // ambient a bit later
  await page.waitForTimeout(3000);
  await shot(page, `v5l-${label}-ambient.jpg`);
  results.ambient = await measureScale(page);

  await browser.close();
  delete results._last;
  return results;
}

const desk = await runViewport('1440', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, [0.15, 0.8, 2.0, 5.5]);
const mid = await runViewport('1280', { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 }, [0.15, 2.0]);
const phone = await runViewport('390', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, [0.15, 0.8, 2.0]);

fs.writeWrite = null;
fs.writeFileSync(path.join(out, 'v5l-scale-metrics.json'), JSON.stringify({ desk, mid, phone, base: BASE }, null, 2));
console.log('wrote metrics');
