/**
 * Adaptive zoom (spec: voxel controls, polish #10): the boom eases a little longer while he runs (more ahead in view)
 * and a little shorter once he has stood by something usable for a moment; 1 otherwise. Rate per second.
 */
export const ZOOM_BIAS = { run: 1.12, near: 0.9, nearAfter: 1, rate: 1.5 } as const;

/** The adaptive zoom's target for this frame. */
export function zoomBiasTarget(running: boolean, nearFor: number): number {
  if (running) return ZOOM_BIAS.run;
  if (nearFor >= ZOOM_BIAS.nearAfter) return ZOOM_BIAS.near;
  return 1;
}
