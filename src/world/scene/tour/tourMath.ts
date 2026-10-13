import { stopProgress } from "@/world/engine/camera/tourPath";
import type { TourPath } from "@/world/engine/camera/tourPath";
import { buildRail, railPoint } from "@/world/engine/traversal/rail";
import { positionAt, solveLaunch } from "@/world/engine/traversal/ballistic";
import type { WorldLayout } from "@/world/engine/gen/layout";
import type { Vec3 } from "@/world/engine/types";
import { VIEW_F } from "../islands/types";

export const TRACK_VH_PER_STOP = 140;

export function trackHeightPx(stops: number, viewportH: number): number {
  return (stops * TRACK_VH_PER_STOP * viewportH) / 100;
}

export function scrollToProgress(scrollY: number, trackPx: number, viewportH: number): number {
  const max = Math.max(1, trackPx - viewportH);
  return Math.min(1, Math.max(0, scrollY / max));
}

export function progressToScroll(p: number, trackPx: number, viewportH: number): number {
  return Math.min(1, Math.max(0, p)) * Math.max(1, trackPx - viewportH);
}

export function chapterAt(path: TourPath, progress: number): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < path.stops.length; i++) {
    const d = Math.abs(stopProgress(path, i) - progress);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
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
    } else {
      const mid = { x: (c.a.x + c.b.x) / 2, y: (c.a.y + c.b.y) / 2, z: (c.a.z + c.b.z) / 2 };
      out.push([watch(mid, 9, 18)]);
    }
  }
  return out;
}
