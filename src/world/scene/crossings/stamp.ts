import type { WorldLayout } from "@/world/engine/gen/layout";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import { blockId } from "@/world/engine/voxel/blocks";
import { bridgeCells, steppingStones } from "./geometry";

/** Invisible collision for bridge decks and stepping stones (their meshes are drawn by the components). */
export function stampCrossings(grid: VoxelGrid, layout: WorldLayout): void {
  const barrier = blockId("barrier");
  const put = (x: number, y: number, z: number) => {
    if (grid.get(x, y, z) === 0) grid.set(x, y, z, barrier);
  };
  for (const c of layout.crossings) {
    if (c.kind !== "bridge") continue;
    for (const cell of bridgeCells(c.a, c.b)) put(cell.x, cell.y, cell.z);
    for (const s of steppingStones(c.a, c.b)) put(s.x, s.y, s.z);
  }
}
