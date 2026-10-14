import type { WorldLayout } from "@/world/engine/gen/layout";
import { blockId } from "@/world/engine/voxel/blocks";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import { milestoneCells, milestoneSpotsFor } from "./placement";

/**
 * The milestones in the world grid: each pillar's two barrier rows (its mesh is Milestones.tsx) and the floating
 * stones as real stone blocks, which the nearest island's terrain batch then draws. Runs after the island and crossing
 * stamps and never overwrites a block already there.
 */
export function stampMilestones(grid: VoxelGrid, layout: WorldLayout, years: readonly number[]): void {
  for (const spot of milestoneSpotsFor(layout, years)) {
    for (const c of milestoneCells(spot)) if (grid.get(c.x, c.y, c.z) === 0) grid.set(c.x, c.y, c.z, blockId(c.block));
  }
}
