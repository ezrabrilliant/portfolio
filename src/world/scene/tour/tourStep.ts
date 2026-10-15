import { runtime } from "@/world/state/runtime";
import { chapterAt, scrollToProgress } from "./tourMath";
import { scrollToIsland } from "./scrollToIsland";

/** The stop `dir` steps from `from` among `n`, held at the ends (the tour does not wrap round). */
export function stepStopIndex(from: number, dir: 1 | -1, n: number): number {
  return Math.min(n - 1, Math.max(0, from + dir));
}

/** A step pressed again while the last one still glides counts from where that one is going (ms it is trusted). */
const PENDING_MS = 900;
let pending: { index: number; at: number } | null = null;

/**
 * Tour: glide to the next (+1) or previous (−1) island (spec: voxel controls §5): a phone's sideways swipe, ← / → and the
 * HUD's arrows. Counts from the island the page is scrolled to, or the one a step just before is still gliding to.
 */
export function stepTour(dir: 1 | -1, now = performance.now()): void {
  const path = runtime.tourPath;
  if (!path) return;
  const from = pending && now - pending.at < PENDING_MS ? pending.index : chapterAt(path, scrollToProgress(window.scrollY));
  const index = stepStopIndex(from, dir, path.stops.length);
  pending = { index, at: now };
  scrollToIsland(path.stops[index].id);
}

/** A sideways swipe: far enough, and mostly sideways (a page scroll is mostly vertical). Returns its direction, or 0. */
export function swipeDir(dx: number, dy: number): 1 | -1 | 0 {
  if (Math.abs(dx) < 50 || Math.abs(dx) < 1.5 * Math.abs(dy)) return 0;
  // a swipe to the left brings the next island in, as a carousel does
  return dx < 0 ? 1 : -1;
}
