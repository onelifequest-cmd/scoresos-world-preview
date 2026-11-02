import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import http from "http";

const QA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const V3 = path.resolve(QA, "..");
const CHROME = "/usr/bin/google-chrome";
const LUMEA_STILL =
  "/workspace/refs/getlayers/lumea/public/assets/scene-still-desktop.webp";
const PORT = 8779;
const TS = Date.now();
const VARIANT = "v3g9";

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
  }, { timeout: 120000 });
  await page.evaluate(() => {
    try {
      window.__skipIntro?.();
    } catch {}
  });
  // Needle climb (~3.6s) + settle
  await new Promise((r) => setTimeout(r, 4800));
}

/** Live: wait for loader.done OR use ?qa=1 which finishes faster. */
async function waitLiveReady(page) {
  await page.waitForFunction(() => {
    const loader = document.getElementById("loader");
    const done = !loader || loader.classList.contains("done");
    const c = document.querySelector("#lumea-hero-root canvas");
    return done && c && c.width > 200;
  }, { timeout: 180000 });
  await new Promise((r) => setTimeout(r, 4800));
}

function startServer() {
  const mime = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".glb": "model/gltf-binary",
    ".wasm": "application/wasm",
    ".json": "application/json",
    ".mp4": "video/mp4",
  };
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";
    const file = path.join(V3, urlPath.replace(/^\//, ""));
    if (!file.startsWith(V3) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end("missing");
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

async function stillLocal(w, h, name) {
  const browser = await launch(w, h);
  const page = await browser.newPage();
  page.setDefaultTimeout(120000);
  page.on("pageerror", (e) => console.log("PAGEERR", e.message));
  const url = `http://127.0.0.1:${PORT}/qa-hero.html?v=${VARIANT}&t=${TS}`;
  await page.goto(url, { waitUntil: "networkidle0", timeout: 120000 });
  await waitCanvas(page);
  const out = path.join(QA, name);
  await page.screenshot({ path: out, type: "png" });
  await browser.close();
  console.log("still", name, fs.statSync(out).size);
  return out;
}

async function stillLive(w, h, name) {
  const browser = await launch(w, h);
  const page = await browser.newPage();
  page.setDefaultTimeout(180000);
  page.on("pageerror", (e) => console.log("LIVEERR", e.message));
  // ?qa=1 skips heavy video preload; still wait for loader.done
  const url = `https://scoresos-world-preview.onrender.com/v3/?v=${VARIANT}&qa=1&t=${TS}`;
  await page.goto(url, { waitUntil: "networkidle0", timeout: 180000 });
  await waitLiveReady(page);
  const out = path.join(QA, name);
  await page.screenshot({ path: out, type: "png" });
  await browser.close();
  console.log("live", name, fs.statSync(out).size);
  return out;
}

async function recordMp4(outName) {
  const w = 1280,
    h = 800;
  const browser = await launch(w, h);
  const page = await browser.newPage();
  await page.goto(
    `http://127.0.0.1:${PORT}/qa-hero.html?v=${VARIANT}&t=${TS}`,
    { waitUntil: "networkidle0", timeout: 120000 },
  );
  await waitCanvas(page);
  const frames = path.join(QA, `_frames_${VARIANT}`);
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

const server = await startServer();
console.log("serving", V3, "on", PORT);

const lumeaPng = path.join(QA, "lumea-still-desktop.png");
if (!fs.existsSync(lumeaPng)) {
  execSync(`dwebp "${LUMEA_STILL}" -o "${lumeaPng}"`, { stdio: "inherit" });
}

await stillLocal(1440, 900, `hero-${VARIANT}-1440x900.png`);
await stillLocal(1280, 800, `hero-${VARIANT}-1280x800.png`);

const src1280 = path.join(QA, `hero-${VARIANT}-1280x800.png`);
execSync(
  `ffmpeg -y -i "${src1280}" -vf "crop=560:700:360:50" -update 1 -frames:v 1 "${path.join(QA, `chars-crop-${VARIANT}.png`)}"`,
  { stdio: "inherit" },
);
execSync(
  `ffmpeg -y -i "${src1280}" -i "${lumeaPng}" -filter_complex "[0:v]scale=640:400:force_original_aspect_ratio=decrease,pad=640:400:(ow-iw)/2:(oh-ih)/2[a];[1:v]scale=640:400:force_original_aspect_ratio=decrease,pad=640:400:(ow-iw)/2:(oh-ih)/2[b];[a][b]hstack=inputs=2" -update 1 -frames:v 1 "${path.join(QA, `${VARIANT}-vs-lumea-sidebyside.png`)}"`,
  { stdio: "inherit" },
);

await recordMp4(`hero-${VARIANT}-12s.mp4`);

fs.copyFileSync(
  path.join(QA, `hero-${VARIANT}-1440x900.png`),
  path.join(QA, "hero-1440x900.png"),
);
fs.copyFileSync(
  path.join(QA, `hero-${VARIANT}-1280x800.png`),
  path.join(QA, "hero-1280x800.png"),
);

console.log("local QA done — live stills after deploy");
server.close();
