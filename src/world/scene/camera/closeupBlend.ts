import { closeupWeight, stepCloseupBlend } from "@/world/engine/camera/closeup";

/** CloseupCamera's blend clock: k (0 = the base camera, 1 = the closeup) and the target it frames. */
export interface BlendClock {
  k: number;
  /** the target being framed: the open one, or the last one while gliding back out */
  id: string | null;
}

/**
 * Ezra is hidden while the closeup blend's weight is past this (on the way in and on the way out): about the first
 * 0.29 s of the 0.8 s glide still shows him. It must stay under the weight where the camera can first reach him: on a
 * phone at the GTID map board the follow camera's wall pull-in snaps to his head from w ≈ 0.31 (at 0.5 he flickered
 * there, and on a desktop the near plane sliced him for three frames); the other screens reach him from 0.58 on.
 */
export const EZRA_HIDE_WEIGHT = 0.25;

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

/** Ezra is hidden past EZRA_HIDE_WEIGHT: the camera is on its way to the screen he stands in front of. */
export function closeupHidesEzra(weight: number): boolean {
  return weight > EZRA_HIDE_WEIGHT;
}

/** Ezra.tsx's closeup state: whether a closeup was open last frame, and whether he was already hidden when it opened. */
export interface EzraCloseupHold {
  open: boolean;
  held: boolean;
}

/**
 * Whether the closeup hides Ezra this frame (Ezra.tsx): past EZRA_HIDE_WEIGHT on the way in and on the way out, and,
 * while a closeup is open, all along when he was already hidden as it opened (`shown`: his visibility going into the
 * frame). The near-camera check hides him while the follow camera is pressed against his head (the Petak Umpet and GTID
 * boards); the glide pulls the camera off his head before the weight reaches the threshold, which would show him for a
 * few frames and hide him again. Closing lets go: the glide out is the weight alone. Mutates `hold`.
 */
export function ezraCloseupHidden(hold: EzraCloseupHold, open: boolean, shown: boolean, weight: number): boolean {
  if (!open) hold.held = false;
  else if (!hold.open) hold.held = !shown;
  hold.open = open;
  return hold.held || closeupHidesEzra(weight);
}
