import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { TourStop } from "@/world/engine/camera/tourPath";
import { islandFrame } from "./shared/local";

type V = readonly [number, number, number];

/**
 * Camera and look-at offsets from islandFrame(p). Target left of the subject → subject sits centre-right.
 * One shared view (from the front-left, ~10° yaw, ~19° down, ~18.5 blocks): at 1280×720 (fov 40) every island fits
 * with its props, and InfoBoard / Signpost text stays ≥ ~13 px tall. Closer is bigger text but crops the island.
 */
export const FRAMING: Record<string, { cam: V; target: V; dwell: number }> = {
  hero: { cam: [-4.8, 7.3, 16.1], target: [-1.8, 1, -1], dwell: 1.2 },
  gtid: { cam: [-4.8, 7.3, 16.1], target: [-1.8, 1, -1], dwell: 1 },
  "petak-umpet": { cam: [-4.9, 6.4, 16.8], target: [-1.8, 0.5, -1], dwell: 1 },
  "orbit-store": { cam: [-6.7, 6.4, 13.3], target: [-1.5, 1.5, -1], dwell: 1 },
  "ezra-bot": { cam: [-4.8, 6.8, 16.1], target: [-1.8, 0.5, -1], dwell: 1 },
};

export function tourStopFor(p: IslandPlacement): TourStop {
  const f = FRAMING[p.id];
  if (!f) throw new Error(`No framing for island ${p.id}`);
  const [x, y, z] = islandFrame(p);
  return {
    id: p.id,
    camera: { x: x + f.cam[0], y: y + f.cam[1], z: z + f.cam[2] },
    target: { x: x + f.target[0], y: y + f.target[1], z: z + f.target[2] },
    dwell: f.dwell,
  };
}
