/**
 * Headless screenshots of the 3D world, taken in REAL time once the world has settled.
 *
 * Drives system Chrome (no browser download) over the DevTools protocol via playwright-core,
 * with SwiftShader WebGL. Do NOT use `chrome --screenshot --virtual-time-budget` for the
 * world: troika-three-text (drei <Text>) builds its glyphs in a Web Worker that never
 * finishes under virtual time, so that frame comes out blank.
 *
 * A shot is taken when, in order:
 *   1. a <canvas> exists,
 *   2. there is no `.loader` element, or it has the class `loader--done`,
 *   3. `document.fonts.ready` has resolved,
 *   4. `settleMs` of real time has passed (camera damping, troika text). Default 2500 ms,
 *      or the SHOT_SETTLE_MS env var.
 * Each shot has a hard timeout (default 60 s) that names the step it was stuck on.
 * The browser is always closed, also on failure. The caller owns the HTTP server.
 *
 * @example One shot (a server must already serve the build, e.g. `vite preview` on 4173):
 *   import { capture } from "./lib/capture.mjs";
 *   await capture({ url: "http://localhost:4173/?stop=0", out: "shots/stop-0.png", width: 1280, height: 720 });
 *
 * @example Many shots with one browser (faster, e.g. every tour stop):
 *   import { openCapture } from "./lib/capture.mjs";
 *   const cam = await openCapture();
 *   try {
 *     for (const [i, q] of queries.entries())
 *       await cam.shot({ url: `http://localhost:4173/${q}`, out: `shots/stop-${i}.png`, width: 520, height: 940 });
 *   } finally {
 *     await cam.close();
 *   }
 *
 * Options for capture()/shot():
 *   url, out          page to load, PNG path to write (parent folders are created)
 *   width, height     exact CSS viewport, device scale factor 1 (default 1280x720; phone 520x940)
 *   settleMs          real-time wait after the world is ready
 *   timeoutMs         hard limit for the whole shot (default 60000)
 *   contextOptions    extra Playwright browser-context options, e.g. { hasTouch: true }
 * Options for capture()/openCapture():
 *   chrome            Chrome executable (default: CHROME env var, else the standard Windows path)
 */
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright-core";

const DEFAULT_CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARGS = ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"];

/** Launch Chrome once; returns { shot(opts), close() }. */
export async function openCapture({ chrome = process.env.CHROME ?? DEFAULT_CHROME } = {}) {
  const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ARGS });
  return {
    shot: (opts) => shoot(browser, opts),
    close: () => browser.close().catch(() => {}),
  };
}

/** Launch Chrome, take one shot, close Chrome. */
export async function capture(opts) {
  const cam = await openCapture(opts);
  try {
    return await cam.shot(opts);
  } finally {
    await cam.close();
  }
}

async function shoot(browser, opts) {
  const {
    url,
    out,
    width = 1280,
    height = 720,
    settleMs = Number(process.env.SHOT_SETTLE_MS ?? 2500),
    timeoutMs = 60000,
    contextOptions = {},
  } = opts;
  if (!url || !out) throw new Error("capture: `url` and `out` are required");
  const file = resolve(out);
  mkdirSync(dirname(file), { recursive: true });

  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    ...contextOptions,
  });
  context.setDefaultTimeout(timeoutMs);
  let step = "opening the page";
  let timer;
  try {
    const page = await context.newPage();
    page.on("pageerror", (e) => console.error(`[page error] ${e.message}`));
    page.on("console", (m) => {
      const text = m.text();
      if (m.type() === "error" && !text.startsWith("Failed to load resource")) console.error(`[console] ${text}`);
    });
    page.on("response", (r) => r.status() >= 400 && console.error(`[http ${r.status()}] ${r.url()}`));

    const run = async () => {
      await page.goto(url, { waitUntil: "load" });
      step = "waiting for a <canvas>";
      await page.waitForSelector("canvas", { state: "attached" });
      step = "waiting for the .loader overlay to finish";
      await page.waitForFunction(() => {
        const loader = document.querySelector(".loader");
        return !loader || loader.classList.contains("loader--done");
      });
      step = "waiting for document.fonts.ready";
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      step = `settling for ${settleMs} ms`;
      await page.waitForTimeout(settleMs);
      step = "taking the screenshot";
      await page.screenshot({ path: file });
    };
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`capture: timed out after ${timeoutMs} ms ${step} (${url})`)),
        timeoutMs,
      );
    });
    await Promise.race([run(), deadline]);
    return file;
  } finally {
    clearTimeout(timer);
    await context.close().catch(() => {});
  }
}
