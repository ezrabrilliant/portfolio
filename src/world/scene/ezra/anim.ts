export type AnimState = "idle" | "walk" | "run" | "jump" | "fall" | "land" | "sit" | "standUp" | "ride";

export interface AnimInput {
  onGround: boolean;
  speed: number;
  vy: number;
  landTimer: number;
  seated: boolean;
  standUp: number;
  riding: boolean;
}

/** Joint angles in radians (rotation about X: negative swings a limb forward) and body offsets in blocks. */
export interface Pose {
  legL: number;
  legR: number;
  /** knee bend; positive folds the shin back, so legX + kneeX is the shin's angle from vertical */
  kneeL: number;
  kneeR: number;
  armL: number;
  armR: number;
  armSpread: number;
  bodyY: number;
  /** forward shift of the body (seated: hips toward the rim) */
  bodyZ: number;
  squash: number;
  headPitch: number;
  headYaw: number;
  lean: number;
}

export const STAND_UP_SECONDS = 1.1;

export function pickAnim(i: AnimInput): AnimState {
  if (i.seated) return "sit";
  if (i.riding) return "ride";
  if (i.standUp > 0) return "standUp";
  if (!i.onGround) return i.vy > 0 ? "jump" : "fall";
  if (i.landTimer > 0) return "land";
  if (i.speed > 5.5) return "run";
  if (i.speed > 0.3) return "walk";
  return "idle";
}

const NEUTRAL: Pose = {
  legL: 0, legR: 0, kneeL: 0, kneeR: 0, armL: 0, armR: 0, armSpread: 0.06,
  bodyY: 0, bodyZ: 0, squash: 1, headPitch: 0, headYaw: 0, lean: 0,
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function mix(a: Pose, b: Pose, u: number): Pose {
  return {
    legL: lerp(a.legL, b.legL, u),
    legR: lerp(a.legR, b.legR, u),
    kneeL: lerp(a.kneeL, b.kneeL, u),
    kneeR: lerp(a.kneeR, b.kneeR, u),
    armL: lerp(a.armL, b.armL, u),
    armR: lerp(a.armR, b.armR, u),
    armSpread: lerp(a.armSpread, b.armSpread, u),
    bodyY: lerp(a.bodyY, b.bodyY, u),
    bodyZ: lerp(a.bodyZ, b.bodyZ, u),
    squash: lerp(a.squash, b.squash, u),
    headPitch: lerp(a.headPitch, b.headPitch, u),
    headYaw: lerp(a.headYaw, b.headYaw, u),
    lean: lerp(a.lean, b.lean, u),
  };
}

/**
 * Sitting on a rim (the seat is a hip point on the top surface, just behind the edge): hips low with the thighs flat
 * on the grass, knees past the edge, shins hanging and dangling forward only (never back into the rim), hands on the
 * thighs, head turned by `look` toward the viewer.
 */
function sitPose(t: number, reduced: boolean, look: number): Pose {
  const swing = reduced ? 0 : 0.15;
  return {
    ...NEUTRAL,
    legL: -1.55,
    legR: -1.55,
    kneeL: 1.3 + swing * Math.sin(t * 1.5),
    kneeR: 1.3 + swing * Math.sin(t * 1.5 + 1.3),
    armL: -0.45,
    armR: -0.45,
    armSpread: 0,
    bodyY: -0.51,
    bodyZ: 0.13,
    lean: 0.06,
    headYaw: look + (reduced ? 0 : 0.3 * Math.sin(t * 0.25)),
  };
}

export function poseFor(
  state: AnimState,
  t: number,
  phase: number,
  k: { standUp: number; reduced: boolean; look?: number },
): Pose {
  const look = k.look ?? 0;
  switch (state) {
    case "idle":
      if (k.reduced) return { ...NEUTRAL };
      return { ...NEUTRAL, bodyY: 0.015 * Math.sin(t * 2), armL: 0.04 * Math.sin(t * 1.6), armR: -0.04 * Math.sin(t * 1.6) };
    case "walk": {
      const s = Math.sin(phase) * 0.6;
      return { ...NEUTRAL, legL: s, legR: -s, armL: -s * 0.8, armR: s * 0.8, bodyY: Math.abs(Math.sin(phase)) * 0.04 };
    }
    case "run": {
      const s = Math.sin(phase);
      return { ...NEUTRAL, legL: s, legR: -s, armL: -s * 1.1, armR: s * 1.1, bodyY: Math.abs(s) * 0.07, lean: 0.18 };
    }
    case "jump":
      return { ...NEUTRAL, legL: -0.5, legR: 0.3, armL: -0.9, armR: -0.9, armSpread: 0.3 };
    case "fall":
      return { ...NEUTRAL, legL: 0.2, legR: -0.2, armL: -0.4, armR: -0.4, armSpread: 0.6 };
    case "land":
      return { ...NEUTRAL, squash: 0.82, bodyY: -0.06, armSpread: 0.25 };
    case "sit":
      return sitPose(t, k.reduced, look);
    case "ride":
      return { ...sitPose(t, true, 0), legL: -1.3, legR: -1.3, kneeL: 1.1, kneeR: 1.1, bodyY: -0.4, bodyZ: 0, headYaw: 0 };
    case "standUp": {
      const s = Math.min(1, Math.max(0, 1 - k.standUp / STAND_UP_SECONDS));
      if (s < 0.55) {
        // phase 1 starts from the live sit pose at the same clock, so the hand-off from "sit" has no pop
        const u = s / 0.55;
        return mix(sitPose(t, k.reduced, look), NEUTRAL, u * u * (3 - 2 * u));
      }
      const u = (s - 0.55) / 0.45;
      const stretch = Math.sin(Math.PI * u);
      return { ...NEUTRAL, armL: -2.9 * stretch, armR: -2.9 * stretch, squash: 1 + 0.04 * stretch, headPitch: -0.25 * stretch };
    }
  }
}
