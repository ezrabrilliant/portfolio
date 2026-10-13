import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { Vec3 } from "@/world/engine/types";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import { blockId, type BlockName } from "@/world/engine/voxel/blocks";

/** Island-local cell: x/z in blocks from the centre column, y = row above the grass top (0 = first row). */
export type Cell = readonly [number, number, number];
export type Tuple3 = [number, number, number];

/** World position of local (0,0,0): centre of the island's centre column, on the walkable surface. */
export function islandFrame(p: IslandPlacement): Tuple3 {
  return [p.origin.x + 0.5, p.origin.y + 1, p.origin.z + 0.5];
}

export function worldOf(p: IslandPlacement, lx: number, ly: number, lz: number): Vec3 {
  const [fx, fy, fz] = islandFrame(p);
  return { x: fx + lx, y: fy + ly, z: fz + lz };
}

export function worldTuple(p: IslandPlacement, lx: number, ly: number, lz: number): Tuple3 {
  const v = worldOf(p, lx, ly, lz);
  return [v.x, v.y, v.z];
}

/** Inclusive integer box of cells. */
export function boxCells(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Cell[] {
  const out: Cell[] = [];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) out.push([x, y, z]);
  return out;
}

/** A thin post at a fractional position occupies the nearest column, `height` rows tall. */
export function postCells(x: number, z: number, height = 2): Cell[] {
  const cx = Math.round(x);
  const cz = Math.round(z);
  return boxCells(cx, cx, 0, height - 1, cz, cz);
}

/** Writes solid cells into the world grid (default: invisible "barrier"). */
export function stampCells(grid: VoxelGrid, p: IslandPlacement, cells: readonly Cell[], block: BlockName = "barrier"): void {
  const id = blockId(block);
  for (const [lx, ly, lz] of cells) grid.set(p.origin.x + lx, p.origin.y + 1 + ly, p.origin.z + lz, id);
}
