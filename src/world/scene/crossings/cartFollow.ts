import { stopProgress } from "@/world/engine/camera/tourPath";
import type { TourPath } from "@/world/engine/camera/tourPath";
import { railPoint } from "@/world/engine/traversal/rail";
import type { Rail } from "@/world/engine/traversal/rail";
import { sampleTrack, trackFor } from "../tour/tourMotion";

const RAIL_SAMPLES = 128;
const SMOOTH = 3; // moving-average half-width, in table cells

/**
 * Where the minecart sits while the scroll tour crosses its leg, as rail progress (0 = station A,
 * 1 = station B) at `n + 1` evenly spaced leg-progress points.
 *
 * The tour camera dwells at each island and cruises over the gap on a re-timed track, so a cart
 * moving linearly with scroll progress runs ahead of it and drops out of frame. Instead, at every
 * leg progress the cart takes the rail point closest to the camera's line of sight: it waits at
 * station A while the camera dwells there, crosses with the camera, and is parked at station B
 * when the camera arrives. The table is made monotonic, rescaled to run exactly 0 → 1 and lightly
 * smoothed. Built once per path (allocates); read every frame with `sampleTable` (no allocation).
 */
export function cartTourTable(path: TourPath, leg: number, rail: Rail, n = 96): Float32Array {
  const track = trackFor(path);
  const a = stopProgress(path, leg);
  const b = stopProgress(path, leg + 1);
  const pts = Array.from({ length: RAIL_SAMPLES + 1 }, (_, j) => railPoint(rail, j / RAIL_SAMPLES));
  const cam = { x: 0, y: 0, z: 0 };
  const look = { x: 0, y: 0, z: 0 };

  const raw = new Float32Array(n + 1);
  for (let k = 0; k <= n; k++) {
    sampleTrack(track, a + ((b - a) * k) / n, cam, look);
    const fl = Math.hypot(look.x - cam.x, look.y - cam.y, look.z - cam.z) || 1;
    let best = 0;
    let bestCos = -Infinity;
    for (let j = 0; j <= RAIL_SAMPLES; j++) {
      const p = pts[j];
      const d = Math.hypot(p.x - cam.x, p.y - cam.y, p.z - cam.z) || 1;
      const cos = ((p.x - cam.x) * (look.x - cam.x) + (p.y - cam.y) * (look.y - cam.y) + (p.z - cam.z) * (look.z - cam.z)) / (d * fl);
      if (cos > bestCos) {
        bestCos = cos;
        best = j / RAIL_SAMPLES;
      }
    }
    raw[k] = k > 0 ? Math.max(raw[k - 1], best) : best; // the cart never rolls back while scrolling forward
  }

  const u0 = raw[0];
  const span = raw[n] - u0;
  const table = new Float32Array(n + 1);
  for (let k = 0; k <= n; k++) table[k] = span > 1e-3 ? (raw[k] - u0) / span : k / n;

  // two moving-average passes whose window shrinks to 0 at the ends (the stations stay exact)
  const tmp = new Float32Array(n + 1);
  for (let pass = 0; pass < 2; pass++) {
    for (let k = 0; k <= n; k++) {
      const r = Math.min(SMOOTH, k, n - k);
      let sum = 0;
      for (let j = k - r; j <= k + r; j++) sum += table[j];
      tmp[k] = sum / (2 * r + 1);
    }
    table.set(tmp);
  }
  return table;
}

/** Linear lookup into a `cartTourTable` at leg progress `f` (clamped to 0..1). */
export function sampleTable(table: Float32Array, f: number): number {
  const n = table.length - 1;
  const x = Math.min(1, Math.max(0, f)) * n;
  const i = Math.min(n - 1, Math.floor(x));
  return table[i] + (table[i + 1] - table[i]) * (x - i);
}
