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

export interface Pose {
  legL: number;
  legR: number;
  armL: number;
  armR: number;
  armSpread: number;
  bodyY: number;
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

const NEUTRAL: Pose = { legL: 0, legR: 0, armL: 0, armR: 0, armSpread: 0.06, bodyY: 0, squash: 1, headPitch: 0, headYaw: 0, lean: 0 };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function sitPose(t: number, reduced: boolean): Pose {
  const swing = reduced ? 0 : 0.22;
  return {
    ...NEUTRAL,
    legL: -0.35 + swing * Math.sin(t * 1.5),
    legR: -0.35 + swing * Math.sin(t * 1.5 + 1.3),
    armL: -0.35,
    armR: -0.35,
    armSpread: 0.12,
    bodyY: -0.55,
    headYaw: reduced ? 0 : 0.4 * Math.sin(t * 0.25),
  };
}

export function poseFor(state: AnimState, t: number, phase: number, k: { standUp: number; reduced: boolean }): Pose {
  switch (state) {
    case "idle":
      return { ...NEUTRAL, bodyY: k.reduced ? 0 : 0.015 * Math.sin(t * 2), armL: 0.04 * Math.sin(t * 1.6), armR: -0.04 * Math.sin(t * 1.6) };
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
      return sitPose(t, k.reduced);
    case "ride":
      return { ...sitPose(t, true), legL: -1.3, legR: -1.3, bodyY: -0.4, headYaw: 0 };
    case "standUp": {
      const s = Math.min(1, Math.max(0, 1 - k.standUp / STAND_UP_SECONDS));
      if (s < 0.55) {
        const u = s / 0.55;
        const sit = sitPose(0, true);
        return { ...NEUTRAL, legL: lerp(sit.legL, 0, u), legR: lerp(sit.legR, 0, u), bodyY: lerp(sit.bodyY, 0, u), armL: lerp(sit.armL, 0, u), armR: lerp(sit.armR, 0, u) };
      }
      const u = (s - 0.55) / 0.45;
      const stretch = Math.sin(Math.PI * u);
      return { ...NEUTRAL, armL: -2.9 * stretch, armR: -2.9 * stretch, squash: 1 + 0.04 * stretch, headPitch: -0.25 * stretch };
    }
  }
}
