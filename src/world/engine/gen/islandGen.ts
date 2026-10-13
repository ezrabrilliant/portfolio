import { mulberry32 } from "@/world/engine/gen/rng";
import type { BlockName } from "@/world/engine/voxel/blocks";

export interface IslandSpec { radius: number; depth: number; seed: number }
export interface IslandShape {
  cells: Array<{ x: number; y: number; z: number; block: BlockName }>;
  surface: (x: number, z: number) => number | null;
}

/** Floating island: wobbly round grass top (y = 0), earth rim, stone underside tapering to y = -depth. */
export function generateIsland(spec: IslandSpec): IslandShape {
  const { radius: R, depth, seed } = spec;
  const r = mulberry32(seed);
  const a1 = r() * Math.PI * 2;
  const a2 = r() * Math.PI * 2;
  const noise = (x: number, z: number) => {
    const v = Math.sin(x * 12.9898 + z * 78.233 + seed * 3.17) * 43758.5453;
    return v - Math.floor(v);
  };
  const cells: IslandShape["cells"] = [];
  const top = new Set<string>();
  const N = Math.ceil(R * 1.25) + 1;
  for (let x = -N; x <= N; x++) {
    for (let z = -N; z <= N; z++) {
      const d = Math.hypot(x, z);
      const ang = Math.atan2(z, x);
      const rad = R * (1 + 0.13 * Math.sin(ang * 3 + a1) + 0.07 * Math.sin(ang * 5 + a2));
      if (d > rad) continue;
      cells.push({ x, y: 0, z, block: "grass" });
      top.add(`${x},${z}`);
      if (d <= rad - 0.3) cells.push({ x, y: -1, z, block: "earth" });
      if (d <= rad - 0.9) cells.push({ x, y: -2, z, block: "earth" });
      for (let y = -3; y >= -depth; y--) {
        const k = (-y - 2) / (depth - 1);
        const rs = (rad - 0.9) * Math.pow(1 - k, 0.8) + (noise(x + y * 5, z - y * 3) - 0.5) * 1.2;
        if (d <= rs) cells.push({ x, y, z, block: y > -4 && noise(x, z + y) > 0.72 ? "earth" : "stone" });
      }
    }
  }
  return { cells, surface: (x, z) => (top.has(`${x},${z}`) ? 0 : null) };
}
