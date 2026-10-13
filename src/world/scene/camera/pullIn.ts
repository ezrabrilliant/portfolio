import type { IsSolid, Vec3 } from "@/world/engine/types";

function solidAt(isSolid: IsSolid, from: Vec3, dx: number, dy: number, dz: number, t: number): boolean {
  return isSolid(Math.floor(from.x + dx * t), Math.floor(from.y + dy * t), Math.floor(from.z + dz * t));
}

/**
 * Marches from `from` toward `to`; on hitting a solid block, refines the exact face crossing and returns
 * the point `backOff` before it (never behind `from`). The stop point does not depend on the ray length,
 * so a camera re-clamped every frame does not jitter, and the back-off keeps the near plane off the face.
 */
export function pullIn(from: Vec3, to: Vec3, isSolid: IsSolid, step = 0.25, backOff = 0.25): Vec3 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) return { ...to };
  const n = Math.ceil(len / step);
  let free = 0;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (solidAt(isSolid, from, dx, dy, dz, t)) {
      let hit = t;
      for (let k = 0; k < 10; k++) {
        const mid = (free + hit) / 2;
        if (solidAt(isSolid, from, dx, dy, dz, mid)) hit = mid;
        else free = mid;
      }
      const u = Math.max(0, free - backOff / len);
      return { x: from.x + dx * u, y: from.y + dy * u, z: from.z + dz * u };
    }
    free = t;
  }
  return { ...to };
}
