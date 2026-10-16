import type { Vec3 } from "@/world/engine/types";

/**
 * The small creatures that live on the islands (polish #3): butterflies over the grass, birds on the bridge posts that
 * take off when Ezra comes near, a chicken pecking at the POS stall and a cat asleep on Orbit's crates. Pure motion here
 * (tested); Critters.tsx draws them.
 */

/** A butterfly's position at time t: a slow figure of eight over its anchor, bobbing as it goes. */
export function butterflyAt(anchor: Vec3, phase: number, t: number, out: Vec3): Vec3 {
  out.x = anchor.x + 1.3 * Math.sin(0.55 * t + phase);
  out.z = anchor.z + 0.9 * Math.sin(1.1 * t + phase * 2);
  out.y = anchor.y + 0.9 + 0.35 * Math.sin(1.7 * t + phase * 3) + 0.08 * Math.sin(9 * t + phase);
  return out;
}

/** A butterfly's wing angle (radians, each wing mirrored): a quick flutter. */
export function wingFlap(t: number, phase: number): number {
  return 0.25 + 0.9 * Math.abs(Math.sin(14 * t + phase));
}

export type BirdMode = "perch" | "away" | "back";
export interface Bird { mode: BirdMode; t: number }

/** How near Ezra may come before a bird takes off, how far he must be for it to come back, and the timings (s). */
export const BIRD = { scare: 3.2, calm: 7, flight: 2.4, gone: 14 } as const;

export function createBird(): Bird {
  return { mode: "perch", t: 0 };
}

/** One step of a bird: perched until Ezra is near, then away; back to its post once he is gone a while. */
export function stepBird(b: Bird, ezraDist: number, dt: number): void {
  b.t += dt;
  if (b.mode === "perch" && ezraDist < BIRD.scare) {
    b.mode = "away";
    b.t = 0;
  } else if (b.mode === "away" && b.t >= BIRD.gone && ezraDist > BIRD.calm) {
    b.mode = "back";
    b.t = 0;
  } else if (b.mode === "back" && b.t >= BIRD.flight) {
    b.mode = "perch";
    b.t = 0;
  }
}

/**
 * Where a bird is relative to its perch (`out`), and whether it shows: flying off along `dir` (unit, horizontal) and up
 * over BIRD.flight seconds, then gone; coming back the same way reversed.
 */
export function birdOffset(b: Bird, dir: { x: number; z: number }, out: Vec3): boolean {
  let u: number;
  if (b.mode === "perch") u = 0;
  else if (b.mode === "away") u = Math.min(1, b.t / BIRD.flight);
  else u = 1 - Math.min(1, b.t / BIRD.flight);
  const d = 9 * u * u + 2 * u;
  out.x = dir.x * d;
  out.z = dir.z * d;
  out.y = 5 * u * u + 1.2 * Math.sin(Math.PI * u);
  return u < 1;
}

/** The chicken's walk: a slow wander round its spot (radius r) that stops now and then to peck. */
export function chickenAt(t: number, r: number): { x: number; z: number; heading: number; pecking: boolean } {
  // 4 s cycles: walk 2.4 s, peck 1.6 s
  const cycle = Math.floor(t / 4);
  const inCycle = t - cycle * 4;
  const walk = Math.min(inCycle, 2.4);
  const s = cycle * 2.4 + walk;
  const a = 0.45 * s + 0.8 * Math.sin(0.23 * s);
  const x = r * Math.cos(a), z = r * Math.sin(a);
  // heading along the path (derivative of the angle is positive): tangent of the circle
  const heading = Math.atan2(-Math.sin(a), Math.cos(a));
  return { x, z, heading, pecking: inCycle > 2.4 };
}
