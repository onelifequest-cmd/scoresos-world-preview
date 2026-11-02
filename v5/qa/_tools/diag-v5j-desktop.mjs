import { chromium } from '../../../v4/qa/_tools/node_modules/playwright/index.mjs';

const URL = process.env.URL || 'https://scoresos-world-preview.onrender.com/v5/?v=v5j';
const UAs = {
  chrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
};

async function run(label, ua, w, h) {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome-stable',
    args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox', '--disk-cache-size=1', '--disable-http-cache'],
  });
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    userAgent: ua,
    bypassCSP: false,
  });
  // Force no cache
  await ctx.route('**/*', async (route) => {
    const headers = { ...route.request().headers(), 'Cache-Control': 'no-cache', Pragma: 'no-cache' };
    await route.continue({ headers });
  });
  const page = await ctx.newPage();
  const t0 = Date.now();
  const marks = {};
  page.on('console', (m) => {});
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  marks.dom = Date.now() - t0;

  const attrs = await page.evaluate(() => {
    const v = document.getElementById('hero-video');
    return {
      muted: v?.muted, defaultMuted: v?.defaultMuted,
      autoplay: v?.autoplay, playsInline: v?.playsInline,
      hasMutedAttr: v?.hasAttribute('muted'),
      hasAutoplay: v?.hasAttribute('autoplay'),
      hasPlaysinline: v?.hasAttribute('playsinline'),
      hasWebkit: v?.hasAttribute('webkit-playsinline'),
      preload: v?.preload, loop: v?.loop,
      src: v?.currentSrc || [...(v?.querySelectorAll('source')||[])].map(s=>s.src),
    };
  });

  // Wait for first non-zero currentTime or timeout
  let firstFrameMs = null;
  try {
    await page.waitForFunction(() => {
      const v = document.getElementById('hero-video');
      return v && !v.paused && v.currentTime > 0.05 && v.readyState >= 2;
    }, { timeout: 25000 });
    firstFrameMs = Date.now() - t0;
  } catch {
    firstFrameMs = null;
  }

  await page.waitForTimeout(1500);
  const mid = await page.evaluate(() => {
    const v = document.getElementById('hero-video');
    const stage = document.getElementById('hero-stage');
    const settle = document.getElementById('hero-settle');
    const cs = settle ? getComputedStyle(settle) : null;
    const vs = v ? getComputedStyle(v) : null;
    return {
      paused: v?.paused, t: v?.currentTime, readyState: v?.readyState,
      networkState: v?.networkState, videoW: v?.videoWidth, videoH: v?.videoHeight,
      stageClass: stage?.className,
      videoOpacity: vs?.opacity, videoVisibility: vs?.visibility,
      settleOpacity: cs?.opacity,
      err: v?.error?.code,
    };
  });

  // Wait until settle expected
  await page.waitForTimeout(7000);
  const late = await page.evaluate(() => {
    const v = document.getElementById('hero-video');
    const stage = document.getElementById('hero-stage');
    const settle = document.getElementById('hero-settle');
    return {
      paused: v?.paused, t: v?.currentTime,
      stageClass: stage?.className,
      videoOpacity: v ? getComputedStyle(v).opacity : null,
      settleOpacity: settle ? getComputedStyle(settle).opacity : null,
      videoVis: v ? getComputedStyle(v).visibility : null,
    };
  });

  console.log(JSON.stringify({ label, w, h, marks, firstFrameMs, attrs, mid, late }, null, 2));
  await browser.close();
}

for (const [name, ua] of Object.entries(UAs)) {
  await run(`${name}-1440`, ua, 1440, 900);
  await run(`${name}-1920`, ua, 1920, 1080);
}
