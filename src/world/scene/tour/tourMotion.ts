import type { TourPath } from "@/world/engine/camera/tourPath";
import type { Vec3 } from "@/world/engine/types";
import { nearestStop, stopProgresses } from "./tourMath";

/**
 * Smooth flight for the scroll tour.
 *
 * `samplePath` maps scroll weight to a uniform Catmull-Rom parameter piecewise-linearly. Over the
 * real tour's unevenly spaced via points that makes camera speed jump ~15x at every dwell/travel
 * boundary, swing ~20x inside a travel, and kink into near-cusps inside the via clusters (the look
 * target then whips ~14° in one frame). No amount of progress damping removes those, because
 * camera speed = path speed × progress rate.
 *
 * A `TourTrack` flies through the same control points (stop cameras and crossing vias) on a
 * centripetal Catmull-Rom (no cusps or self-intersections), rounds the tight bends between vias a
 * couple of blocks apart, and re-times it by arc length: each stop keeps the engine's dwell pace,
 * an S-curve (smootherstep) accelerates to a cruise speed through the travel and back down, with
 * zero acceleration at the stops. The look target eases between the two stop targets over the
 * leg's arc length. Stop progress values are fixed points, so `stopProgress`, `?stop=N` and
 * `scrollToIsland` land exactly on each stop's framing.
 */
export interface TourTrack {
  /** progress of each stop (leg boundaries) */
  stops: number[];
  /** per leg: designed cumulative arc length at CELLS + 1 uniform progress nodes */
  arc: Float64Array[];
  /** per leg: the fine polyline the camera follows — cumulative length, camera xyz, look xyz */
  fineS: Float64Array[];
  fineCam: Float64Array[];
  fineLook: Float64Array[];
}

const SEG = 256;              // curve samples per control segment
const STEP = 0.05;            // polyline spacing in world units
const BEND = 4;               // half-width (world units) of the bend-smoothing window
const CELLS = 1024;           // designed-speed cells per leg
const DWELL_SPAN = 0.15;      // the engine's dwell half-width, in control segments
const RAMP_FROM_STOP = 0.5;   // the ramp starts this fraction of a stop's dwell share away from it
const RAMP_INTO_TRAVEL = 0.4; // and reaches cruise this fraction into the travel weight

const smoother = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (x * 6 - 15) + 10));
const dist = (a: Vec3, b: Vec3) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);

/** Centripetal Catmull-Rom (Barry-Goldman) between p1 and p2, u ∈ [0, 1]. */
function centripetal(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, u: number, out: Vec3): void {
  const k = (a: Vec3, b: Vec3) => Math.max(1e-4, Math.sqrt(dist(a, b)));
  const t1 = k(p0, p1), t2 = t1 + k(p1, p2), t3 = t2 + k(p2, p3);
  const t = t1 + (t2 - t1) * u;
  const mix = (a: number, b: number, ta: number, tb: number) => (a * (tb - t) + b * (t - ta)) / (tb - ta);
  for (const c of ["x", "y", "z"] as const) {
    const a1 = mix(p0[c], p1[c], 0, t1), a2 = mix(p1[c], p2[c], t1, t2), a3 = mix(p2[c], p3[c], t2, t3);
    const b1 = mix(a1, a2, 0, t2), b2 = mix(a2, a3, t1, t3);
    out[c] = mix(b1, b2, t1, t2);
  }
}

function curvePoint(ctrl: Vec3[], seg: number, u: number, out: Vec3): void {
  const p1 = ctrl[seg], p2 = ctrl[seg + 1];
  const p0 = seg > 0 ? ctrl[seg - 1] : { x: 2 * p1.x - p2.x, y: 2 * p1.y - p2.y, z: 2 * p1.z - p2.z };
  const p3 = seg + 2 < ctrl.length ? ctrl[seg + 2] : { x: 2 * p2.x - p1.x, y: 2 * p2.y - p1.y, z: 2 * p2.z - p1.z };
  centripetal(p0, p1, p2, p3, u, out);
}

/** Arc length of control segment `seg` between u0 and u1. */
function segLength(ctrl: Vec3[], seg: number, u0: number, u1: number): number {
  const a = { x: 0, y: 0, z: 0 }, b = { x: 0, y: 0, z: 0 };
  curvePoint(ctrl, seg, u0, a);
  let len = 0;
  for (let j = 1; j <= 64; j++) {
    curvePoint(ctrl, seg, u0 + ((u1 - u0) * j) / 64, b);
    len += dist(a, b);
    a.x = b.x; a.y = b.y; a.z = b.z;
  }
  return len;
}

/** Re-sample a polyline (xyz triples) at a fixed arc-length step; keeps both end points. */
function resample(raw: Float64Array, step: number): Float64Array {
  const m = raw.length / 3;
  let total = 0;
  for (let f = 1; f < m; f++) total += Math.hypot(raw[f * 3] - raw[f * 3 - 3], raw[f * 3 + 1] - raw[f * 3 - 2], raw[f * 3 + 2] - raw[f * 3 - 1]);
  const count = Math.max(2, Math.ceil(total / step) + 1);
  const out = new Float64Array(count * 3);
  let f = 0, acc = 0, segLen = 0;
  for (let j = 0; j < count; j++) {
    const want = (total * j) / (count - 1);
    while (f < m - 2) {
      segLen = Math.hypot(raw[f * 3 + 3] - raw[f * 3], raw[f * 3 + 4] - raw[f * 3 + 1], raw[f * 3 + 5] - raw[f * 3 + 2]);
      if (acc + segLen >= want) break;
      acc += segLen;
      f++;
    }
    segLen = Math.hypot(raw[f * 3 + 3] - raw[f * 3], raw[f * 3 + 4] - raw[f * 3 + 1], raw[f * 3 + 5] - raw[f * 3 + 2]);
    const t = segLen > 0 ? Math.min(1, Math.max(0, (want - acc) / segLen)) : 0;
    for (let c = 0; c < 3; c++) out[j * 3 + c] = raw[f * 3 + c] + (raw[f * 3 + 3 + c] - raw[f * 3 + c]) * t;
  }
  return out;
}

/**
 * Round off tight bends (the crossing vias sit a couple of blocks apart) with two passes of a
 * moving average whose half-width eases from 0 at the leg ends (the stops stay exact) up to
 * `radius` samples.
 */
function smoothPolyline(pts: Float64Array, radius: number): Float64Array {
  const m = pts.length / 3;
  let cur = pts;
  for (let pass = 0; pass < 2; pass++) {
    const pre = new Float64Array((m + 1) * 3);
    for (let j = 0; j < m; j++) for (let c = 0; c < 3; c++) pre[(j + 1) * 3 + c] = pre[j * 3 + c] + cur[j * 3 + c];
    const next = new Float64Array(m * 3);
    for (let j = 0; j < m; j++) {
      const edge = Math.min(j, m - 1 - j);
      const r = Math.floor(radius * smoother(edge / (2 * radius)));
      for (let c = 0; c < 3; c++) next[j * 3 + c] = (pre[(j + r + 1) * 3 + c] - pre[(j - r) * 3 + c]) / (2 * r + 1);
    }
    cur = next;
  }
  return cur;
}

export function buildTourTrack(path: TourPath): TourTrack {
  const { stops: tourStops, controls: ctrl, stopIndex: k, totalWeight } = path;
  const n = tourStops.length;
  const stops = stopProgresses(path);

  // pace at each stop: like the engine, the camera covers DWELL_SPAN of the neighbouring control
  // segment while the scroll crosses each half of the stop's dwell weight
  const pace = tourStops.map((s, i) => {
    const sides: number[] = [];
    if (i > 0) sides.push(segLength(ctrl, k[i] - 1, 1 - DWELL_SPAN, 1));
    if (i < n - 1) sides.push(segLength(ctrl, k[i], 0, DWELL_SPAN));
    const share = (i === 0 || i === n - 1 ? s.dwell : s.dwell / 2) / totalWeight;
    return sides.reduce((a, b) => a + b, 0) / sides.length / share;
  });

  const arc: Float64Array[] = [];
  const fineS: Float64Array[] = [];
  const fineCam: Float64Array[] = [];
  const fineLook: Float64Array[] = [];
  const pt = { x: 0, y: 0, z: 0 };

  for (let i = 0; i < n - 1; i++) {
    // 1. the camera curve over this leg as a fine polyline
    const segs = k[i + 1] - k[i];
    const raw = new Float64Array((segs * SEG + 1) * 3);
    for (let f = 0; f <= segs * SEG; f++) {
      const seg = Math.min(k[i] + Math.floor(f / SEG), k[i + 1] - 1);
      curvePoint(ctrl, seg, (f - (seg - k[i]) * SEG) / SEG, pt);
      raw[f * 3] = pt.x; raw[f * 3 + 1] = pt.y; raw[f * 3 + 2] = pt.z;
    }
    const cam = smoothPolyline(resample(raw, STEP), BEND / STEP);
    const count = cam.length / 3;
    const s = new Float64Array(count);
    for (let f = 1; f < count; f++) {
      s[f] = s[f - 1] + Math.hypot(cam[f * 3] - cam[f * 3 - 3], cam[f * 3 + 1] - cam[f * 3 - 2], cam[f * 3 + 2] - cam[f * 3 - 1]);
    }
    const length = s[count - 1];

    // 2. look target eases between the two stop targets over the leg's length
    const ta = tourStops[i].target, tb = tourStops[i + 1].target;
    const look = new Float64Array(count * 3);
    for (let f = 0; f < count; f++) {
      const e = smoother(length > 0 ? s[f] / length : 0);
      look[f * 3] = ta.x + (tb.x - ta.x) * e;
      look[f * 3 + 1] = ta.y + (tb.y - ta.y) * e;
      look[f * 3 + 2] = ta.z + (tb.z - ta.z) * e;
    }

    // 3. designed speed over the leg (in leg weight units w): stop pace, S-curve up to cruise
    //    through the travel, S-curve back down to the next stop's pace
    const dp = stops[i + 1] - stops[i];
    const legW = dp * totalWeight;
    const wa = i === 0 ? tourStops[0].dwell : tourStops[i].dwell / 2;
    const wb = i + 1 === n - 1 ? tourStops[n - 1].dwell : tourStops[i + 1].dwell / 2;
    const tw = Math.max(1e-6, legW - wa - wb);
    const upFrom = RAMP_FROM_STOP * wa, upTo = wa + RAMP_INTO_TRAVEL * tw;
    const downTo = legW - RAMP_FROM_STOP * wb, downFrom = legW - wb - RAMP_INTO_TRAVEL * tw;
    const va = pace[i], vb = pace[i + 1];
    const base = new Float64Array(CELLS);
    const bump = new Float64Array(CELLS);
    let sumBase = 0, sumBump = 0;
    for (let c = 0; c < CELLS; c++) {
      const u = (c + 0.5) / CELLS;
      const w = u * legW;
      base[c] = va + (vb - va) * smoother(u);
      bump[c] = smoother((w - upFrom) / (upTo - upFrom)) * smoother((downTo - w) / (downTo - downFrom));
      sumBase += base[c];
      sumBump += bump[c];
    }
    // the cruise boost makes the designed speed cover exactly this leg's length
    const cell = dp / CELLS;
    const boost = Math.max(0, (length / cell - sumBase) / Math.max(1e-9, sumBump));
    const cum = new Float64Array(CELLS + 1);
    for (let c = 0; c < CELLS; c++) cum[c + 1] = cum[c] + (base[c] + boost * bump[c]) * cell;
    const fix = cum[CELLS] > 0 ? length / cum[CELLS] : 0; // 1 unless the stop pace alone overshoots
    for (let c = 1; c <= CELLS; c++) cum[c] *= fix;

    arc.push(cum);
    fineS.push(s);
    fineCam.push(cam);
    fineLook.push(look);
  }
  return { stops, arc, fineS, fineCam, fineLook };
}

function legAt(track: TourTrack, p: number): number {
  let i = 0;
  while (i < track.stops.length - 2 && p > track.stops[i + 1]) i++;
  return i;
}

/** Camera and look target at scroll progress `p`. Writes into `cam` and `look` (no allocation). */
export function sampleTrack(track: TourTrack, p: number, cam: Vec3, look: Vec3): void {
  const i = legAt(track, p);
  const p0 = track.stops[i], p1 = track.stops[i + 1];
  const u = Math.min(1, Math.max(0, (p - p0) / (p1 - p0)));

  const cum = track.arc[i];
  const fc = u * CELLS;
  const c = Math.min(CELLS - 1, Math.floor(fc));
  const target = cum[c] + (cum[c + 1] - cum[c]) * (fc - c);

  const s = track.fineS[i];
  let lo = 0, hi = s.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (s[mid] <= target) lo = mid;
    else hi = mid;
  }
  const span = s[hi] - s[lo];
  const t = span > 0 ? Math.min(1, Math.max(0, (target - s[lo]) / span)) : 0;
  const C = track.fineCam[i], L = track.fineLook[i];
  const a = lo * 3, b = hi * 3;
  cam.x = C[a] + (C[b] - C[a]) * t; cam.y = C[a + 1] + (C[b + 1] - C[a + 1]) * t; cam.z = C[a + 2] + (C[b + 2] - C[a + 2]) * t;
  look.x = L[a] + (L[b] - L[a]) * t; look.y = L[a + 1] + (L[b + 1] - L[a + 1]) * t; look.z = L[a + 2] + (L[b + 2] - L[a + 2]) * t;
}

/** Index of the stop nearest to scroll progress `p` (no allocation). */
export function stopAt(track: TourTrack, p: number): number {
  return nearestStop(track.stops, p);
}

/** Scroll progress whose track camera is nearest `point` (use it to resume the tour after Play). */
export function nearestTrackProgress(track: TourTrack, point: Vec3): number {
  let bestD = Infinity, leg = 0, at = 0;
  for (let i = 0; i < track.fineCam.length; i++) {
    const C = track.fineCam[i];
    for (let f = 0; f < track.fineS[i].length; f++) {
      const d = (C[f * 3] - point.x) ** 2 + (C[f * 3 + 1] - point.y) ** 2 + (C[f * 3 + 2] - point.z) ** 2;
      if (d < bestD) { bestD = d; leg = i; at = track.fineS[i][f]; }
    }
  }
  const cum = track.arc[leg];
  let lo = 0, hi = CELLS;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= at) lo = mid;
    else hi = mid;
  }
  const span = cum[hi] - cum[lo];
  const u = (lo + (span > 0 ? Math.min(1, Math.max(0, (at - cum[lo]) / span)) : 0)) / CELLS;
  return track.stops[leg] + (track.stops[leg + 1] - track.stops[leg]) * u;
}

const tracks = new WeakMap<TourPath, TourTrack>();

/** The track for `path`, built once (a few ms) and shared by everyone holding the same path. */
export function trackFor(path: TourPath): TourTrack {
  let t = tracks.get(path);
  if (!t) {
    t = buildTourTrack(path);
    tracks.set(path, t);
  }
  return t;
}

/** Scroll-progress follower: a critically damped spring, so its velocity never jumps (even on wheel notches). */
export interface Follower { x: number; v: number }

/** Seconds; the follower trails a steady scroll by about this long. */
export const FOLLOW_TIME = 0.35;

export function followProgress(f: Follower, target: number, dt: number, smoothTime = FOLLOW_TIME): void {
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = f.x - target;
  const temp = (f.v + omega * change) * dt;
  f.v = (f.v - omega * temp) * e;
  f.x = target + (change + temp) * e;
  if (f.x < 0) { f.x = 0; f.v = 0; }
  else if (f.x > 1) { f.x = 1; f.v = 0; }
}

/** Seconds the camera takes to glide from the Play pose back onto the track. */
export const BLEND_TIME = 0.8;
/** Progress tolerance for "the page scroll has reached the hand-off point". */
const HANDOFF_EPS = 1e-3;
/** Seconds to wait for the hand-off scroll before scrolling the page ourselves. */
const HANDOFF_WAIT = 0.5;

/**
 * Per-frame tour camera state (pure: no DOM, no three). TourCamera feeds it the scroll progress
 * and applies the result.
 *
 * Play → tour hand-off (shared contract with useModeTransitions): when Play ends, the exit code
 * sets `runtime.tourProgress` to the resume point, starts the blend and scrolls the page there.
 * The driver detects the play → tour edge itself; on that edge, before the follower moves, it
 * re-seeds the follower at the hand-off progress with zero velocity and starts the blend. Until
 * the page scroll reaches the hand-off point (it may land before or after this frame) the
 * hand-off progress is the target, so the track pose never flies from the stale pre-Play progress.
 */
export interface TourDriver {
  follow: Follower;
  /** progress the camera is heading for: the scroll, or the hand-off point until the scroll lands */
  target: number;
  handoff: number;
  /** seconds spent waiting for the hand-off scroll */
  handoffWait: number;
  wasPlaying: boolean;
  /** linear blend clock, 1 → 0 over BLEND_TIME */
  blend: number;
  /** eased Play-pose weight this frame: 1 = the captured Play pose, 0 = the track pose */
  weight: number;
  /** true on the first tour frame after Play: capture the camera's pose now */
  edge: boolean;
  /** progress to scroll the page to this frame (hand-off scroll never arrived), or -1 */
  rescroll: number;
  cam: Vec3;
  look: Vec3;
  /** an island-to-island move (startGlide), or null: the camera flies its own curve, then follows the scroll again */
  glide: Glide | null;
}

/**
 * How the tour moves to another island (spec: voxel controls §5): "hop" arcs over the sea of clouds from island to
 * island (‹ ›, ← →, a swipe, a pad or cart tapped in the tour); "map" rises until the archipelago shows, then dives
 * onto the destination (a pick on the map).
 */
export type GlideKind = "hop" | "map" | "intro";

export interface Glide {
  kind: GlideKind;
  from: number;
  to: number;
  t: number;
  dur: number;
  /** camera and look-at at the start, at the end, and the curves' middle control points */
  cam0: Vec3; cam1: Vec3; camC: Vec3;
  look0: Vec3; look1: Vec3; lookC: Vec3;
}

/** Seconds of a hop between neighbours (longer for a farther island, up to HOP_MAX). */
export const GLIDE_TIME = 1.5;
const HOP_MAX = 2.1;
/** Seconds of a map pick's rise and dive. */
export const MAP_GLIDE_TIME = 2.4;

/** Seconds of the opening descent from above the clouds onto the first stop. */
export const INTRO_TIME = 3.2;

/**
 * The opening moment (polish #9): the camera starts high over the sea of clouds, behind the first stop, and settles
 * down onto its framing, the island growing out of the clouds below.
 */
export function startIntro(d: TourDriver, track: TourTrack): void {
  if (d.follow.x < 0) return;
  // it lands where the page is (the top: the first stop's framing), so the scroll keeps the glide
  const to = d.follow.x;
  const cam1 = { x: 0, y: 0, z: 0 }, look1 = { x: 0, y: 0, z: 0 };
  sampleTrack(track, to, cam1, look1);
  const bx = cam1.x - look1.x, bz = cam1.z - look1.z;
  const bl = Math.hypot(bx, bz) || 1;
  const cam0 = { x: cam1.x + (bx / bl) * 14, y: cam1.y + 26, z: cam1.z + (bz / bl) * 14 };
  const camC = { x: cam1.x + (bx / bl) * 3, y: cam1.y + 7, z: cam1.z + (bz / bl) * 3 };
  d.glide = { kind: "intro", from: to, to, t: 0, dur: INTRO_TIME, cam0, cam1, camC, look0: { ...look1 }, look1, lookC: { ...look1 } };
}

/** The glide's ease: a gentle start and a soft landing (ease-in-out sine). */
export function glideEase(u: number): number {
  const x = Math.min(1, Math.max(0, u));
  return 0.5 - 0.5 * Math.cos(Math.PI * x);
}

/** A point on the quadratic Bézier a → c → b at u (written into `out`). */
export function bezier(a: Vec3, c: Vec3, b: Vec3, u: number, out: Vec3): Vec3 {
  const v = 1 - u;
  out.x = v * v * a.x + 2 * v * u * c.x + u * u * b.x;
  out.y = v * v * a.y + 2 * v * u * c.y + u * u * b.y;
  out.z = v * v * a.z + 2 * v * u * c.z + u * u * b.z;
  return out;
}

/** The archipelago from above (a map pick's rise): the middle of every stop's look-at and how far they spread from it. */
export function overviewOf(stops: readonly { target: Vec3 }[]): { center: Vec3; spread: number } {
  const n = Math.max(1, stops.length);
  const center = { x: 0, y: 0, z: 0 };
  for (const s of stops) {
    center.x += s.target.x / n;
    center.y += s.target.y / n;
    center.z += s.target.z / n;
  }
  let spread = 0;
  for (const s of stops) spread = Math.max(spread, Math.hypot(s.target.x - center.x, s.target.z - center.z));
  return { center, spread };
}


/**
 * Starts a move from the camera's pose now (progress `d.follow.x`) to the stop at progress `to` (the page has been
 * scrolled there at once). A hop's curve rises over the midpoint by a third of the distance; a map pick's rises over
 * the whole archipelago (`overview`: the middle of every stop's look-at, and how far they spread).
 */
export function startGlide(d: TourDriver, track: TourTrack, to: number, kind: GlideKind, overview?: { center: Vec3; spread: number }): void {
  if (d.follow.x < 0) return;
  const cam0 = { x: 0, y: 0, z: 0 }, look0 = { x: 0, y: 0, z: 0 };
  const cam1 = { x: 0, y: 0, z: 0 }, look1 = { x: 0, y: 0, z: 0 };
  sampleTrack(track, d.follow.x, cam0, look0);
  sampleTrack(track, to, cam1, look1);
  const span = dist(cam0, cam1);
  let camC: Vec3, lookC: Vec3, dur: number;
  if (kind === "map" && overview) {
    // high above the archipelago's middle, set back along the view, looking at its middle
    const bx = cam0.x - look0.x, bz = cam0.z - look0.z;
    const bl = Math.hypot(bx, bz) || 1;
    camC = { x: overview.center.x + (bx / bl) * overview.spread * 0.6, y: overview.center.y + overview.spread * 1.1, z: overview.center.z + (bz / bl) * overview.spread * 0.6 };
    lookC = { ...overview.center };
    dur = MAP_GLIDE_TIME;
  } else {
    camC = { x: (cam0.x + cam1.x) / 2, y: Math.max(cam0.y, cam1.y) + Math.max(4, span / 3), z: (cam0.z + cam1.z) / 2 };
    lookC = { x: (look0.x + look1.x) / 2, y: (look0.y + look1.y) / 2, z: (look0.z + look1.z) / 2 };
    dur = Math.min(HOP_MAX, GLIDE_TIME + span / 120);
  }
  d.glide = { kind, from: d.follow.x, to, t: 0, dur, cam0, cam1, camC, look0, look1, lookC };
}

export interface DriverInput {
  playing: boolean;
  /** progress of the current page scroll */
  scroll: number;
  /** runtime.tourProgress, read on the play → tour edge */
  handoff: number;
  reduced: boolean;
  dt: number;
}

export function createTourDriver(): TourDriver {
  return {
    follow: { x: -1, v: 0 },
    target: 0,
    handoff: -1,
    handoffWait: 0,
    wasPlaying: false,
    blend: 0,
    weight: 0,
    edge: false,
    rescroll: -1,
    cam: { x: 0, y: 0, z: 0 },
    look: { x: 0, y: 0, z: 0 },
    glide: null,
  };
}

/** Advance one frame. Returns false while playing (the tour camera does nothing then). */
export function stepTourDriver(d: TourDriver, track: TourTrack, inp: DriverInput): boolean {
  d.edge = false;
  d.rescroll = -1;
  if (inp.playing) {
    d.wasPlaying = true;
    return false;
  }
  const f = d.follow;
  if (d.wasPlaying) {
    d.wasPlaying = false;
    d.edge = true;
    f.x = Math.min(1, Math.max(0, inp.handoff));
    f.v = 0;
    d.handoff = f.x;
    d.handoffWait = 0;
    d.blend = inp.reduced ? 0 : 1;
  }

  let target = inp.scroll;
  if (d.handoff >= 0) {
    if (Math.abs(inp.scroll - d.handoff) <= HANDOFF_EPS) d.handoff = -1;
    else {
      target = d.handoff;
      d.handoffWait += inp.dt;
      if (d.handoffWait > HANDOFF_WAIT) {
        d.rescroll = d.handoff;
        d.handoff = -1;
      }
    }
  }
  d.target = target;

  if (f.x < 0) f.x = target;
  const g = d.glide;
  // a glide ends early when the page scrolls somewhere else meanwhile (the visitor scrolled on)
  if (g && (inp.reduced || Math.abs(target - g.to) > HANDOFF_EPS)) d.glide = null;
  if (d.glide) {
    const gl = d.glide;
    gl.t += inp.dt;
    const u = glideEase(gl.t / gl.dur);
    // the progress walks along with it (the chapter, the milestones read it); the pose flies its own curve
    f.x = gl.from + (gl.to - gl.from) * u;
    f.v = 0;
    bezier(gl.cam0, gl.camC, gl.cam1, u, d.cam);
    bezier(gl.look0, gl.lookC, gl.look1, u, d.look);
    if (gl.t >= gl.dur) {
      f.x = gl.to;
      d.glide = null;
      sampleTrack(track, f.x, d.cam, d.look);
    }
    if (d.blend > 0) d.blend = Math.max(0, d.blend - inp.dt / BLEND_TIME);
    d.weight = 1 - smoother(1 - d.blend);
    return true;
  } else if (inp.reduced) {
    // camera cuts: always sit exactly on the nearest stop
    f.x = track.stops[stopAt(track, target)];
    f.v = 0;
  } else followProgress(f, target, inp.dt);
  sampleTrack(track, f.x, d.cam, d.look);

  if (d.blend > 0) d.blend = inp.reduced ? 0 : Math.max(0, d.blend - inp.dt / BLEND_TIME);
  d.weight = 1 - smoother(1 - d.blend);
  return true;
}
