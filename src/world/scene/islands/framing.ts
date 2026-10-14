import type { IslandPlacement } from "@/world/engine/gen/layout";
import { generateIsland } from "@/world/engine/gen/islandGen";
import type { TourStop } from "@/world/engine/camera/tourPath";
import type { Vec3 } from "@/world/engine/types";
import { islandFrame } from "./shared/local";

type V = readonly [number, number, number];

/**
 * Camera and look-at offsets from islandFrame(p). Target left of the subject → subject sits centre-right.
 * One shared view (from the front-left, ~10° yaw, ~19° down, ~18.5 blocks): at 1280×720 (fov 40) every island fits
 * with its props, and InfoBoard / Signpost text stays ≥ ~13 px tall. Closer is bigger text but crops the island.
 */
export const FRAMING: Record<string, { cam: V; target: V; dwell: number }> = {
  hero: { cam: [-4.8, 7.3, 16.1], target: [-1.8, 1, -1], dwell: 1.4 }, // 1.4: with nine stops, 1.2 eased off too abruptly
  gtid: { cam: [-4.8, 8.7, 16.1], target: [-1.8, 2.4, -1], dwell: 1 }, // raised 1.4: the Diamond Lock floats ~8 above the grass
  "petak-umpet": { cam: [-4.9, 6.4, 16.8], target: [-1.8, 0.5, -1], dwell: 1 },
  "orbit-store": { cam: [-6.7, 6.4, 13.3], target: [-1.5, 1.5, -1], dwell: 1 },
  "ezra-bot": { cam: [-2.9, 6.7, 13.3], target: [-0.5, 1.6, -0.6], dwell: 1 }, // same heading, 15 out: the chat replies are the subject
  // Web & Apps: the same ~17° heading as the starting values (PeduliPasal's lopsided rim needs it for a centred portrait
  // view), ~18° down; the plaza ~14 out, the radius-4 minis ~13 out with the island centred and its screen in view.
  "web-plaza": { cam: [-4.4, 5.7, 12.3], target: [-0.5, 1.4, -0.4], dwell: 1 },
  "pos-monosuko": { cam: [-3.9, 5.8, 11.2], target: [-0.3, 1.8, -0.6], dwell: 1 },
  "bee-furniture-crm": { cam: [-3.8, 5.8, 11.2], target: [-0.2, 1.8, -0.6], dwell: 1 },
  pedulipasal: { cam: [-3.8, 5.8, 11.4], target: [-0.2, 1.8, -0.4], dwell: 1 },
};

export function tourStopFor(p: IslandPlacement): TourStop {
  const f = FRAMING[p.id];
  if (!f) throw new Error(`No framing for island ${p.id}`);
  const [x, y, z] = islandFrame(p);
  return {
    id: p.id,
    camera: { x: x + f.cam[0], y: y + f.cam[1], z: z + f.cam[2] },
    target: { x: x + f.target[0], y: y + f.target[1], z: z + f.target[2] },
    dwell: f.dwell,
  };
}

/* ---------- portrait (phone) framing ---------- */

/** Vertical fov of the world camera (WorldApp's <Canvas camera>). */
export const TOUR_FOV = 40;
/**
 * Portrait stops are fitted for this aspect (width / height), a tall 20:9 phone. Any portrait screen uses
 * them (the tour only rebuilds when the aspect class flips), so wider portrait screens get room at the sides.
 */
export const PORTRAIT_ASPECT = 0.45;
/** The fitted content stays inside these NDC half-extents. */
const FIT_X = 0.9;
const FIT_Y = 0.85;
/**
 * Portrait cameras look down at least this steeply (radians, 35°; the landscape stops look ~20° down). From the
 * pulled-back camera a shallow view lets a front board cover what stands behind it (at ~20° the hero's about board
 * hid the "T" of BRILLIANT, and up to ~32° GTID's price board hid the "." of GTID.); a steeper one sees over the
 * boards and fills more of the tall frame with the island's top.
 */
export const PORTRAIT_MIN_PITCH = (35 * Math.PI) / 180;
/**
 * Per-island heading nudge for the portrait view (radians, negative = camera further left). GTID: from the base
 * heading the price board still hides the title's "." at 35° (it clears only at ~42°); 8° further left clears it
 * (any nudge left of −5° does) at a slightly more oblique board.
 */
export const PORTRAIT_YAW: Record<string, number> = { gtid: (-8 * Math.PI) / 180 };
/**
 * Prop envelope over the grass top (fractions of the radius, blocks above the grass): boards and signs near the
 * rim reach ~3.4 blocks; the tall props (Petak's roof, Orbit's logo, Ezra Bot's bubbles ~6.5, GTID's floating
 * Diamond Lock ~8 at 0.6 × radius) stand further in.
 */
const PROP_RINGS = [
  { r: 0.8, h: 3.6 },
  { r: 0.65, h: 8.5 },
] as const;
const RING_POINTS = 24;

const fitCache = new Map<string, Vec3[]>();

/**
 * What a portrait stop keeps in frame, in world space: the outer corners of the island's real grass top (the
 * generator wobbles the rim out to 1.2 × radius), the prop envelope above it and the tip of the underside.
 */
export function portraitFitPoints(p: IslandPlacement): Vec3[] {
  const key = `${p.id}:${p.origin.x},${p.origin.y},${p.origin.z}:${p.radius}:${p.depth}:${p.seed}`;
  const hit = fitCache.get(key);
  if (hit) return hit;
  const [fx, fy, fz] = islandFrame(p);
  const pts: Vec3[] = [];
  const top = generateIsland({ radius: p.radius, depth: p.depth, seed: p.seed }).cells.filter((c) => c.y === 0);
  // block (x, z) spans [x, x + 1) from the origin column, i.e. ±0.5 around its centre in the island frame
  for (const c of top) for (const [dx, dz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
    pts.push({ x: fx + c.x + dx, y: fy, z: fz + c.z + dz });
  }
  for (const ring of PROP_RINGS) {
    for (let k = 0; k < RING_POINTS; k++) {
      const a = (k / RING_POINTS) * Math.PI * 2;
      pts.push({ x: fx + Math.cos(a) * ring.r * p.radius, y: fy + ring.h, z: fz + Math.sin(a) * ring.r * p.radius });
    }
  }
  pts.push({ x: fx, y: fy - 1 - p.depth, z: fz });
  fitCache.set(key, pts);
  return pts;
}

interface Bounds { x0: number; x1: number; y0: number; y1: number }

/** NDC bounds of `pts` from a camera at `target + dir * d` looking at `target` (no roll, +Y up). */
function bounds(pts: readonly Vec3[], target: Vec3, dir: Vec3, d: number, tanY: number, tanX: number): Bounds {
  const cx = target.x + dir.x * d, cy = target.y + dir.y * d, cz = target.z + dir.z * d;
  const f = { x: -dir.x, y: -dir.y, z: -dir.z };
  const rl = Math.hypot(f.z, f.x);
  const r = { x: -f.z / rl, z: f.x / rl }; // forward × +Y (horizontal)
  const u = { x: -r.z * f.y, y: r.z * f.x - r.x * f.z, z: r.x * f.y }; // right × forward
  const b = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  for (const q of pts) {
    const vx = q.x - cx, vy = q.y - cy, vz = q.z - cz;
    const z = Math.max(1e-3, vx * f.x + vy * f.y + vz * f.z);
    const nx = (vx * r.x + vz * r.z) / (z * tanX);
    const ny = (vx * u.x + vy * u.y + vz * u.z) / (z * tanY);
    if (nx < b.x0) b.x0 = nx;
    if (nx > b.x1) b.x1 = nx;
    if (ny < b.y0) b.y0 = ny;
    if (ny > b.y1) b.y1 = ny;
  }
  return b;
}

/**
 * The phone version of a tour stop: the heading of `base` (+ PORTRAIT_YAW), looking down at least PORTRAIT_MIN_PITCH, the
 * island centred and pulled back until its whole grass top, props and boards fit a `aspect` portrait frame (fov TOUR_FOV). On a tall screen the
 * island's width is what binds, so board text gets small (accepted for Phase 1). Pure; a few ms per stop.
 */
export function portraitStop(p: IslandPlacement, base: TourStop, aspect = PORTRAIT_ASPECT): TourStop {
  const pts = portraitFitPoints(p);
  const dl = Math.hypot(base.camera.x - base.target.x, base.camera.y - base.target.y, base.camera.z - base.target.z);
  // the base's heading (plus the island's nudge), looking down at least PORTRAIT_MIN_PITCH
  const yaw = Math.atan2(base.camera.x - base.target.x, base.camera.z - base.target.z) + (PORTRAIT_YAW[p.id] ?? 0);
  const pitch = Math.max(PORTRAIT_MIN_PITCH, Math.asin((base.camera.y - base.target.y) / dl));
  const dir = { x: Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: Math.cos(yaw) * Math.cos(pitch) };
  const tanY = Math.tan(((TOUR_FOV / 2) * Math.PI) / 180);
  const tanX = tanY * aspect;
  // camera axes (fixed by dir) to move the target across the view while centring
  const rl = Math.hypot(dir.z, dir.x);
  const r = { x: dir.z / rl, z: -dir.x / rl };
  const u = { x: -r.z * -dir.y, y: r.z * -dir.x - r.x * -dir.z, z: r.x * -dir.y };
  const [fx, fy, fz] = islandFrame(p);

  /** Centre the content box at distance d; returns the centred target and its half-extents. */
  const centred = (d: number) => {
    const t = { x: fx, y: fy + 2, z: fz };
    let b = bounds(pts, t, dir, d, tanY, tanX);
    for (let k = 0; k < 4; k++) {
      const sx = ((b.x0 + b.x1) / 2) * tanX * d;
      const sy = ((b.y0 + b.y1) / 2) * tanY * d;
      t.x += r.x * sx + u.x * sy;
      t.y += u.y * sy;
      t.z += r.z * sx + u.z * sy;
      b = bounds(pts, t, dir, d, tanY, tanX);
    }
    return { t, hx: (b.x1 - b.x0) / 2, hy: (b.y1 - b.y0) / 2 };
  };

  let lo = dl;
  let hi = dl * 8;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    const c = centred(mid);
    if (c.hx <= FIT_X && c.hy <= FIT_Y) hi = mid;
    else lo = mid;
  }
  const { t } = centred(hi);
  return {
    id: base.id,
    camera: { x: t.x + dir.x * hi, y: t.y + dir.y * hi, z: t.z + dir.z * hi },
    target: t,
    dwell: base.dwell,
  };
}
