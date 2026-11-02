import { chromium, devices } from '../../../v4/qa/_tools/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(__dirname, '..');
const raw = path.join(out, '_video-raw');
fs.mkdirSync(raw, { recursive: true });

const BASE = process.env.V5J_BASE || 'http://127.0.0.1:8765/v5/?v=v5j';

async function recordDesktop() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome-stable',
    args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    recordVideo: { dir: raw, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  // let loader + full animation run
  await page.waitForTimeout(2500);
  // cursor move across scene
  await page.mouse.move(200, 400);
  await page.waitForTimeout(400);
  await page.mouse.move(700, 380, { steps: 20 });
  await page.waitForTimeout(400);
  await page.mouse.move(1100, 420, { steps: 18 });
  await page.waitForTimeout(600);
  // wait through settle (~7.3s from play + buffer)
  await page.waitForTimeout(6500);
  // short scroll
  await page.evaluate(() => window.scrollTo({ top: 420, behavior: 'smooth' }));
  await page.waitForTimeout(900);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(800);
  await context.close();
  await browser.close();
  const files = fs.readdirSync(raw).filter((f) => f.endsWith('.webm')).map((f) => ({
    f, m: fs.statSync(path.join(raw, f)).mtimeMs,
  })).sort((a, b) => b.m - a.m);
  const newest = files[0]?.f;
  if (!newest) throw new Error('no desktop webm');
  fs.renameSync(path.join(raw, newest), path.join(raw, 'desktop.webm'));
  console.log('desktop raw', newest);
}

async function recordPhone() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome-stable',
    args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
  });
  const iPhone = devices['iPhone 13'];
  const context = await browser.newContext({
    ...iPhone,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    recordVideo: { dir: raw, size: { width: 390, height: 844 } },
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(1500);
  // ensure play with gesture
  await page.touchscreen.tap(200, 400);
  await page.waitForTimeout(500);
  // wait for rail + motion
  await page.waitForTimeout(3500);
  // scroll to rail
  await page.evaluate(() => document.getElementById('wins')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  await page.waitForTimeout(900);
  // swipe carousel
  const box = await page.evaluate(() => {
    const c = document.getElementById('carousel');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x + r.width * 0.75, y: r.y + r.height * 0.5, w: r.width };
  });
  if (box) {
    await page.touchscreen.tap(box.x, box.y);
    await page.mouse.move(box.x, box.y);
    await page.mouse.down();
    await page.mouse.move(box.x - box.w * 0.55, box.y, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(700);
    await page.mouse.move(box.x, box.y);
    await page.mouse.down();
    await page.mouse.move(box.x - box.w * 0.55, box.y, { steps: 12 });
    await page.mouse.up();
  }
  await page.waitForTimeout(1200);
  // scroll a bit more then back up to see settle
  await page.evaluate(() => window.scrollBy({ top: 280, behavior: 'smooth' }));
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(2500);
  await context.close();
  await browser.close();
  const files = fs.readdirSync(raw).filter((f) => f.endsWith('.webm') && f !== 'desktop.webm')
    .map((f) => ({ f, m: fs.statSync(path.join(raw, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  const newest = files[0]?.f;
  if (!newest) throw new Error('no phone webm');
  fs.renameSync(path.join(raw, newest), path.join(raw, 'phone.webm'));
  console.log('phone raw', newest);
}

await recordDesktop();
await recordPhone();
console.log('raw recordings done');
