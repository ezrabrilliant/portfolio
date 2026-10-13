import { railPoint } from "@/world/engine/traversal/rail";
import type { Vec3 } from "@/world/engine/types";

export interface TourStop { id: string; camera: Vec3; target: Vec3; dwell: number }
export interface TourSample { camera: Vec3; target: Vec3; chapter: number; chapterProgress: number }
export interface TourPath { stops: TourStop[]; via: Vec3[][]; totalWeight: number; controls: Vec3[]; stopIndex: number[] }

export const TRAVEL_WEIGHT = 1;
const DELTA = 0.15;   // half-width of a dwell window, in control-point segments

interface Zone { kind: "dwell" | "travel"; index: number; w0: number; w1: number; c0: number; c1: number }

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });

export function buildTourPath(stops: TourStop[], via: Vec3[][] = []): TourPath {
  if (stops.length < 2) throw new Error("tour path needs at least two stops");
  if (stops.some((s) => !(s.dwell > 0))) throw new Error("every tour stop needs a dwell weight > 0");
  const controls: Vec3[] = [];
  const stopIndex: number[] = [];
  stops.forEach((s, i) => {
    stopIndex.push(controls.length);
    controls.push(s.camera);
    if (i < stops.length - 1) for (const v of via[i] ?? []) controls.push(v);
  });
  const totalWeight = stops.reduce((sum, s) => sum + s.dwell, 0) + (stops.length - 1) * TRAVEL_WEIGHT;
  return { stops, via, totalWeight, controls, stopIndex };
}

function zones(path: TourPath): Zone[] {
  const { stops, stopIndex: k } = path;
  const n = stops.length;
  const out: Zone[] = [];
  let w = 0;
  for (let i = 0; i < n; i++) {
    const lo = i > 0 ? k[i] - DELTA : k[i];
    const hi = i < n - 1 ? k[i] + DELTA : k[i];
    out.push({ kind: "dwell", index: i, w0: w, w1: w + stops[i].dwell, c0: lo, c1: hi });
    w += stops[i].dwell;
    if (i < n - 1) {
      out.push({ kind: "travel", index: i, w0: w, w1: w + TRAVEL_WEIGHT, c0: k[i] + DELTA, c1: k[i + 1] - DELTA });
      w += TRAVEL_WEIGHT;
    }
  }
  return out;
}

function curveAt(path: TourPath, c: number): Vec3 {
  return railPoint({ points: path.controls }, c / (path.controls.length - 1));
}

function targetAt(path: TourPath, c: number): Vec3 {
  const { stops, stopIndex: k } = path;
  let i = 0;
  while (i < k.length - 2 && c >= k[i + 1]) i++;
  const seg = clamp01((c - k[i]) / (k[i + 1] - k[i]));
  return lerp3(stops[i].target, stops[i + 1].target, seg * seg * (3 - 2 * seg));
}

export function samplePath(path: TourPath, progress: number): TourSample {
  const W = clamp01(progress) * path.totalWeight;
  const zs = zones(path);
  const zone = zs.find((z) => W <= z.w1) ?? zs[zs.length - 1];
  const f = zone.w1 > zone.w0 ? (W - zone.w0) / (zone.w1 - zone.w0) : 0;
  const c = zone.c0 + (zone.c1 - zone.c0) * f;

  const travels = zs.filter((z) => z.kind === "travel");
  const n = path.stops.length;
  let chapter = n - 1;
  let start = 0, end = path.totalWeight;
  for (let i = 0; i < n; i++) {
    const s = i === 0 ? 0 : (travels[i - 1].w0 + travels[i - 1].w1) / 2;
    const e = i === n - 1 ? path.totalWeight : (travels[i].w0 + travels[i].w1) / 2;
    if (W < e || i === n - 1) { chapter = i; start = s; end = e; break; }
  }
  return { camera: curveAt(path, c), target: targetAt(path, c), chapter, chapterProgress: clamp01((W - start) / (end - start)) };
}

export function stopProgress(path: TourPath, index: number): number {
  const n = path.stops.length;
  if (index <= 0) return 0;
  if (index >= n - 1) return 1;
  const zone = zones(path).find((z) => z.kind === "dwell" && z.index === index)!;
  return (zone.w0 + zone.w1) / 2 / path.totalWeight;
}

export function nearestProgress(path: TourPath, point: Vec3): number {
  const dist2 = (p: number) => {
    const c = samplePath(path, p).camera;
    return (c.x - point.x) ** 2 + (c.y - point.y) ** 2 + (c.z - point.z) ** 2;
  };
  const COARSE = 400, FINE = 400;
  let best = 0, bestD = Infinity;
  for (let i = 0; i <= COARSE; i++) {
    const p = i / COARSE, dd = dist2(p);
    if (dd < bestD) { bestD = dd; best = p; }
  }
  const lo = Math.max(0, best - 1 / COARSE), hi = Math.min(1, best + 1 / COARSE);
  for (let i = 0; i <= FINE; i++) {
    const p = lo + ((hi - lo) * i) / FINE, dd = dist2(p);
    if (dd < bestD) { bestD = dd; best = p; }
  }
  return best;
}
