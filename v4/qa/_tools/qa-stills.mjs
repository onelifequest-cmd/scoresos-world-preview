
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(__dirname, '..');
const url = process.env.QA_URL || 'http://127.0.0.1:8765/v4/?v=v4c1';
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
async function still(name, size) {
  const page = await browser.newPage({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.getElementById('loader')?.classList.contains('done'), { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2600);
  await page.mouse.move(Math.round(size.w * 0.14), Math.round(size.h * 0.40));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, name), type: 'png' });
  await page.close();
  console.log('wrote', name);
}
await still('hero-1440x900.png', { w: 1440, h: 900 });
await still('hero-1280x800.png', { w: 1280, h: 800 });
await still('hero-390x844.png', { w: 390, h: 844 });
await browser.close();
