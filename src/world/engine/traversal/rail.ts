import type { Vec3 } from "@/world/engine/types";

export interface Rail { points: Vec3[] }

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function buildRail(a: Vec3, b: Vec3, dip: number, segments = 8): Rail {
  const points: Vec3[] = [];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    points.push({
      x: a.x + (b.x - a.x) * u,
      y: a.y + (b.y - a.y) * u - dip * Math.sin(Math.PI * u),
      z: a.z + (b.z - a.z) * u,
    });
  }
  return { points };
}

function cr(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/** Uniform Catmull-Rom through rail.points; u ∈ [0, 1] across the whole rail. */
export function railPoint(rail: Rail, u: number): Vec3 {
  const P = rail.points;
  const n = P.length;
  if (n === 1) return { ...P[0] };
  const f = clamp01(u) * (n - 1);
  const i = Math.min(Math.floor(f), n - 2);
  const t = f - i;
  const p1 = P[i], p2 = P[i + 1];
  const p0 = i > 0 ? P[i - 1] : { x: 2 * p1.x - p2.x, y: 2 * p1.y - p2.y, z: 2 * p1.z - p2.z };
  const p3 = i + 2 < n ? P[i + 2] : { x: 2 * p2.x - p1.x, y: 2 * p2.y - p1.y, z: 2 * p2.z - p1.z };
  return { x: cr(p0.x, p1.x, p2.x, p3.x, t), y: cr(p0.y, p1.y, p2.y, p3.y, t), z: cr(p0.z, p1.z, p2.z, p3.z, t) };
}

export function railTangent(rail: Rail, u: number): Vec3 {
  const h = 1e-3;
  const a = railPoint(rail, Math.max(0, u - h));
  const b = railPoint(rail, Math.min(1, u + h));
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  return { x: dx / len, y: dy / len, z: dz / len };
}

export function rideProgress(t: number, duration: number): number {
  if (duration <= 0) return 1;
  const x = clamp01(t / duration);
  return x * x * (3 - 2 * x);
}
