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
