// Usage: node scripts/shot.mjs "<query+hash>" <out.png> [WIDTHxHEIGHT]
//   node scripts/shot.mjs "?stop=0" shots/stop-0.png 1280x720
// Serves dist/ (run `npm run build` first) with `vite preview` on 4173 and captures it in real
// time with scripts/lib/capture.mjs. Env: CHROME (executable), SHOT_SETTLE_MS (default 2500),
// SHOT_PORT (preview port, default 4173), SHOT_OUTDIR (dir to serve, default dist). For parallel
// agents building into their own dir/port:
//   npx vite build --outDir .superpowers/sdd/dist-C8 --emptyOutDir && SHOT_OUTDIR=.superpowers/sdd/dist-C8 SHOT_PORT=4181 npm run shot -- "?stop=3" shots/c8.png 1280x720
import { preview } from "vite";
import { capture } from "./lib/capture.mjs";

const [query = "", out = "shots/world.png", size = "1280x720"] = process.argv.slice(2);
const [width, height] = size.split("x").map(Number);
if (!(width > 0 && height > 0)) throw new Error(`bad size "${size}", expected WIDTHxHEIGHT`);

const PORT = Number(process.env.SHOT_PORT ?? 4173);
const OUTDIR = process.env.SHOT_OUTDIR ?? "dist";
const server = await preview({ build: { outDir: OUTDIR }, preview: { port: PORT, strictPort: true } });
try {
  const file = await capture({ url: `http://localhost:${PORT}/${query}`, out, width, height });
  console.log(`shot -> ${file}`);
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await server.close();
}
