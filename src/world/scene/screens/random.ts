import { mulberry32 } from "@/world/engine/gen/rng";

/** mulberry32's per-draw increment: mulberry32(seed + STEP) continues mulberry32(seed) after one draw. */
const STEP = 0x6d2b79f5;

/**
 * One draw from a seeded stream whose whole state is a number (so screen states stay plain, immutable data):
 * the value in [0, 1) and the seed for the next draw.
 */
export function stepRandom(seed: number): { value: number; seed: number } {
  return { value: mulberry32(seed)(), seed: (seed + STEP) >>> 0 };
}
