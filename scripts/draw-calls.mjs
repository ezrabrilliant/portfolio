// Draw calls in the tour's views, measured in a real browser (spec §11): the dev build's RenderStats logs
// "[world] N draw calls, M triangles, <tier> quality" every 120 frames; this reports the highest N per view.
// Usage: npm run draw-calls            → every tour stop and the Hero → GTID midpoint, desktop then phone size
//        npm run draw-calls -- 0 5     → only those stops (the midpoint is measured whenever stops 0 and 1 are)
// Starts its own Vite dev server (DRAW_PORT, default 5199) and drives system Chrome (CHROME env var, else the standard
// Windows path) on the machine's GPU; DRAW_SWIFTSHADER=1 renders in software instead (slow: raise DRAW_SAMPLE_MS).
// DRAW_SAMPLE_MS (default 8000) is how long each view is sampled.
import { createServer } from "vite";
import { chromium } from "playwright-core";

const PORT = Number(process.env.DRAW_PORT ?? 5199);
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SAMPLE_MS = Number(process.env.DRAW_SAMPLE_MS ?? 8000);
const BUDGET = 200;
const SIZES = [["desktop", 1280, 720], ["phone", 520, 940]];
const args = process.argv.slice(2);
const stops = args.length ? args.map(Number) : [0, 1, 2, 3, 4, 5, 6, 7, 8];
if (stops.some((n) => !Number.isInteger(n) || n < 0)) throw new Error(`bad stop list "${args.join(" ")}", expected integers ≥ 0`);

const server = await createServer({ server: { port: PORT, strictPort: true }, logLevel: "silent" });
await server.listen();
const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: process.env.DRAW_SWIFTSHADER
    ? ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"]
    : ["--use-angle=d3d11", "--ignore-gpu-blocklist"],
});

/** Opens `query` at width × height, waits for the world, runs `after(page)` if given, then samples the draw-call log. */
async function measure(label, query, width, height, after) {
  const page = await browser.newPage({ viewport: { width, height } });
  const samples = [];
  page.on("console", (m) => {
    const hit = /\[world\] (\d+) draw calls.*, (\w+) quality/.exec(m.text());
    if (hit) samples.push({ calls: Number(hit[1]), tier: hit[2] });
  });
  page.on("pageerror", (e) => console.error(`[page error] ${e.message}`));
  try {
    await page.goto(`http://localhost:${PORT}/${query}`, { waitUntil: "load" });
    await page.waitForSelector("canvas", { state: "attached", timeout: 90000 });
    await page.waitForFunction(() => {
      const loader = document.querySelector(".loader");
      return !loader || loader.classList.contains("loader--done");
    }, null, { timeout: 90000 });
    if (after) await after(page);
    await page.waitForTimeout(3000); // the camera settles before sampling
    samples.length = 0;
    await page.waitForTimeout(SAMPLE_MS);
    const scrollY = await page.evaluate(() => window.scrollY);
    const peak = samples.reduce((best, s) => (s.calls > (best?.calls ?? -1) ? s : best), null);
    const text = peak ? `${peak.calls} draw calls (${peak.tier} quality)${peak.calls > BUDGET ? `  OVER BUDGET (${BUDGET})` : ""}` : "no sample (raise DRAW_SAMPLE_MS)";
    console.log(`${label.padEnd(30)} ${text}`);
    if (peak?.calls > BUDGET) process.exitCode = 1;
    return scrollY;
  } finally {
    await page.close();
  }
}

try {
  for (const [size, width, height] of SIZES) {
    const scroll = {};
    for (const n of stops) scroll[n] = await measure(`${size} stop ${n}`, `?stop=${n}`, width, height);
    if (0 in scroll && 1 in scroll) {
      const mid = Math.round((scroll[0] + scroll[1]) / 2);
      await measure(`${size} hero → gtid midpoint`, "?stop=0", width, height, (page) => page.evaluate((y) => window.scrollTo(0, y), mid));
    }
  }
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
