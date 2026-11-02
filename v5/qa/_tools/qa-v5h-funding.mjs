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
  { w: 1280, h: 800, name: '1280' },
  { w: 1366, h: 768, name: '1366' },
  { w: 1440, h: 900, name: '1440' },
  { w: 1920, h: 1080, name: '1920' },
];

const report = {};
for (const size of sizes) {
  const page = await browser.newPage({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:8765/v5/?v=v5h', { waitUntil: 'domcontentloaded', timeout: 60000 });
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

  const info = await page.evaluate(() => {
    const tile = document.querySelector('.funding-tile');
    const line = document.querySelector('.funding-line');
    const stack = document.querySelector('.funding-stack');
    const check = document.querySelector('.funding-check');
    const tr = tile.getBoundingClientRect();
    const lr = line.getBoundingClientRect();
    const sr = stack.getBoundingClientRect();
    const cr = check?.getBoundingClientRect();
    const cs = getComputedStyle(line);
    const padL = parseFloat(getComputedStyle(stack).paddingLeft);
    const padR = parseFloat(getComputedStyle(stack).paddingRight);
    // Layout (pre-perspective) widths via offsetWidth
    const tileLayoutW = tile.offsetWidth;
    const lineScrollW = line.scrollWidth;
    const lineClientW = line.clientWidth;
    const stackClientW = stack.clientWidth;
    const padPct = tileLayoutW ? ((padL + padR) / 2 / tileLayoutW * 100) : 0;
    // Room: how much of client width the longest word uses — measure via canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const wFunding = ctx.measureText('Funding').width;
    const wApproved = ctx.measureText('Approved').width;
    const contentW = Math.max(wFunding, wApproved);
    const availW = stackClientW; // already inside 8% padding
    const sparePx = availW - contentW;
    const sparePct = availW ? (sparePx / availW * 100) : 0;
    return {
      text: line.innerText.replace(/\n/g, ' '),
      fontSize: cs.fontSize,
      tileProjected: { w: Math.round(tr.width), h: Math.round(tr.height), x: Math.round(tr.x), y: Math.round(tr.y) },
      lineProjected: { w: Math.round(lr.width), h: Math.round(lr.height) },
      check: cr ? { w: Math.round(cr.width), h: Math.round(cr.height), visible: cr.width > 0 } : null,
      tileLayoutW,
      stackClientW,
      lineScrollW,
      lineClientW,
      padL: Math.round(padL),
      padR: Math.round(padR),
      padPctEach: +padPct.toFixed(1),
      contentW: +contentW.toFixed(1),
      sparePx: +sparePx.toFixed(1),
      sparePct: +sparePct.toFixed(1),
      overflows: lineScrollW > lineClientW + 1,
      fitsWithSpare: sparePx >= 4 && lineScrollW <= lineClientW + 1,
    };
  });
  report[size.name] = info;

  const settlePath = path.join(out, `v5h-${size.name}-settle.jpg`);
  await page.screenshot({ path: settlePath, type: 'jpeg', quality: 90 });

  // Crop funding tile with padding
  const t = info.tileProjected;
  const pad = 6;
  await page.screenshot({
    path: path.join(out, `v5h-${size.name}-funding-crop.jpg`),
    type: 'jpeg',
    quality: 95,
    clip: {
      x: Math.max(0, t.x - pad),
      y: Math.max(0, t.y - pad),
      width: Math.min(size.w - Math.max(0, t.x - pad), t.w + pad * 2),
      height: Math.min(size.h - Math.max(0, t.y - pad), t.h + pad * 2),
    },
  });
  console.log(size.name, JSON.stringify(info));
  await page.close();
}
fs.writeFileSync(path.join(out, 'v5h-funding-metrics.json'), JSON.stringify(report, null, 2));
await browser.close();
const allOk = Object.values(report).every((r) => r.fitsWithSpare && !r.overflows);
console.log(allOk ? 'PASS: Funding fits with spare at all sizes' : 'FAIL: some sizes clip');
