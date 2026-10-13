import type { Vec3i } from "@/world/engine/types";
import { blockId, type BlockName } from "@/world/engine/voxel/blocks";
import type { VoxelGrid } from "@/world/engine/voxel/grid";

export interface Blueprint {
  layers: { y: number; rows: string[] }[];
  legend: Record<string, BlockName>;
}

/** Each row is one z line (top row = smallest z), one character per x. '.' and ' ' are air. */
export function stampBlueprint(grid: VoxelGrid, bp: Blueprint, origin: Vec3i): void {
  for (const layer of bp.layers) {
    const width = layer.rows.reduce((m, r) => Math.max(m, r.length), 0);
    const x0 = origin.x - Math.floor(width / 2);
    const z0 = origin.z - Math.floor(layer.rows.length / 2);
    layer.rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === "." || ch === " ") continue;
        const name = bp.legend[ch];
        if (!name) throw new Error(`blueprint: no legend entry for "${ch}"`);
        grid.set(x0 + c, origin.y + layer.y, z0 + r, blockId(name));
      }
    });
  }
}
