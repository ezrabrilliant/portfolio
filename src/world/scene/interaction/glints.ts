import type { Interactable } from "@/world/engine/interaction/registry";
import type { Vec3 } from "@/world/engine/types";

/**
 * Glints on what can be used (polish #8): in Play, the few usable things nearest Ezra (within GLINT.near) shed a slow
 * square glint now and then, brighter (more often) once in reach; in the tour, the one under the mouse (phones: what can
 * be tapped on the island in view, now and then).
 */
export const GLINT = { near: 5, max: 3, every: 0.45, inReachEvery: 0.18, touchTourEvery: 2.5 } as const;

/** The usable things that glint this frame in Play: the GLINT.max nearest within GLINT.near of Ezra's chest. */
export function glinting(items: readonly Interactable[], feet: Vec3): { item: Interactable; dist: number }[] {
  const out: { item: Interactable; dist: number }[] = [];
  for (const it of items) {
    if (it.enabled && !it.enabled()) continue;
    const d = Math.hypot(it.position.x - feet.x, it.position.y - (feet.y + 0.9), it.position.z - feet.z);
    if (d <= GLINT.near) out.push({ item: it, dist: d });
  }
  return out.sort((a, b) => a.dist - b.dist).slice(0, GLINT.max);
}

/** A point on the item's hitbox to shed a glint from: somewhere over its top half (`r` three numbers in [0, 1)). */
export function glintPoint(it: Interactable, r: readonly [number, number, number]): Vec3 {
  const { min, max } = it.hitbox;
  return {
    x: min.x + (max.x - min.x) * r[0],
    y: min.y + (max.y - min.y) * (0.5 + 0.5 * r[1]),
    z: min.z + (max.z - min.z) * r[2],
  };
}
