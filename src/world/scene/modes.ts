import type { TourStop } from "@/world/engine/camera/tourPath";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { IsSolid, Vec3 } from "@/world/engine/types";

export type EnterKind = "standUp" | "drop";

export function enterKind(activeIsland: string, seated: boolean): EnterKind {
  return seated && activeIsland === "hero" ? "standUp" : "drop";
}

/** Feet height of the drop start above the island's grass row. */
const DROP = 16;

/** Ezra falls from 15 blocks above the island's surface: over its centre column, or over `column` (see landingColumn). */
export function dropStart(p: IslandPlacement, column?: { x: number; z: number }): Vec3 {
  return { x: column?.x ?? p.origin.x + 0.5, y: p.origin.y + DROP, z: column?.z ?? p.origin.z + 0.5 };
}

/**
 * Where a drop onto island `p` lands: the centre of the cell nearest `aim` with grass floor under it and its four
 * neighbours (no rim landings) and nothing solid from the floor up past the drop start, so Ezra falls past no prop
 * and stands on open ground. Falls back to the centre column if no cell qualifies.
 */
export function landingColumn(isSolid: IsSolid, p: IslandPlacement, aim: { x: number; z: number }): { x: number; z: number } {
  const { x: ox, y: floor, z: oz } = p.origin;
  const reach = Math.ceil(p.radius * 1.25) + 1; // the island generator's extent
  let best = { x: ox + 0.5, z: oz + 0.5 };
  let bestD = Infinity;
  for (let x = ox - reach; x <= ox + reach; x++) {
    for (let z = oz - reach; z <= oz + reach; z++) {
      const d = (x + 0.5 - aim.x) ** 2 + (z + 0.5 - aim.z) ** 2;
      if (d >= bestD) continue;
      if (!isSolid(x, floor, z) || !isSolid(x + 1, floor, z) || !isSolid(x - 1, floor, z) || !isSolid(x, floor, z + 1) || !isSolid(x, floor, z - 1)) continue;
      let clear = true;
      for (let y = floor + 1; clear && y <= floor + DROP + 2; y++) clear = !isSolid(x, y, z);
      if (!clear) continue;
      best = { x: x + 0.5, z: z + 0.5 };
      bestD = d;
    }
  }
  return best;
}

/**
 * Where a tour camera would watch `pos` from: the camera of the stop whose look target is nearest, moved by `pos`'s
 * offset from that target. Feed it to nearestTrackProgress to resume the tour framed on Ezra (his own position finds
 * the nearest camera, which is often a crossing camera of the next leg, since stop cameras sit ~30 blocks back).
 */
export function watchPoint(stops: readonly TourStop[], pos: Vec3): Vec3 {
  let s = stops[0];
  let bestD = Infinity;
  for (const stop of stops) {
    const d = (stop.target.x - pos.x) ** 2 + (stop.target.z - pos.z) ** 2;
    if (d < bestD) {
      bestD = d;
      s = stop;
    }
  }
  return { x: s.camera.x + pos.x - s.target.x, y: s.camera.y + pos.y - s.target.y, z: s.camera.z + pos.z - s.target.z };
}
