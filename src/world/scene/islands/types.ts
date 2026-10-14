import type { FC } from "react";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import type { TourStop } from "@/world/engine/camera/tourPath";
import type { Vec3 } from "@/world/engine/types";

/** A hand-built island: its props (Component), its collision (stamp) and its tour framing (tourStop). */
export interface IslandModule {
  id: string;
  Component: FC<{ placement: IslandPlacement }>;
  stamp?: (grid: VoxelGrid, placement: IslandPlacement) => void;
  tourStop: (placement: IslandPlacement) => TourStop;
}

/** Heading of every tour camera (looks toward +x, −z); ≈ (0.582, −0.813), derived from one angle so it is exactly unit length. */
const VIEW_YAW = Math.atan2(0.582, -0.813);

/** Horizontal forward of every tour camera and its right vector (unit length, perpendicular). */
export const VIEW_F = { x: Math.sin(VIEW_YAW), z: Math.cos(VIEW_YAW) };
export const VIEW_R = { x: -VIEW_F.z, z: VIEW_F.x };

export function islandTop(p: IslandPlacement): Vec3 {
  return { x: p.origin.x + 0.5, y: p.origin.y + 1, z: p.origin.z + 0.5 };
}

export function defaultTourStop(
  p: IslandPlacement,
  opts: { distance?: number; height?: number; shift?: number; dwell?: number } = {},
): TourStop {
  const { distance = 26, height = 12, shift = 3.5, dwell = 1 } = opts;
  const top = islandTop(p);
  // aim left of the island so it sits right of centre, leaving the bottom-left calm
  const target = { x: top.x - VIEW_R.x * shift, y: top.y + 1.5, z: top.z - VIEW_R.z * shift };
  const camera = {
    x: target.x - VIEW_F.x * distance,
    y: target.y + height,
    z: target.z - VIEW_F.z * distance,
  };
  return { id: p.id, camera, target, dwell };
}
