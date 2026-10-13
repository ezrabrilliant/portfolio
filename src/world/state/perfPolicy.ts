/**
 * What drei's PerformanceMonitor events do to the renderer.
 *
 * drei counts an "incline" on every 2.5 s sampling window that runs at the display's refresh rate, even when
 * there is nothing left to raise, so its `flipflops` + `onFallback` would drop every healthy 60/120 Hz device to
 * the low tier after ~11 s. Instead: any decline drops the pixel ratio to 1 and an incline restores it; only a
 * run of DECLINES_TO_LOW declines in a row (≈ 7.5 s of slow frames) switches to the low tier, for good
 * (switching tiers rebuilds terrain geometry and toggles shadows, so it never flips back).
 */
export const DECLINES_TO_LOW = 3;

export interface PerfPolicy {
  /** declines in a row */
  declines: number;
  /** frames run slow: pixel ratio 1 */
  slow: boolean;
  quality: "high" | "low";
}

export function createPerfPolicy(): PerfPolicy {
  return { declines: 0, slow: false, quality: "high" };
}

/** Apply one monitor event. Returns true exactly when this event drops quality to "low". */
export function perfStep(p: PerfPolicy, event: "incline" | "decline"): boolean {
  if (event === "incline") {
    p.declines = 0;
    p.slow = false;
    return false;
  }
  p.slow = true;
  p.declines += 1;
  if (p.quality === "high" && p.declines >= DECLINES_TO_LOW) {
    p.quality = "low";
    return true;
  }
  return false;
}
