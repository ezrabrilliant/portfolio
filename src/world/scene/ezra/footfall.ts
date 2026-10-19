import type { BlockName } from "@/world/engine/voxel/blocks";

/** What Ezra's feet are on: it picks the puff his steps and landings kick up, and the step sound. */
export type Surface = "grass" | "wood" | "stone";

/** The surface a block is: grass and earth (and leaves) are grass; planks, logs, crates and roofs wood; the rest stone. */
export function surfaceOfBlock(name: BlockName | undefined): Surface {
  if (name === "grass" || name === "earth" || name === "leaf") return "grass";
  if (name === "plank" || name === "wood" || name === "crate" || name === "roof") return "wood";
  return "stone";
}

/** Footfalls happen twice per stride: when the walk cycle's phase crosses a multiple of π. */
export function footfalls(prevPhase: number, phase: number): number {
  return Math.max(0, Math.floor(phase / Math.PI) - Math.floor(prevPhase / Math.PI));
}

/**
 * A landing's dust ring, from how far he fell: none for a step down, then more and faster puffs the higher the drop
 * (capped), so a jump off a roof reads bigger than a hop.
 */
export function landingRing(drop: number): { count: number; speed: number } | null {
  if (drop < 0.6) return null;
  return { count: Math.min(22, Math.round(8 + drop * 3)), speed: Math.min(2.2, 1 + drop * 0.25) };
}

/** Seconds between the little puffs behind his feet while he runs. */
export const RUN_TRAIL_EVERY = 0.07;

/**
 * How a landing sounds from how far he fell: louder and a little lower the higher the drop, and past three blocks a
 * deep thump under it (`heavy`, its loudness 0..1).
 */
export function landingWeight(drop: number): { volume: number; rate: number; heavy: number } {
  const k = Math.max(0, Math.min(1, drop / 8));
  return { volume: 0.55 + 0.45 * k, rate: 1.08 - 0.2 * k, heavy: drop >= 3 ? Math.min(1, (drop - 2) / 6) : 0 };
}

/** The rush of air while he falls (0..1): nothing at a jump's top speed, full in a long drop. */
export function fallWind(vy: number): number {
  return Math.max(0, Math.min(1, (-vy - 6) / 14));
}
