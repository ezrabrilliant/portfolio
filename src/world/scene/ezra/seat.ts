import type { IslandShape } from "@/world/engine/gen/islandGen";
import type { Vec3, Vec3i } from "@/world/engine/types";

/** Finds the rim cell of an island in `dir` and returns a seat on its outer face, facing outward. */
export function findSeat(shape: IslandShape, origin: Vec3i, dir: { x: number; z: number }): { pos: Vec3; heading: number } {
  const l = Math.hypot(dir.x, dir.z) || 1;
  const ux = dir.x / l;
  const uz = dir.z / l;
  let cx = 0;
  let cz = 0;
  let surf = shape.surface(0, 0) ?? 0;
  for (let d = 0.5; d < 64; d += 0.5) {
    const x = Math.round(ux * d);
    const z = Math.round(uz * d);
    const s = shape.surface(x, z);
    if (s === null) break;
    cx = x;
    cz = z;
    surf = s;
  }
  // seat on the cell's outer face: cell centre + half a block outward
  return {
    pos: { x: origin.x + cx + 0.5 + ux * 0.5, y: origin.y + surf + 1, z: origin.z + cz + 0.5 + uz * 0.5 },
    heading: Math.atan2(ux, uz),
  };
}
