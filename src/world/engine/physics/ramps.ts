import type { Vec3 } from "@/world/engine/types";

/**
 * A walkable slope (spec: voxel controls, bridges): a strip from `a` to `b` (their y = the walking height there),
 * `halfWidth` either side of its centre line. Bridges are ramps, so Ezra walks up and down them smoothly instead of
 * climbing a stair of whole blocks.
 */
export interface Ramp { a: Vec3; b: Vec3; halfWidth: number }

/** How far below the surface the feet may be and still be lifted onto it (walking up), or above it and snapped down. */
export const RAMP_SNAP = 0.55;

/** The walking height of `r` at (x, z), or null off its strip. */
export function rampHeight(r: Ramp, x: number, z: number): number | null {
  const dx = r.b.x - r.a.x, dz = r.b.z - r.a.z;
  const len2 = dx * dx + dz * dz;
  if (len2 < 1e-9) return null;
  const s = ((x - r.a.x) * dx + (z - r.a.z) * dz) / len2;
  if (s < 0 || s > 1) return null;
  const len = Math.sqrt(len2);
  const side = Math.abs((x - r.a.x) * dz - (z - r.a.z) * dx) / len;
  if (side > r.halfWidth) return null;
  return r.a.y + (r.b.y - r.a.y) * s;
}

/** Every ramp, queried by position: the highest surface under (x, z) within `reach` above `feetY`, or null. */
export class RampSet {
  readonly all: readonly Ramp[];
  constructor(ramps: readonly Ramp[]) {
    this.all = ramps;
  }

  /** The surface under (x, z) the feet at `feetY` can stand on: at most RAMP_SNAP above them, else null. */
  surfaceAt(x: number, z: number, feetY: number): number | null {
    let best: number | null = null;
    for (const r of this.all) {
      const h = rampHeight(r, x, z);
      if (h === null || h > feetY + RAMP_SNAP) continue;
      if (best === null || h > best) best = h;
    }
    return best;
  }
}
