import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const QA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = "/usr/bin/google-chrome";
const LUMEA_STILL =
  "/workspace/refs/getlayers/lumea/public/assets/scene-still-desktop.webp";
const VARIANT = "v3g9";
const TS = Date.now();
const BASE = `https://scoresos-world-preview.onrender.com/v3/?v=${VARIANT}&qa=1&t=${TS}`;

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

async function waitLoaderDone(page) {
  const started = Date.now();
  await page.waitForFunction(() => {
    const loader = document.getElementById("loader");
    const done = !loader || loader.classList.contains("done");
    const c = document.querySelector("#lumea-hero-root canvas");
    return done && c && c.width > 200;
  }, { timeout: 180000 });
  const ms = Date.now() - started;
  const info = await page.evaluate(() => {
    const loader = document.getElementById("loader");
    const title = document.querySelector(".hero-headline-behind")?.textContent?.trim();
    const brand = document.querySelector(".brand span")?.textContent?.trim();
    const logo = document.querySelector(".brand img")?.getAttribute("src");
    const h1 = document.querySelector(".hero-title")?.textContent?.trim();
    return {
      loaderDone: !loader || loader.classList.contains("done"),
      pct: document.getElementById("loader-pct")?.textContent,
      title, brand, logo, h1,
      font: getComputedStyle(document.querySelector(".hero-headline-behind") || document.body).fontFamily,
    };
  });
  console.log("loader.done in", ms, "ms", JSON.stringify(info));
  // needle settle
  await new Promise((r) => setTimeout(r, 4800));
  return info;
}

async function still(w, h, name) {
  const browser = await launch(w, h);
  const page = await browser.newPage();
  page.setDefaultTimeout(180000);
  const failed = [];
  page.on("pageerror", (e) => console.log("PAGEERR", e.message.slice(0, 200)));
  page.on("response", (res) => {
    if (res.status() >= 400) failed.push(`${res.status()} ${res.url()}`);
  });
  console.log("goto", BASE);
  await page.goto(BASE, { waitUntil: "networkidle0", timeout: 180000 });
  const info = await waitLoaderDone(page);
  const out = path.join(QA, name);
  await page.screenshot({ path: out, type: "png" });
  await browser.close();
  const bad = failed.filter((u) => /gsap|ScrollTrigger|lenis|maxine-ref|logo-white|vendor/i.test(u));
  console.log("live", name, fs.statSync(out).size, "vendor404s", bad.slice(0, 10));
  return { out, info, bad };
}

const r1 = await still(1280, 800, `hero-${VARIANT}-live-1280x800.png`);
const r2 = await still(1440, 900, `hero-${VARIANT}-live-1440x900.png`);

const src = path.join(QA, `hero-${VARIANT}-live-1280x800.png`);
execSync(
  `ffmpeg -y -i "${src}" -vf "crop=560:700:360:50" -update 1 -frames:v 1 "${path.join(QA, `chars-crop-${VARIANT}-live.png`)}"`,
  { stdio: "inherit" },
);

const lumeaPng = path.join(QA, "lumea-still-desktop.png");
if (!fs.existsSync(lumeaPng)) {
  execSync(`dwebp "${LUMEA_STILL}" -o "${lumeaPng}"`, { stdio: "inherit" });
}
execSync(
  `ffmpeg -y -i "${src}" -i "${lumeaPng}" -filter_complex "[0:v]scale=640:400:force_original_aspect_ratio=decrease,pad=640:400:(ow-iw)/2:(oh-ih)/2[a];[1:v]scale=640:400:force_original_aspect_ratio=decrease,pad=640:400:(ow-iw)/2:(oh-ih)/2[b];[a][b]hstack=inputs=2" -update 1 -frames:v 1 "${path.join(QA, `${VARIANT}-vs-lumea-sidebyside-live.png`)}"`,
  { stdio: "inherit" },
);

// 12s live mp4 — 60 frames @ 5fps to keep runtime sane (~60s capture)
{
  const w = 1280, h = 800;
  const browser = await launch(w, h);
  const page = await browser.newPage();
  page.setDefaultTimeout(180000);
  await page.goto(BASE, { waitUntil: "networkidle0", timeout: 180000 });
  await waitLoaderDone(page);
  const frames = path.join(QA, `_frames_${VARIANT}_live`);
  fs.rmSync(frames, { recursive: true, force: true });
  fs.mkdirSync(frames);
  const N = 60;
  for (let i = 0; i < N; i++) {
    const file = path.join(frames, `f${String(i).padStart(4, "0")}.jpg`);
    await page.screenshot({ path: file, type: "jpeg", quality: 82 });
    await new Promise((r) => setTimeout(r, 80));
    if (i % 10 === 0) console.log("frame", i);
  }
  await browser.close();
  const mp4 = path.join(QA, `hero-${VARIANT}-live-12s.mp4`);
  const fps = (N / 12).toFixed(3);
  execSync(
    `ffmpeg -y -framerate ${fps} -i "${frames}/f%04d.jpg" -c:v libx264 -pix_fmt yuv420p -crf 22 -movflags +faststart "${mp4}"`,
    { stdio: "inherit" },
  );
  console.log("mp4", mp4, fs.statSync(mp4).size);
}

// Also refresh primary stills from live
fs.copyFileSync(path.join(QA, `hero-${VARIANT}-live-1280x800.png`), path.join(QA, `hero-${VARIANT}-1280x800.png`));
fs.copyFileSync(path.join(QA, `hero-${VARIANT}-live-1440x900.png`), path.join(QA, `hero-${VARIANT}-1440x900.png`));
fs.copyFileSync(path.join(QA, `chars-crop-${VARIANT}-live.png`), path.join(QA, `chars-crop-${VARIANT}.png`));
fs.copyFileSync(path.join(QA, `${VARIANT}-vs-lumea-sidebyside-live.png`), path.join(QA, `${VARIANT}-vs-lumea-sidebyside.png`));
fs.copyFileSync(path.join(QA, `hero-${VARIANT}-live-12s.mp4`), path.join(QA, `hero-${VARIANT}-12s.mp4`));
fs.copyFileSync(path.join(QA, `hero-${VARIANT}-1440x900.png`), path.join(QA, "hero-1440x900.png"));
fs.copyFileSync(path.join(QA, `hero-${VARIANT}-1280x800.png`), path.join(QA, "hero-1280x800.png"));

console.log("LIVE_QA_DONE", JSON.stringify({ brand: r1.info, bad: r1.bad }));
