import { buildTourPath } from "@/world/engine/camera/tourPath";
import type { TourPath, TourStop } from "@/world/engine/camera/tourPath";
import type { IslandPlacement, WorldLayout } from "@/world/engine/gen/layout";
import type { Vec3 } from "@/world/engine/types";
import { portraitStop } from "../islands/framing";
import { tourVia } from "./tourMath";

/** Half-width of the band around a square aspect in which the current class holds. */
const ASPECT_BAND = 0.05;

/**
 * The aspect class the tour is framed for: portrait screens (narrower than tall) get the portrait stops. Given the
 * current class (`was`), it only flips once the aspect is clearly past square (outside 1 ± ASPECT_BAND), so a
 * window dragged across square doesn't rebuild the tour back and forth.
 */
export function isPortrait(width: number, height: number, was?: boolean): boolean {
  const aspect = width / height;
  if (was === true) return aspect < 1 + ASPECT_BAND;
  if (was === false) return aspect < 1 - ASPECT_BAND;
  return aspect < 1;
}

/**
 * The scroll tour's path. Landscape: each island's own stop (`stopOf`) and the crossing vias (`tourVia`).
 * Portrait: every stop re-framed by `portraitStop` (island centred, pulled back until it fits a tall screen).
 * Each via moves with its leg's stops: by the two stop cameras' displacements, blended by where the via lies
 * between them. The flight keeps its landscape shape (no doubling back), just further out. Dwell weights are
 * unchanged, so a stop has the same scroll progress in both.
 */
export function buildTour(layout: WorldLayout, stopOf: (p: IslandPlacement) => TourStop, portrait: boolean): TourPath {
  const islands = layout.tourOrder.map((id) => {
    const p = layout.islands.find((i) => i.id === id);
    if (!p) throw new Error(`No island ${id} in the layout`);
    return p;
  });
  const base = islands.map(stopOf);
  const via = tourVia(layout);
  if (!portrait) return buildTourPath(base, via);
  const stops = base.map((s, i) => portraitStop(islands[i], s));
  const moved = via.map((vs, i) => {
    const a = base[i].camera, b = base[i + 1].camera;
    const da = sub(stops[i].camera, a), db = sub(stops[i + 1].camera, b);
    const ab = sub(b, a);
    const len2 = ab.x * ab.x + ab.y * ab.y + ab.z * ab.z || 1;
    return vs.map((v) => {
      const t = Math.min(1, Math.max(0, ((v.x - a.x) * ab.x + (v.y - a.y) * ab.y + (v.z - a.z) * ab.z) / len2));
      return { x: v.x + da.x + (db.x - da.x) * t, y: v.y + da.y + (db.y - da.y) * t, z: v.z + da.z + (db.z - da.z) * t };
    });
  });
  return buildTourPath(stops, moved);
}

const sub = (p: Vec3, q: Vec3): Vec3 => ({ x: p.x - q.x, y: p.y - q.y, z: p.z - q.z });
