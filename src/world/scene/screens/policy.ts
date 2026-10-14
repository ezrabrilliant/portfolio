/** Seconds the idle demo stays paused after the visitor's last tap on the screen (spec §5.1). */
export const DEMO_PAUSE = 7;
/**
 * Seconds a screen shows its current state after its island comes into view (or its closeup opens) before the idle
 * demo starts, so the visitor reads it before the demo moves it on.
 */
export const ARRIVAL_READ = 4;
/** Shortest time between two redraws of one screen: at most 15 fps (spec §11). */
export const MIN_FRAME = 1 / 15;

export interface DemoGate {
  reduced: boolean;
  t: number;
  pausedUntil: number;
  inCloseup: boolean;
  activeIsland: string;
  island: string;
}

/** The screen is in view: its island is the one in view, or the screen is in closeup. */
export function inView(g: DemoGate): boolean {
  return g.inCloseup || g.activeIsland === g.island;
}

/**
 * The idle demo plays only while the screen is in view, never under reduced motion, and not before `pausedUntil`
 * (DEMO_PAUSE after a tap, ARRIVAL_READ after the screen comes into view).
 */
export function demoMayRun(g: DemoGate): boolean {
  if (g.reduced || g.t < g.pausedUntil) return false;
  return inView(g);
}

/**
 * The demo's `pausedUntil` after this frame: on arrival (out of view last frame, in view now) it holds at least
 * ARRIVAL_READ from now, keeping a longer pause already running; otherwise it is unchanged.
 */
export function arrivalPause(wasInView: boolean, nowInView: boolean, t: number, pausedUntil: number): number {
  return !wasInView && nowInView ? Math.max(pausedUntil, t + ARRIVAL_READ) : pausedUntil;
}

/** A redraw is due when the state changed (dirty) or the app animates (busy), never sooner than MIN_FRAME after the last. */
export function redrawDue(t: number, lastDraw: number, dirty: boolean, busy: boolean): boolean {
  return (dirty || busy) && t - lastDraw >= MIN_FRAME - 1e-9;
}
