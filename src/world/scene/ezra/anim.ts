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

/**
 * Leg rig shared by the model (Ezra.tsx) and the rim-clearance tests, in blocks: hip pivot above the feet (and its
 * side offset), knee pivot below the hip, and the shin's outline below the knee (sole bottom, heel, toe).
 */
export const LEG = { hipY: 0.62, hipX: 0.12, knee: 0.28, shin: 0.34, back: -0.115, toe: 0.195 } as const;

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
/** Peak extra hip height while standing up from the rim (phase 1). */
const STAND_LIFT = 0.12;

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
      // rising: one knee up, arms swung up and out
      return { ...NEUTRAL, legL: -0.7, legR: 0.25, kneeL: 0.9, kneeR: 0.2, armL: -2.2, armR: -1.6, armSpread: 0.35 };
    case "fall":
      // falling: legs reaching down for the ground, arms out for balance
      return { ...NEUTRAL, legL: -0.15, legR: 0.15, kneeL: 0.25, kneeR: 0.25, armL: -1.1, armR: -1.1, armSpread: 0.75 };
    case "land":
      // touch-down: knees give, body squashed low, arms dropping (the pose blend springs him back up)
      return { ...NEUTRAL, legL: -0.35, legR: -0.35, kneeL: 0.7, kneeR: 0.7, squash: 0.84, bodyY: -0.08, armSpread: 0.35, lean: 0.12 };
    case "sit":
      return sitPose(t, k.reduced, look);
    case "ride":
      return { ...sitPose(t, true, 0), legL: -1.3, legR: -1.3, kneeL: 1.1, kneeR: 1.1, bodyY: -0.4, bodyZ: 0, headYaw: 0 };
    case "standUp": {
      const s = Math.min(1, Math.max(0, 1 - k.standUp / STAND_UP_SECONDS));
      if (s < 0.55) {
        // phase 1 starts from the live sit pose at the same clock, so the hand-off from "sit" has no pop. The hips
        // rise ahead of the leg fold (ease-out) on a small arc, so the feet come up over the rim, not through it
        const u = s / 0.55;
        const sit = sitPose(t, k.reduced, look);
        const pose = mix(sit, NEUTRAL, u * u * (3 - 2 * u));
        pose.bodyY = sit.bodyY * (1 - u) * (1 - u) + STAND_LIFT * Math.sin(Math.PI * u);
        return pose;
      }
      const u = (s - 0.55) / 0.45;
      const stretch = Math.sin(Math.PI * u);
      return { ...NEUTRAL, armL: -2.9 * stretch, armR: -2.9 * stretch, squash: 1 + 0.04 * stretch, headPitch: -0.25 * stretch };
    }
  }
}

/** How fast the model catches up after a step up (per second, exponential): about 0.1 s to close nine tenths. */
export const STEP_CATCH_UP = 24;

/** The step-up offset (≤ 0) one frame later: eased out toward 0, snapped there once it is under a millimetre. */
export function stepEase(offset: number, dt: number, reduced: boolean): number {
  if (reduced) return 0;
  const next = offset * Math.exp(-STEP_CATCH_UP * dt);
  return next > -1e-3 ? 0 : next;
}

/**
 * A step up's knee tuck on top of any pose: while the model still catches up (offset < 0) the legs fold as in a quick
 * hop, so the feet lift over the block's edge instead of sinking through it.
 */
export function withStepTuck(p: Pose, offset: number): Pose {
  const k = Math.min(1, Math.max(0, -offset));
  if (k === 0) return p;
  return { ...p, legL: p.legL - 0.9 * k, legR: p.legR - 0.6 * k, kneeL: p.kneeL + 1.3 * k, kneeR: p.kneeR + 1.0 * k, armSpread: p.armSpread + 0.2 * k };
}

/** Seconds the take-off stretch lasts after a jump starts. */
export const TAKEOFF_S = 0.16;

/** The jump's take-off stretch: up to 6 % taller right at the push-off, gone by TAKEOFF_S. */
export function takeoffStretch(airTime: number, reduced: boolean): number {
  if (reduced || airTime >= TAKEOFF_S) return 1;
  return 1 + 0.06 * (1 - airTime / TAKEOFF_S);
}

/** Rate (per second) the drawn pose eases toward the state's pose: states blend instead of snapping. */
export const POSE_BLEND = 16;

/** Eases `cur` toward `target` in place (the walk and run cycles still read through: 16/s follows a stride closely). */
export function blendPose(cur: Pose, target: Pose, dt: number): Pose {
  const u = 1 - Math.exp(-POSE_BLEND * dt);
  const out = mix(cur, target, u);
  Object.assign(cur, out);
  return cur;
}

/** A fresh copy of the neutral pose (the blend's starting point). */
export function neutralPose(): Pose {
  return { ...NEUTRAL };
}
