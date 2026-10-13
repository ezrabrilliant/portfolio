import type { IslandShape } from "@/world/engine/gen/islandGen";
import type { Vec3, Vec3i } from "@/world/engine/types";

/** How far behind the rim face the seat (Ezra's hip point) sits, so his thighs rest on the top and knees reach the edge. */
export const SEAT_INSET = 0.28;

/** Cells searched around the rim point, and how much closer a cell must be to beat one on a straight ledge. */
const SEARCH = 4;
const CORNER_PENALTY = 3;

/**
 * Seat on an island's rim toward `dir`. The facing snaps to the dominant axis of `dir` so the edge under both knees is
 * one straight block face (not a staircase corner); the seat cell is the one nearest the rim point toward `dir` whose
 * face on that axis is open, preferring a straight ledge (both side neighbours open the same way). Returns a point on
 * the walkable top SEAT_INSET behind that face, facing out across it.
 */
export function findSeat(shape: IslandShape, origin: Vec3i, dir: { x: number; z: number }): { pos: Vec3; heading: number } {
  const l = Math.hypot(dir.x, dir.z) || 1;
  const ux = dir.x / l;
  const uz = dir.z / l;
  // the rim point toward dir: last top cell along the ray from the centre column
  let rx = 0;
  let rz = 0;
  for (let d = 0.5; d < 64; d += 0.5) {
    const x = Math.round(ux * d);
    const z = Math.round(uz * d);
    if (shape.surface(x, z) === null) break;
    rx = x;
    rz = z;
  }
  const alongX = Math.abs(ux) >= Math.abs(uz);
  const ax = alongX ? Math.sign(ux) || 1 : 0;
  const az = alongX ? 0 : Math.sign(uz);
  const open = (x: number, z: number) => shape.surface(x, z) !== null && shape.surface(x + ax, z + az) === null;
  const level = (x: number, z: number, s: number | null) => open(x, z) && shape.surface(x, z) === s;

  let cx = rx;
  let cz = rz;
  let best = Infinity;
  for (let dz = -SEARCH; dz <= SEARCH; dz++) {
    for (let dx = -SEARCH; dx <= SEARCH; dx++) {
      const x = rx + dx;
      const z = rz + dz;
      if (!open(x, z)) continue;
      const s = shape.surface(x, z);
      const straight = level(x + az, z + ax, s) && level(x - az, z - ax, s);
      const score = Math.hypot(dx, dz) + (straight ? 0 : CORNER_PENALTY);
      if (score < best) {
        best = score;
        cx = x;
        cz = z;
      }
    }
  }
  if (best === Infinity) {
    // no open face near the rim point: walk the axis from the centre column to its last top cell
    cx = 0;
    cz = 0;
    for (let i = 0; i < 64 && shape.surface(cx + ax, cz + az) !== null; i++) {
      cx += ax;
      cz += az;
    }
  }
  const surf = shape.surface(cx, cz) ?? 0;
  // cell centre → its outer face (+0.5) → back onto the top by SEAT_INSET
  const out = 0.5 - SEAT_INSET;
  return {
    pos: { x: origin.x + cx + 0.5 + ax * out, y: origin.y + surf + 1, z: origin.z + cz + 0.5 + az * out },
    heading: Math.atan2(ax, az),
  };
}
