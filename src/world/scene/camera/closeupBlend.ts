import { closeupWeight, stepCloseupBlend } from "@/world/engine/camera/closeup";

/** CloseupCamera's blend clock: k (0 = the base camera, 1 = the closeup) and the target it frames. */
export interface BlendClock {
  k: number;
  /** the target being framed: the open one, or the last one while gliding back out */
  id: string | null;
}

/** Ezra is hidden while the closeup blend's weight is past this (on the way in and on the way out). */
export const EZRA_HIDE_WEIGHT = 0.5;

/**
 * The closeup blend's eased weight this frame (0 = the base camera, 1 = the closeup). CloseupCamera writes it, frame
 * code mounted after it reads it (Ezra). A plain object: no allocation, no React state.
 */
export const closeupBlend = { weight: 0 };

/**
 * A Play fast travel (runtime.travel) past its arrival cuts the closeup blend. startTravel closes the map board's
 * closeup, so its glide out (CLOSEUP_GLIDE) is still running when Ezra moves (TRAVEL_OUT later); from then on the
 * follow camera stands at the destination, and blending it toward the departure board (up to 100+ blocks away) would
 * swing the view back across the world while the screen fades in. The puff away is not cut: there the glide out still
 * frames the island he is leaving.
 */
export function travelCutsCloseup(travel: { phase: "out" | "in" } | null): boolean {
  return travel?.phase === "in";
}

/**
 * One frame of CloseupCamera's blend: follows the open closeup `open` (or glides back out from the last target after a
 * close) and returns the eased weight. Cuts to 0 and forgets the target when it is no longer registered in `targets`,
 * and while a fast travel has arrived (travelCutsCloseup). Reduced motion cuts both ways (stepCloseupBlend). Mutates
 * `clock`.
 */
export function stepBlendClock(
  clock: BlendClock,
  open: { id: string } | null,
  targets: { has(id: string): boolean },
  travel: { phase: "out" | "in" } | null,
  dt: number,
  reduced: boolean,
): number {
  if (open) clock.id = open.id;
  if (clock.id === null || !targets.has(clock.id) || travelCutsCloseup(travel)) {
    clock.k = 0;
    clock.id = null;
    return 0;
  }
  clock.k = stepCloseupBlend(clock.k, open !== null, dt, reduced);
  if (clock.k <= 0) {
    clock.id = null;
    return 0;
  }
  return closeupWeight(clock.k);
}

/** Ezra is hidden past EZRA_HIDE_WEIGHT: the camera has moved far enough toward the screen that he would block it. */
export function closeupHidesEzra(weight: number): boolean {
  return weight > EZRA_HIDE_WEIGHT;
}
