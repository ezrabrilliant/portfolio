import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { Vec3 } from "@/world/engine/types";
import { islandFrame } from "@/world/scene/islands/shared/local";

/**
 * Hidden gold blocks (polish #11): one per island, island-local (y = its centre's height over the grass), each tucked
 * where you have to look: behind a building, on a crate, behind a counter, behind the monitor. layouts.test-style checks
 * (gold.test) keep every one on its island's grass and reachable.
 */
export const GOLD_SPOTS: Record<string, Vec3> = {
  hero: { x: -2.5, y: 0.45, z: -2.5 },
  gtid: { x: 3.5, y: 0.45, z: -3.5 },
  "petak-umpet": { x: -1.5, y: 0.45, z: -3.4 },
  "orbit-store": { x: 2.9, y: 1.2, z: -0.6 },
  "ezra-bot": { x: -1.2, y: 0.45, z: -1.3 },
  "web-plaza": { x: -2.5, y: 0.45, z: -1 },
  "pos-monosuko": { x: 0.3, y: 0.45, z: -1.75 },
  "bee-furniture-crm": { x: 3, y: 0.45, z: -1.5 },
  pedulipasal: { x: 1.0, y: 0.45, z: -0.25 },
};

export const GOLD_TOTAL = Object.keys(GOLD_SPOTS).length;

/** How near Ezra's feet must come (horizontally, and within this height) to pick one up. */
export const GOLD_REACH = { across: 0.8, up: 1.6 } as const;

/** The gold blocks in world space, for the islands this layout has. */
export function goldInWorld(islands: readonly IslandPlacement[]): { id: string; pos: Vec3 }[] {
  return islands.flatMap((p) => {
    const s = GOLD_SPOTS[p.id];
    if (!s) return [];
    const [fx, fy, fz] = islandFrame(p);
    return [{ id: p.id, pos: { x: fx + s.x, y: fy + s.y, z: fz + s.z } }];
  });
}

/** Is a gold block at `gold` in Ezra's reach (feet at `feet`)? */
export function goldInReach(gold: Vec3, feet: Vec3): boolean {
  return Math.hypot(gold.x - feet.x, gold.z - feet.z) <= GOLD_REACH.across && gold.y - feet.y >= -0.6 && gold.y - feet.y <= GOLD_REACH.up;
}
