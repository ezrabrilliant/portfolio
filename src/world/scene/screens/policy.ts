/** Seconds the idle demo stays paused after the visitor's last tap on the screen (spec §5.1). */
export const DEMO_PAUSE = 7;
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

/**
 * The idle demo plays only while its island is the one in view (or the screen is in closeup), never under reduced
 * motion, and not within DEMO_PAUSE of a tap.
 */
export function demoMayRun(g: DemoGate): boolean {
  if (g.reduced || g.t < g.pausedUntil) return false;
  return g.inCloseup || g.activeIsland === g.island;
}

/** A redraw is due when the state changed (dirty) or the app animates (busy), never sooner than MIN_FRAME after the last. */
export function redrawDue(t: number, lastDraw: number, dirty: boolean, busy: boolean): boolean {
  return (dirty || busy) && t - lastDraw >= MIN_FRAME - 1e-9;
}
