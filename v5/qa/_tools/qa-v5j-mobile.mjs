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
  { w: 390, h: 844, name: '390' },
  { w: 430, h: 932, name: '430' },
  { w: 375, h: 667, name: '375' },
  { w: 360, h: 800, name: '360' },
  { w: 820, h: 1180, name: '820' },
];

async function forceSettle(page) {
  await page.evaluate(async () => {
    document.getElementById('loader')?.classList.add('done');
    document.body.classList.add('ready');
    const stage = document.getElementById('hero-stage');
    const video = document.getElementById('hero-video');
    const settle = document.getElementById('hero-settle');
    // wait a tick for mobile src swap
    await new Promise((r) => setTimeout(r, 200));
    if (video) {
      try { video.pause(); video.currentTime = Math.min(7.4, (video.duration || 8) - 0.1); } catch (_) {}
    }
    document.querySelectorAll('.holo-card').forEach((c) => {
      c.classList.add('on');
      if (c.classList.contains('rail-funding')) c.classList.add('checked');
    });
    const rail = document.getElementById('rail-score-num');
    if (rail) { rail.textContent = '742'; rail.classList.add('settled-score'); }
    stage?.classList.add('settled', 'settled-solid');
    stage?.classList.remove('mobile-fallback');
    if (settle) settle.style.opacity = '1';
    if (video) { video.style.opacity = '0'; video.style.visibility = 'hidden'; }
  });
  await page.waitForTimeout(250);
}

const metrics = {};
for (const size of sizes) {
  const page = await browser.newPage({
    viewport: { width: size.w, height: size.h },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  await page.goto('http://127.0.0.1:8765/v5/?v=v5j', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(600);
  await forceSettle(page);

  const info = await page.evaluate(() => {
    const video = document.getElementById('hero-video');
    const plate = document.getElementById('hero-plate');
    const overflowX = document.documentElement.scrollWidth > innerWidth + 2;
    const cards = [...document.querySelectorAll('.holo-card')].map((c, i) => ({
      i,
      on: c.classList.contains('on'),
      checked: c.classList.contains('checked'),
      w: Math.round(c.getBoundingClientRect().width),
      label: c.querySelector('figcaption')?.childNodes[0]?.textContent?.trim() || c.querySelector('.funding-card-lines')?.innerText,
    }));
    return {
      overflowX,
      scrollW: document.documentElement.scrollWidth,
      innerW: innerWidth,
      videoSrc: video?.currentSrc || video?.src || '',
      videoDisplay: video ? getComputedStyle(video).display : null,
      plateH: plate ? Math.round(plate.getBoundingClientRect().height) : null,
      settleOpacity: getComputedStyle(document.getElementById('hero-settle')).opacity,
      railScore: document.getElementById('rail-score-num')?.textContent,
      fundingCheck: !!document.querySelector('.rail-funding .funding-check'),
      cards,
      headline: document.querySelector('.headline')?.innerText,
      croa: document.querySelector('.croa')?.innerText,
    };
  });
  metrics[size.name] = info;
  await page.screenshot({ path: path.join(out, `v5j-${size.name}-settle.jpg`), type: 'jpeg', quality: 88 });
  // scroll to show rail mid
  await page.evaluate(() => { const c = document.getElementById('carousel'); if (c) c.scrollLeft = c.clientWidth * 0.9; });
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(out, `v5j-${size.name}-rail.jpg`), type: 'jpeg', quality: 88 });
  console.log(size.name, JSON.stringify({
    overflowX: info.overflowX, videoSrc: info.videoSrc.split('/').pop(), plateH: info.plateH,
    settleOpacity: info.settleOpacity, railScore: info.railScore, fundingCheck: info.fundingCheck,
    cardsOn: info.cards.filter(c => c.on).length,
  }));
  await page.close();
}

// mid-animation at 390
{
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  await page.goto('http://127.0.0.1:8765/v5/?v=v5j', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(400);
  // seek mid action
  await page.evaluate(async () => {
    document.getElementById('loader')?.classList.add('done');
    const v = document.getElementById('hero-video');
    if (v) {
      try {
        await v.play();
        v.currentTime = 5.8;
      } catch (_) {}
    }
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(out, 'v5j-390-mid.jpg'), type: 'jpeg', quality: 88 });
  await page.close();
  console.log('mid done');
}

// desktop 1440 settle for pixel compare vs v5i
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:8765/v5/?v=v5j', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => {
    document.getElementById('loader')?.classList.add('done');
    document.body.classList.add('ready');
    const style = document.createElement('style');
    style.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
    document.head.appendChild(style);
    const v = document.getElementById('hero-video');
    if (v) { try { v.pause(); v.style.display = 'none'; } catch (_) {} }
    document.querySelector('.hero-stage')?.classList.add('settled', 'settled-solid');
    const settle = document.querySelector('.hero-settle');
    if (settle) settle.style.opacity = '1';
    document.getElementById('wall')?.classList.add('revealed', 'react', 'beam-hit', 'settled');
    document.querySelectorAll('.tile').forEach((t) => t.classList.add('on'));
    const score = document.getElementById('score-num');
    if (score) { score.textContent = '742'; score.classList.add('settled-score'); score.closest('.score-tile')?.classList.add('score-filled'); }
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(out, 'v5j-1440-settle.jpg'), type: 'jpeg', quality: 90 });
  await page.close();
  console.log('desktop 1440 done');
}

fs.writeFileSync(path.join(out, 'v5j-mobile-metrics.json'), JSON.stringify(metrics, null, 2));
await browser.close();
