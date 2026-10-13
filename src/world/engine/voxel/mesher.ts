import { hexToRgb } from "@/world/engine/color";
import type { Rng } from "@/world/engine/gen/rng";
import { blockDef } from "@/world/engine/voxel/blocks";
import type { VoxelGrid } from "@/world/engine/voxel/grid";

export interface InstanceBatch { count: number; positions: Float32Array; colors: Float32Array }

const NEIGHBOURS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];
const JITTER = 0.08;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function buildBatch(grid: VoxelGrid, filter: (x: number, y: number, z: number) => boolean, rng: Rng): InstanceBatch {
  const positions: number[] = [];
  const colors: number[] = [];
  grid.forEach((x, y, z, id) => {
    const def = blockDef(id);
    if (!def || !def.visible || !filter(x, y, z)) return;
    let exposed = false;
    for (const [dx, dy, dz] of NEIGHBOURS) {
      const n = blockDef(grid.get(x + dx, y + dy, z + dz));
      if (!n || !n.visible) { exposed = true; break; }
    }
    if (!exposed) return;
    positions.push(x + 0.5, y + 0.5, z + 0.5);
    const [r, g, b] = hexToRgb(def.colors[Math.floor(rng() * def.colors.length)]);
    const k = 1 + (rng() - 0.5) * JITTER;
    colors.push(clamp01(r * k), clamp01(g * k), clamp01(b * k));
  });
  return { count: positions.length / 3, positions: new Float32Array(positions), colors: new Float32Array(colors) };
}
