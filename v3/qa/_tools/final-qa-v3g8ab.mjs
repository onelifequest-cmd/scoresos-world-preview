import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const QA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = "/usr/bin/google-chrome";
const LUMEA_STILL =
  "/workspace/refs/getlayers/lumea/public/assets/scene-still-desktop.webp";
const PORT = 8765;
const TS = Date.now();

async function launch(w, h) {
  return puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
      `--window-size=${w},${h}`,
    ],
    defaultViewport: { width: w, height: h, deviceScaleFactor: 1 },
  });
}

async function waitCanvas(page) {
  await page.waitForFunction(() => {
    const c = document.querySelector("#lumea-hero-root canvas");
    return c && c.width > 200;
  }, { timeout: 90000 });
  await page.evaluate(() => {
    try {
      window.__skipIntro?.();
    } catch {}
  });
  // Let needle climb most of the way (~3.6s)
  await new Promise((r) => setTimeout(r, 4200));
}

async function still(variant, w, h, name) {
  const browser = await launch(w, h);
  const page = await browser.newPage();
  page.setDefaultTimeout(90000);
  page.on("pageerror", (e) => console.log("PAGEERR", variant, e.message));
  const url = `http://127.0.0.1:${PORT}/qa-hero.html?v=${variant}&t=${TS}`;
  await page.goto(url, { waitUntil: "networkidle0", timeout: 90000 });
  await waitCanvas(page);
  const out = path.join(QA, name);
  await page.screenshot({ path: out, type: "png" });
  await browser.close();
  console.log("still", name, fs.statSync(out).size);
  return out;
}

async function recordMp4(variant, outName) {
  const w = 1280,
    h = 800;
  const browser = await launch(w, h);
  const page = await browser.newPage();
  await page.goto(
    `http://127.0.0.1:${PORT}/qa-hero.html?v=${variant}&t=${TS}`,
    { waitUntil: "networkidle0", timeout: 90000 },
  );
  await waitCanvas(page);
  const frames = path.join(QA, `_frames_${variant}`);
  fs.rmSync(frames, { recursive: true, force: true });
  fs.mkdirSync(frames);
  for (let i = 0; i < 120; i++) {
    const file = path.join(frames, `f${String(i).padStart(4, "0")}.jpg`);
    await page.screenshot({ path: file, type: "jpeg", quality: 85 });
    await new Promise((r) => setTimeout(r, 100));
  }
  await browser.close();
  const mp4 = path.join(QA, outName);
  execSync(
    `ffmpeg -y -framerate 10 -i "${frames}/f%04d.jpg" -c:v libx264 -pix_fmt yuv420p -crf 20 "${mp4}"`,
    { stdio: "inherit" },
  );
  console.log("mp4", outName, fs.statSync(mp4).size);
}

const lumeaPng = path.join(QA, "lumea-still-desktop.png");
if (!fs.existsSync(lumeaPng)) {
  execSync(`dwebp "${LUMEA_STILL}" -o "${lumeaPng}"`, { stdio: "inherit" });
}

for (const variant of ["v3g8a", "v3g8b"]) {
  await still(variant, 1440, 900, `hero-${variant}-1440x900.png`);
  await still(variant, 1280, 800, `hero-${variant}-1280x800.png`);
  const src1280 = path.join(QA, `hero-${variant}-1280x800.png`);
  // Character / emblem crop — center pillar region
  execSync(
    `ffmpeg -y -i "${src1280}" -vf "crop=640:640:320:60" -update 1 -frames:v 1 "${path.join(QA, `chars-emblem-crop-${variant}.png`)}"`,
    { stdio: "inherit" },
  );
  execSync(
    `ffmpeg -y -i "${src1280}" -i "${lumeaPng}" -filter_complex "[0:v]scale=640:400:force_original_aspect_ratio=decrease,pad=640:400:(ow-iw)/2:(oh-ih)/2[a];[1:v]scale=640:400:force_original_aspect_ratio=decrease,pad=640:400:(ow-iw)/2:(oh-ih)/2[b];[a][b]hstack=inputs=2" -update 1 -frames:v 1 "${path.join(QA, `${variant}-vs-lumea-sidebyside.png`)}"`,
    { stdio: "inherit" },
  );
  await recordMp4(variant, `hero-${variant}-12s.mp4`);
}

// Convenience aliases for variant a as "current"
fs.copyFileSync(
  path.join(QA, "hero-v3g8a-1440x900.png"),
  path.join(QA, "hero-1440x900.png"),
);
fs.copyFileSync(
  path.join(QA, "hero-v3g8a-1280x800.png"),
  path.join(QA, "hero-1280x800.png"),
);
console.log("QA v3g8a/b complete");
