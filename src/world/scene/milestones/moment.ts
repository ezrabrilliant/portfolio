import type { Vec3 } from "@/world/engine/types";

/** Ezra gets the cap the first time he comes this close (horizontally, blocks) to the graduation pillar (spec §7.2). */
export const CAP_RADIUS = 2.5;
/** …and no more than this far above or below its foot (so the GTID deck above or a fall below doesn't count). */
const CAP_DY = 3;

/** Within CAP_RADIUS of the pillar's foot, horizontally, and about level with it. */
export function nearMilestone(feet: Vec3, foot: Vec3, radius = CAP_RADIUS): boolean {
  return Math.hypot(feet.x - foot.x, feet.z - foot.z) <= radius && Math.abs(feet.y - foot.y) < CAP_DY;
}

/** The tour progress moved forward across `at` this frame (prev < 0 means "no previous frame yet"). */
export function crossedForward(prev: number, now: number, at: number): boolean {
  return prev >= 0 && prev < at && now >= at;
}

/** The tour cap toss: up off the pillar top and back down onto it, spinning. */
export const TOSS = { duration: 1.4, height: 2.6, turns: 2 } as const;

/** Pose of the tossed cap `t` seconds in: height above its rest point, yaw spin, a wobble tilt, and whether it landed. */
export function tossPose(t: number): { y: number; spin: number; tilt: number; done: boolean } {
  const k = Math.min(1, Math.max(0, t / TOSS.duration));
  const ease = 1 - (1 - k) * (1 - k);
  return {
    y: 4 * TOSS.height * k * (1 - k),
    spin: ease * TOSS.turns * Math.PI * 2,
    tilt: 0.35 * Math.sin(Math.PI * k),
    done: k >= 1,
  };
}

/** Scale of the cap popping onto Ezra's head `t` seconds after it appears: 0 → a 15 % overshoot → 1 within 0.3 s. */
export function capPopScale(t: number): number {
  if (t <= 0) return 0;
  if (t >= 0.3) return 1;
  const k = t / 0.3;
  const back = 2.2;
  const s = k - 1;
  return 1 + (back + 1) * s * s * s + back * s * s;
}
