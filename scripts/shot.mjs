// Usage: node scripts/shot.mjs "<query+hash>" <out.png> [WIDTHxHEIGHT]
//   node scripts/shot.mjs "?stop=0" shots/stop-0.png 1280x720
import { execFile } from "node:child_process";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { preview } from "vite";

const CHROME = process.env.CHROME ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const query = process.argv[2] ?? "";
const out = resolve(process.argv[3] ?? "shots/world.png");
const [w, h] = (process.argv[4] ?? "1280x720").split("x");
mkdirSync(dirname(out), { recursive: true });

const server = await preview({ preview: { port: 4173, strictPort: true } });
const url = `http://localhost:4173/${query}`;
const profile = mkdtempSync(join(tmpdir(), "world-shot-"));
await new Promise((res, rej) =>
  execFile(
    CHROME,
    [
      "--headless=new", `--user-data-dir=${profile}`,
      "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist",
      `--window-size=${w},${h}`, "--hide-scrollbars", "--force-device-scale-factor=1",
      "--virtual-time-budget=15000", "--run-all-compositor-stages-before-draw",
      `--screenshot=${out}`, url,
    ],
    { timeout: 120000 },
    (err) => (err ? rej(err) : res()),
  ),
);
await server.close();
console.log(`shot -> ${out}`);
