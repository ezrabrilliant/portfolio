/** A rectangle of a screen, in logical units, that does `action` (with `arg`) when the visitor taps it. */
export interface HitRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  action: string;
  arg?: number;
}

/**
 * A program drawn on a live screen (spec §5.1): framework-free state, pure actions and a canvas draw.
 * `t` is the R3F clock in seconds. `init(now)`: `now` is the wall-clock time at clock t = 0 (LiveScreen passes
 * `Date.now() − elapsed`), so `new Date(now.getTime() + t * 1000)` is the wall time at clock time t.
 */
export interface ScreenApp<S> {
  /** Drawing units; the canvas is logical × SCREEN_SCALE. */
  logical: { w: number; h: number };
  init(now: Date): S;
  /** Visitor input on a hit region. */
  act(s: S, action: string, arg: number | undefined, t: number): S;
  /** Idle demo step; null = nothing happened. */
  auto(s: S, t: number): S | null;
  /** Animating (typing, confirmation, pulse): keep redrawing, at most 15 fps. */
  busy(s: S, t: number): boolean;
  /** Paints the whole screen (ctx is already scaled to logical units); returns the hit regions, bottom to top. */
  draw(ctx: CanvasRenderingContext2D, s: S, t: number): HitRegion[];
  /** Keyboard while this screen is in closeup (e.g. arrows on a map board); null = not handled. Esc never arrives. */
  key?(s: S, code: string, t: number): S | null;
}

/** Canvas pixels per logical unit: a 640 × 400 screen draws on a 1280 × 800 canvas. */
export const SCREEN_SCALE = 2;

/** The region under (x, y), edges inclusive; where regions overlap the last one (drawn on top) wins. */
export function hitAt(regions: readonly HitRegion[], x: number, y: number): HitRegion | null {
  for (let i = regions.length - 1; i >= 0; i--) {
    const r = regions[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r;
  }
  return null;
}

/** Face uv (origin bottom-left, y up, as three.js reports it) → logical units (origin top-left, y down). */
export function uvToLogical(uv: { x: number; y: number }, logical: { w: number; h: number }): { x: number; y: number } {
  return { x: uv.x * logical.w, y: (1 - uv.y) * logical.h };
}
