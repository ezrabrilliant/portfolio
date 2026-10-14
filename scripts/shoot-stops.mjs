// Screenshots of tour stops on desktop (1280x720) and phone (520x940), in real time with system Chrome + SwiftShader.
// Usage: npm run build && npm run shots -- [stop ...]  → .shots/stop-<N>-desktop.png, .shots/stop-<N>-phone.png
// (default: all nine stops: hero 0, gtid 1, petak 2, orbit 3, ezra-bot 4, web-plaza 5, pos-monosuko 6, bee 7, pedulipasal 8)
// Serves dist/ with `vite preview` on 4173 and captures with scripts/lib/capture.mjs (never Chrome's --screenshot flag:
// it renders a blank frame once WorldText is in the scene). Env: CHROME (executable), SHOT_SETTLE_MS (default 2500),
// SHOT_PORT (preview port, default 4173), SHOT_OUTDIR (dir to serve, default dist). For parallel
// agents building into their own dir/port:
//   npx vite build --outDir .superpowers/sdd/dist-C8 --emptyOutDir && SHOT_OUTDIR=.superpowers/sdd/dist-C8 SHOT_PORT=4181 npm run shot -- "?stop=3" shots/c8.png 1280x720
import { preview } from "vite";
import { openCapture } from "./lib/capture.mjs";

const PORT = Number(process.env.SHOT_PORT ?? 4173);
const OUTDIR = process.env.SHOT_OUTDIR ?? "dist";
const args = process.argv.slice(2);
const stops = args.length ? args.map(Number) : [0, 1, 2, 3, 4, 5, 6, 7, 8];
if (stops.some((n) => !Number.isInteger(n) || n < 0)) throw new Error(`bad stop list "${args.join(" ")}", expected integers ≥ 0`);
const sizes = [["desktop", 1280, 720], ["phone", 520, 940]]; // headless Chrome won't render narrower than ~500 px

const server = await preview({ build: { outDir: OUTDIR }, preview: { port: PORT, strictPort: true } });
let cam;
try {
  cam = await openCapture();
  for (const stop of stops) {
    for (const [name, width, height] of sizes) {
      const out = `.shots/stop-${stop}-${name}.png`;
      try {
        console.log(`shot ${await cam.shot({ url: `http://localhost:${PORT}/?stop=${stop}`, out, width, height })}`);
      } catch (err) {
        console.error(`MISSING ${out}: ${err.message}`);
        process.exitCode = 1;
      }
    }
  }
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await cam?.close();
  await server.close();
}
