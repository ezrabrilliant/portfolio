import type { IsSolid, Vec3 } from "@/world/engine/types";
import { pullIn } from "./pullIn";

/** Side offset of the probe's outer rays from its centre ray: the probe acts like a small ball, not a thin line. */
export const PROBE_RADIUS = 0.2;

/**
 * How far from `lookAt` toward `to` the camera may stand: the shortest clear length of five parallel rays (the centre
 * one and four around it, PROBE_RADIUS off), each stopping pullIn's back-off before its first solid block. One ray
 * grazing a block's edge flickered between hit and miss as Ezra moved; the ring sees the edge on every frame.
 */
export function probeDistance(lookAt: Vec3, to: Vec3, isSolid: IsSolid): number {
  const dx = to.x - lookAt.x;
  const dy = to.y - lookAt.y;
  const dz = to.z - lookAt.z;
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) return 0;
  // two unit vectors across the ray: horizontal right, and up (their cross)
  const h = Math.hypot(dx, dz);
  const rx = h > 1e-6 ? dz / h : 1;
  const rz = h > 1e-6 ? -dx / h : 0;
  const fx = dx / len, fy = dy / len, fz = dz / len;
  const ux = fy * rz, uy = fz * rx - fx * rz, uz = -fy * rx;
  let best = len;
  for (const [a, b] of RING) {
    const ox = (rx * a + ux * b) * PROBE_RADIUS;
    const oy = (uy * b) * PROBE_RADIUS;
    const oz = (rz * a + uz * b) * PROBE_RADIUS;
    const from = { x: lookAt.x + ox, y: lookAt.y + oy, z: lookAt.z + oz };
    // an outer ray that starts inside a block (Ezra against a wall) says nothing about the line behind him
    if (isSolid(Math.floor(from.x), Math.floor(from.y), Math.floor(from.z))) continue;
    const stop = pullIn(from, { x: to.x + ox, y: to.y + oy, z: to.z + oz }, isSolid);
    best = Math.min(best, Math.hypot(stop.x - from.x, stop.y - from.y, stop.z - from.z));
  }
  return best;
}

const RING: readonly (readonly [number, number])[] = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];

/** The camera boom's smoothed length (how far the rendered camera stands from the look point). */
export interface Boom {
  length: number;
  /** seconds the limit has stayed clearly longer than the boom (it lets the boom out only after BOOM.holdOut) */
  out: number;
}

export const BOOM = {
  /** pulling in: exponential rate per second, and how far the boom may still reach past the limit while it does */
  inRate: 18,
  slack: 0.2,
  /** letting out: rate per second, after the limit has stayed `hysteresis` longer for `holdOut` seconds */
  outRate: 3,
  /** and never faster than this many blocks a second (a wall left behind ends a long way short of the full boom) */
  outMax: 4,
  hysteresis: 0.05,
  holdOut: 0.25,
} as const;

export function createBoom(length: number): Boom {
  return { length, out: 0 };
}

/**
 * Moves the boom toward `limit` (probeDistance of the eased follow position). In: fast but eased, and never more than
 * BOOM.slack past the limit (a wall swung behind Ezra still stops it at once). Out: slowly, and only once the limit has
 * stayed longer for BOOM.holdOut seconds, so a limit that flickers between two lengths no longer pumps the camera in
 * and out. `cut` (a teleport, entering under reduced motion) jumps straight to the limit.
 */
export function stepBoom(b: Boom, limit: number, dt: number, cut = false): number {
  if (cut) {
    b.length = limit;
    b.out = 0;
    return b.length;
  }
  if (limit < b.length) {
    b.out = 0;
    b.length += (limit - b.length) * (1 - Math.exp(-BOOM.inRate * dt));
    b.length = Math.min(b.length, limit + BOOM.slack);
  } else if (limit > b.length + BOOM.hysteresis) {
    b.out += dt;
    if (b.out >= BOOM.holdOut) b.length += Math.min((limit - b.length) * (1 - Math.exp(-BOOM.outRate * dt)), BOOM.outMax * dt);
  } else {
    b.out = 0;
  }
  return b.length;
}
