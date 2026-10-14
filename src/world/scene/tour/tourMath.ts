import { stopProgress } from "@/world/engine/camera/tourPath";
import type { TourPath } from "@/world/engine/camera/tourPath";
import { buildRail, railPoint } from "@/world/engine/traversal/rail";
import { positionAt, solveLaunch } from "@/world/engine/traversal/ballistic";
import type { WorldLayout } from "@/world/engine/gen/layout";
import { runtime } from "@/world/state/runtime";
import type { Vec3 } from "@/world/engine/types";
import { VIEW_F } from "../islands/types";

export const TRACK_VH_PER_STOP = 140;

export function trackHeightPx(stops: number, viewportH: number): number {
  return (stops * TRACK_VH_PER_STOP * viewportH) / 100;
}

/**
 * The one scroll ↔ progress measure. The scroll track is sized in large-viewport units (`lvh`,
 * `vh` where unsupported) and a `100lvh` probe inside it gives the viewport height in the same
 * unit, so a phone's URL bar showing or hiding (which changes `innerHeight`) never moves the tour.
 * Cached; `refreshScrollMeasure()` re-reads it on resize. Everything that converts between scroll
 * and progress (TourCamera, `?stop`, scrollToIsland, leaving Play) uses it via the defaults below;
 * a measure is passed whole, never as separate track and viewport heights.
 */
export interface ScrollMeasure { trackPx: number; viewportH: number }

export const TRACK_CLASS = "tour-track";
export const PROBE_CLASS = "tour-track-probe";
export const VIEWPORT_UNIT: "lvh" | "vh" =
  typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("height", "1lvh") ? "lvh" : "vh";

let cached: ScrollMeasure | null = null;

function measureTrack(): ScrollMeasure | null {
  if (typeof document === "undefined") return null;
  const track = document.querySelector<HTMLElement>(`.${TRACK_CLASS}`);
  const probe = track?.querySelector<HTMLElement>(`.${PROBE_CLASS}`);
  if (!track || !probe || !(probe.offsetHeight > 0)) return null;
  return { trackPx: track.offsetHeight, viewportH: probe.offsetHeight };
}

export function scrollMeasure(): ScrollMeasure {
  if (!cached) cached = measureTrack();
  if (cached) return cached;
  // no scroll track in the page (tests, no-WebGL fallback): the same geometry from innerHeight
  const vh = typeof window !== "undefined" ? window.innerHeight : 1000;
  return { trackPx: trackHeightPx(runtime.layout.tourOrder.length, vh), viewportH: vh };
}

/** Re-read the measure (after a resize). True when the scroll range changed. */
export function refreshScrollMeasure(): boolean {
  const next = measureTrack();
  if (!next) return false;
  const changed = !cached || cached.trackPx !== next.trackPx || cached.viewportH !== next.viewportH;
  cached = next;
  return changed;
}

/** Page scroll (px) → tour progress 0..1, under one whole measure (the cached one by default). */
export function scrollToProgress(scrollY: number, m: ScrollMeasure = scrollMeasure()): number {
  const max = Math.max(1, m.trackPx - m.viewportH);
  return Math.min(1, Math.max(0, scrollY / max));
}

/** Tour progress 0..1 → page scroll (px), under one whole measure (the cached one by default). */
export function progressToScroll(p: number, m: ScrollMeasure = scrollMeasure()): number {
  return Math.min(1, Math.max(0, p)) * Math.max(1, m.trackPx - m.viewportH);
}

const stopCache = new WeakMap<TourPath, number[]>();

/** Progress of every stop of `path`, computed once per path. */
export function stopProgresses(path: TourPath): number[] {
  let s = stopCache.get(path);
  if (!s) {
    s = path.stops.map((_, i) => stopProgress(path, i));
    stopCache.set(path, s);
  }
  return s;
}

/** Index of the stop progress in `stops` nearest to `p` (no allocation). */
export function nearestStop(stops: readonly number[], p: number): number {
  let best = 0;
  for (let i = 1; i < stops.length; i++) if (Math.abs(stops[i] - p) < Math.abs(stops[best] - p)) best = i;
  return best;
}

export function chapterAt(path: TourPath, progress: number): number {
  return nearestStop(stopProgresses(path), progress);
}

/** A camera point that watches `p` from above and behind along the tour view direction. */
function watch(p: Vec3, lift: number, back: number): Vec3 {
  return { x: p.x - VIEW_F.x * back, y: p.y + lift, z: p.z - VIEW_F.z * back };
}

/** Camera via points between consecutive tour stops, following the real crossing. */
export function tourVia(layout: WorldLayout): Vec3[][] {
  const out: Vec3[][] = [];
  for (let i = 0; i < layout.tourOrder.length - 1; i++) {
    const from = layout.tourOrder[i];
    const to = layout.tourOrder[i + 1];
    const c = layout.crossings.find((x) => x.from === from && x.to === to);
    if (!c) {
      out.push([]);
      continue;
    }
    if (c.kind === "minecart") {
      const rail = buildRail(c.a, c.b, 3);
      out.push([0.2, 0.4, 0.6, 0.8].map((u) => watch(railPoint(rail, u), 7, 13)));
    } else if (c.kind === "bouncePads") {
      const { vel, time } = solveLaunch(c.a, c.b, 30, 3);
      out.push([0.3, 0.5, 0.7].map((f) => watch(positionAt(c.a, vel, 30, time * f), 6, 15)));
    } else if (layout.islands.find((q) => q.id === from)?.district === "web") {
      // the Web & Apps chain: short bridges between small islands; a via behind them would pull the camera back
      // and forth between stops that are only ~14 blocks apart, so the camera flies straight from stop to stop
      out.push([]);
    } else {
      const mid = { x: (c.a.x + c.b.x) / 2, y: (c.a.y + c.b.y) / 2, z: (c.a.z + c.b.z) / 2 };
      out.push([watch(mid, 9, 18)]);
    }
  }
  return out;
}
