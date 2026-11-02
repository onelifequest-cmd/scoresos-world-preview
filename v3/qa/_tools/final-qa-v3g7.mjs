import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const QA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = "/usr/bin/google-chrome";
const BASE = "http://127.0.0.1:8765/qa-hero.html?v=v3g7&t=" + Date.now();
const LUMEA_STILL =
  "/workspace/refs/getlayers/lumea/public/assets/scene-still-desktop.webp";

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
    try { window.__skipIntro?.(); } catch {}
  });
  await new Promise((r) => setTimeout(r, 2800));
}

async function still(w, h, name) {
  const browser = await launch(w, h);
  const page = await browser.newPage();
  page.setDefaultTimeout(90000);
  page.on("pageerror", (e) => console.log("PAGEERR", e.message));
  await page.goto(BASE, { waitUntil: "networkidle0", timeout: 90000 });
  await waitCanvas(page);
  const out = path.join(QA, name);
  await page.screenshot({ path: out, type: "png" });
  await browser.close();
  console.log("still", name, fs.statSync(out).size);
}

await still(1440, 900, "hero-v3g7-1440x900.png");
await still(1280, 800, "hero-v3g7-1280x800.png");
fs.copyFileSync(path.join(QA, "hero-v3g7-1440x900.png"), path.join(QA, "hero-1440x900.png"));
fs.copyFileSync(path.join(QA, "hero-v3g7-1280x800.png"), path.join(QA, "hero-1280x800.png"));

execSync(
  `ffmpeg -y -i "${path.join(QA, "hero-v3g7-1280x800.png")}" -vf "crop=520:520:380:100" -update 1 -frames:v 1 "${path.join(QA, "emblem-crop-v3g7.png")}"`,
  { stdio: "inherit" },
);

const lumeaPng = path.join(QA, "lumea-still-desktop.png");
if (!fs.existsSync(lumeaPng)) {
  execSync(`dwebp "${LUMEA_STILL}" -o "${lumeaPng}"`, { stdio: "inherit" });
}
execSync(
  `ffmpeg -y -i "${path.join(QA, "hero-v3g7-1280x800.png")}" -i "${lumeaPng}" -filter_complex "[0:v]scale=640:400:force_original_aspect_ratio=decrease,pad=640:400:(ow-iw)/2:(oh-ih)/2[a];[1:v]scale=640:400:force_original_aspect_ratio=decrease,pad=640:400:(ow-iw)/2:(oh-ih)/2[b];[a][b]hstack=inputs=2" -update 1 -frames:v 1 "${path.join(QA, "v3g7-vs-lumea-sidebyside.png")}"`,
  { stdio: "inherit" },
);
console.log("sidebyside ok");

const browser = await launch(1280, 800);
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: "networkidle0", timeout: 90000 });
await waitCanvas(page);
const frames = path.join(QA, "_frames_v3g7");
fs.rmSync(frames, { recursive: true, force: true });
fs.mkdirSync(frames);
for (let i = 0; i < 120; i++) {
  const dataUrl = await page.evaluate(() => {
    const c = document.querySelector("#lumea-hero-root canvas");
    return c.toDataURL("image/jpeg", 0.82);
  });
  fs.writeFileSync(
    path.join(frames, `f${String(i).padStart(4, "0")}.jpg`),
    Buffer.from(dataUrl.split(",")[1], "base64"),
  );
  await new Promise((r) => setTimeout(r, 100));
  if (i % 30 === 0) console.log("frame", i);
}
await browser.close();
execSync(
  `ffmpeg -y -framerate 10 -i "${frames}/f%04d.jpg" -c:v libx264 -pix_fmt yuv420p -crf 20 "${path.join(QA, "hero-v3g7-12s.mp4")}"`,
  { stdio: "inherit" },
);
console.log("mp4 ok", fs.statSync(path.join(QA, "hero-v3g7-12s.mp4")).size);
