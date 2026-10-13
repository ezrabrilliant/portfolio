import { generateIsland, type IslandShape } from "@/world/engine/gen/islandGen";
import type { IslandPlacement, WorldLayout } from "@/world/engine/gen/layout";
import { mulberry32 } from "@/world/engine/gen/rng";
import { blockId } from "@/world/engine/voxel/blocks";
import { VoxelGrid } from "@/world/engine/voxel/grid";
import { buildBatch, type InstanceBatch } from "@/world/engine/voxel/mesher";

export interface BuiltWorld { grid: VoxelGrid; batches: Record<string, InstanceBatch>; shapes: Record<string, IslandShape> }

function inBox(isl: IslandPlacement, x: number, y: number, z: number): boolean {
  const reach = Math.ceil(isl.radius * 1.25) + 3;
  return Math.abs(x - isl.origin.x) <= reach && Math.abs(z - isl.origin.z) <= reach
    && y >= isl.origin.y - isl.depth - 1 && y <= isl.origin.y + 24;
}

export function buildWorld(layout: WorldLayout, extraStamps: Array<(grid: VoxelGrid) => void> = []): BuiltWorld {
  const grid = new VoxelGrid();
  const shapes: Record<string, IslandShape> = {};
  for (const isl of layout.islands) {
    const shape = generateIsland({ radius: isl.radius, depth: isl.depth, seed: isl.seed });
    shapes[isl.id] = shape;
    for (const c of shape.cells) grid.set(isl.origin.x + c.x, isl.origin.y + c.y, isl.origin.z + c.z, blockId(c.block));
  }
  for (const stamp of extraStamps) stamp(grid);

  const owner = (x: number, y: number, z: number): string | null => {
    let best: string | null = null;
    let bestD = Infinity;
    for (const isl of layout.islands) {
      if (!inBox(isl, x, y, z)) continue;
      const d = Math.hypot(x - isl.origin.x, z - isl.origin.z);
      if (d < bestD) { bestD = d; best = isl.id; }
    }
    return best;
  };

  const batches: Record<string, InstanceBatch> = {};
  for (const isl of layout.islands) {
    batches[isl.id] = buildBatch(grid, (x, y, z) => owner(x, y, z) === isl.id, mulberry32(isl.seed));
  }
  return { grid, batches, shapes };
}
