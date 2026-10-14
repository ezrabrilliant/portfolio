import type { Vec3 } from "@/world/engine/types";

/** Share of the free frame a closeup target fills: 85 % of its height, or 90 % of the width where the width binds. */
export const CLOSEUP_FILL = { h: 0.85, w: 0.9 };
/** Seconds of the glide into a closeup and back out of it. */
export const CLOSEUP_GLIDE = 0.8;
/**
 * CSS px at the top of the canvas that the HUD covers (world.css: the Play / Sound bar from 16 px, the hint line
 * below it ending near 87 px, plus air). CloseupCamera turns it into closeupPose's `inset`, a share of the canvas height.
 */
export const CLOSEUP_HUD_PX = 96;
/** The closeup camera's near plane stops this far in front of the face: everything nearer the camera is clipped. */
export const CLOSEUP_NEAR_MARGIN = 0.25;

/**
 * How closeupPose frames its target. `inset`: share of the frame height kept free at the top (the HUD); the target is
 * fitted and centred in the frame below it. `pan`: world units the camera slides along the face's horizontal, for a
 * wide target on a portrait viewport (clamped to closeupPanLimit; 0 = centred).
 */
export interface CloseupView { inset?: number; pan?: number }

/** A landscape target on a portrait viewport is fitted by its height and panned sideways, not shrunk to the width. */
export function closeupPans(size: { w: number; h: number }, aspect: number): boolean {
  return aspect < 1 && size.w > size.h;
}

/**
 * Distance from the face for a camera with a vertical fov of `fovDeg` at `aspect` (width / height): the target's height
 * fills CLOSEUP_FILL.h of the frame below the inset unless its width would then overflow CLOSEUP_FILL.w, in which case
 * the width fits instead; a panning target (closeupPans) always fits its height.
 */
export function closeupDistance(size: { w: number; h: number }, aspect: number, fovDeg: number, inset = 0): number {
  const tanY = Math.tan((fovDeg * Math.PI) / 360);
  const byHeight = size.h / (2 * tanY * CLOSEUP_FILL.h * (1 - inset));
  if (closeupPans(size, aspect)) return byHeight;
  return Math.max(byHeight, size.w / (2 * tanY * aspect * CLOSEUP_FILL.w));
}

/**
 * How far either way (world units) a panning closeup may slide: until the face's left or right edge reaches the
 * viewport's edge. 0 when the target is not panned.
 */
export function closeupPanLimit(size: { w: number; h: number }, aspect: number, fovDeg: number, inset = 0): number {
  if (!closeupPans(size, aspect)) return 0;
  const tanY = Math.tan((fovDeg * Math.PI) / 360);
  return Math.max(0, size.w / 2 - closeupDistance(size, aspect, fovDeg, inset) * tanY * aspect);
}

/** A pan offset kept within ±limit. */
export function clampPan(pan: number, limit: number): number {
  return Math.min(limit, Math.max(-limit, pan));
}

/**
 * Camera pose square on to a flat target (centre, facing `normal`, size in world units) at closeupDistance, lifted by
 * the inset so the target sits centred in the frame below the HUD, and slid by `view.pan` along the face's horizontal.
 * The face's up is world Y made perpendicular to the normal, its right is up × normal. The sketch's stopPose with FOV_T,
 * without its 0.84 fudge. Pure; pass `out` to reuse its objects in frame callbacks.
 */
export function closeupPose(
  center: Vec3,
  normal: Vec3,
  size: { w: number; h: number },
  aspect: number,
  fovDeg: number,
  out?: { camera: Vec3; target: Vec3 },
  view: CloseupView = {},
): { camera: Vec3; target: Vec3 } {
  const inset = view.inset ?? 0;
  const tanY = Math.tan((fovDeg * Math.PI) / 360);
  const d = closeupDistance(size, aspect, fovDeg, inset);
  const len = Math.hypot(normal.x, normal.y, normal.z);
  const ok = len > 1e-9;
  const nx = ok ? normal.x / len : 0;
  const ny = ok ? normal.y / len : 0;
  const nz = ok ? normal.z / len : 1;
  // the face's up: world Y minus its part along the normal (a face looking straight up or down takes −z as its up)
  let ux = -ny * nx;
  let uy = 1 - ny * ny;
  let uz = -ny * nz;
  const ul = Math.hypot(ux, uy, uz);
  if (ul > 1e-6) {
    ux /= ul;
    uy /= ul;
    uz /= ul;
  } else {
    ux = 0;
    uy = 0;
    uz = -1;
  }
  const rx = uy * nz - uz * ny;
  const ry = uz * nx - ux * nz;
  const rz = ux * ny - uy * nx;
  // a lift of inset × the half frame height puts the face's centre in the middle of the frame below the HUD
  const lift = inset * d * tanY;
  const pan = clampPan(view.pan ?? 0, closeupPanLimit(size, aspect, fovDeg, inset));
  const ox = ux * lift + rx * pan;
  const oy = uy * lift + ry * pan;
  const oz = uz * lift + rz * pan;
  const pose = out ?? { camera: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } };
  pose.target.x = center.x + ox;
  pose.target.y = center.y + oy;
  pose.target.z = center.z + oz;
  pose.camera.x = pose.target.x + nx * d;
  pose.camera.y = pose.target.y + ny * d;
  pose.camera.z = pose.target.z + nz * d;
  return pose;
}

/** Advances the blend clock k (0 = the base camera, 1 = the closeup) toward `active`; a cut under reduced motion. */
export function stepCloseupBlend(k: number, active: boolean, dt: number, reduced: boolean): number {
  if (reduced) return active ? 1 : 0;
  const step = dt / CLOSEUP_GLIDE;
  return active ? Math.min(1, k + step) : Math.max(0, k - step);
}

/** Eased weight of the blend clock (smootherstep): the glide starts and lands softly. */
export function closeupWeight(k: number): number {
  const x = Math.min(1, Math.max(0, k));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * The camera's near plane during a closeup: from the default `base` (weight 0) toward CLOSEUP_NEAR_MARGIN in front of
 * the face (weight 1), eased by the weight cubed so the clip only reaches far once the camera is nearly square on.
 * Never below `base`. `faceDistance` is the camera's distance to the face's plane.
 */
export function closeupNear(base: number, faceDistance: number, weight: number): number {
  const clip = Math.max(base, faceDistance - CLOSEUP_NEAR_MARGIN);
  const w = Math.min(1, Math.max(0, weight));
  return base + (clip - base) * w * w * w;
}

/**
 * Reduced motion: true on the one frame a closeup has just ended, when a base camera that eases from the camera's last
 * position (PlayCamera's follow lerp) must cut to its own pose instead of gliding back from the closeup pose.
 * CloseupCamera's blend already cuts to weight 0 then. `last.open` keeps whether a closeup was open on the previous call.
 */
export function closeupExitCut(last: { open: boolean }, open: boolean, reduced: boolean): boolean {
  const ended = last.open && !open;
  last.open = open;
  return ended && reduced;
}
