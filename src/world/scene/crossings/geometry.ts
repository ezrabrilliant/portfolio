import type { Crossing, IslandPlacement } from "@/world/engine/gen/layout";
import { railPoint } from "@/world/engine/traversal/rail";
import type { Rail } from "@/world/engine/traversal/rail";
import type { Vec3, Vec3i } from "@/world/engine/types";

const lerp = (p: number, q: number, t: number) => p + (q - p) * t;

function frame(a: Vec3, b: Vec3) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  return { dx, dz, len, ux: dx / len, uz: dz / len, px: -dz / len, pz: dx / len };
}

/** Collision cells of a bridge deck (one row under the walking surface), stepped by at most 1 block. */
export function bridgeCells(a: Vec3, b: Vec3, width = 2): Vec3i[] {
  const f = frame(a, b);
  const steps = Math.max(2, Math.ceil(f.len * 3));
  const seen = new Map<string, Vec3i>();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = a.x + f.dx * t;
    const cz = a.z + f.dz * t;
    const y = Math.round(lerp(a.y, b.y, t)) - 1;
    for (let w = 0; w < width; w++) {
      const off = w - (width - 1) / 2;
      const x = Math.floor(cx + f.px * off);
      const z = Math.floor(cz + f.pz * off);
      const k = `${x},${y},${z}`;
      if (!seen.has(k)) seen.set(k, { x, y, z });
    }
  }
  return [...seen.values()];
}

/** Visual planks every 0.5 blocks, top flush with the stepped surface; `s` = 0..1 along the bridge. */
export function bridgePlanks(a: Vec3, b: Vec3): Array<{ x: number; y: number; z: number; yaw: number; s: number }> {
  const f = frame(a, b);
  const n = Math.max(2, Math.round(f.len / 0.5));
  const yaw = Math.atan2(f.ux, f.uz);
  return Array.from({ length: n + 1 }, (_, i) => {
    const s = i / n;
    return { x: a.x + f.dx * s, y: Math.round(lerp(a.y, b.y, s)) - 0.09, z: a.z + f.dz * s, yaw, s };
  });
}

/** One-block stones beside the bridge (offset `side`), every `spacing` blocks, within jump reach. */
export function steppingStones(a: Vec3, b: Vec3, side = 2.6, spacing = 2): Vec3i[] {
  const f = frame(a, b);
  const out: Vec3i[] = [];
  for (let d = 1.2; d <= f.len - 1.2; d += spacing) {
    const t = d / f.len;
    out.push({
      x: Math.floor(a.x + f.ux * d + f.px * side),
      y: Math.round(lerp(a.y, b.y, t)) - 1,
      z: Math.floor(a.z + f.uz * d + f.pz * side),
    });
  }
  return out;
}

/** Moves a rim anchor `dist` blocks toward its island's centre column (same height). */
export function inset(anchor: Vec3, island: IslandPlacement, dist: number): Vec3 {
  const cx = island.origin.x + 0.5;
  const cz = island.origin.z + 0.5;
  const dx = cx - anchor.x;
  const dz = cz - anchor.z;
  const l = Math.hypot(dx, dz) || 1;
  return { x: anchor.x + (dx / l) * dist, y: anchor.y, z: anchor.z + (dz / l) * dist };
}

const snap = (p: Vec3): Vec3 => ({ x: Math.floor(p.x) + 0.5, y: p.y, z: Math.floor(p.z) + 0.5 });

/** Bounce pads sit 1.6 blocks inside each rim anchor, on block centres, at walking height. */
export function padPair(c: Crossing, from: IslandPlacement, to: IslandPlacement): { a: Vec3; b: Vec3 } {
  return { a: snap(inset(c.a, from, 1.6)), b: snap(inset(c.b, to, 1.6)) };
}

/** Minecart stations 1.4 blocks inside each rim, stand-off points 2.8 blocks inside. */
export function railEnds(c: Crossing, from: IslandPlacement, to: IslandPlacement) {
  return {
    stationA: snap(inset(c.a, from, 1.4)),
    stationB: snap(inset(c.b, to, 1.4)),
    standA: snap(inset(c.a, from, 2.8)),
    standB: snap(inset(c.b, to, 2.8)),
  };
}

type IsSolid = (x: number, y: number, z: number) => boolean;

const smoothstep = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** How far (horizontally, ≤ maxD) the grass row `row` reaches from `p` along `dir`, over a 1.5-block-wide band. */
function reach(p: Vec3, dir: { x: number; z: number }, row: number, isSolid: IsSolid, maxD: number): number {
  let out = 0;
  for (let d = 0; d <= maxD; d += 0.25) {
    for (const o of [-0.75, 0, 0.75]) {
      if (isSolid(Math.floor(p.x + dir.x * d - dir.z * o), row, Math.floor(p.z + dir.z * d + dir.x * o))) {
        out = d;
        break;
      }
    }
  }
  return out;
}

/**
 * The minecart's rail between the two stations (0.3 above each walking surface).
 *
 * A straight dip between stations at different heights runs through the higher island's rim (the
 * Orbit Store sits 7 blocks above Petak Umpet, 15 blocks away). So the rail never drops below either
 * island's surface: it lies flat at the stations, climbs over the lower island's rim on a trestle,
 * sags gently (`dip`) in the open gap, and meets the higher island at its rim, running flat to the
 * station. Points are evenly spaced horizontally (the rail runs straight in x/z).
 */
export function minecartRail(
  ends: { stationA: Vec3; stationB: Vec3 },
  isSolid: IsSolid,
  dip = 1.2,
  segments = 24,
): Rail {
  const A = { ...ends.stationA, y: ends.stationA.y + 0.3 };
  const B = { ...ends.stationB, y: ends.stationB.y + 0.3 };
  const f = frame(A, B);
  const margin = 0.6;
  const reachA = reach(A, { x: f.ux, z: f.uz }, Math.round(ends.stationA.y) - 1, isSolid, f.len / 2);
  const reachB = reach(B, { x: -f.ux, z: -f.uz }, Math.round(ends.stationB.y) - 1, isSolid, f.len / 2);
  const uA = Math.min(0.45, (reachA + margin) / f.len); // open gap starts
  const uB = Math.max(0.55, 1 - (reachB + margin) / f.len); // and ends
  const points: Vec3[] = [];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    // the height change happens over the lower island and the gap, never under the higher island's rim
    const climb = B.y >= A.y ? smoothstep(u / uB) : smoothstep((u - uA) / (1 - uA));
    const sag = u > uA && u < uB ? Math.sin((Math.PI * (u - uA)) / (uB - uA)) ** 2 : 0;
    points.push({ x: A.x + f.dx * u, y: lerp(A.y, B.y, climb) - dip * sag, z: A.z + f.dz * u });
  }
  return { points };
}

export function railLength(rail: Rail, samples = 64): number {
  let len = 0;
  let prev = railPoint(rail, 0);
  for (let i = 1; i <= samples; i++) {
    const p = railPoint(rail, i / samples);
    len += Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z);
    prev = p;
  }
  return len;
}
