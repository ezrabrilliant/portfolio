import type { IsSolid, Vec3 } from "@/world/engine/types";

/** Marches from `from` toward `to`; returns the last free point before a solid block. */
export function pullIn(from: Vec3, to: Vec3, isSolid: IsSolid, step = 0.25): Vec3 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) return { ...to };
  const n = Math.ceil(len / step);
  // runs every frame: track the last free point as scalars (no per-step objects)
  let lx = from.x;
  let ly = from.y;
  let lz = from.z;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const px = from.x + dx * t;
    const py = from.y + dy * t;
    const pz = from.z + dz * t;
    if (isSolid(Math.floor(px), Math.floor(py), Math.floor(pz))) return { x: lx, y: ly, z: lz };
    lx = px;
    ly = py;
    lz = pz;
  }
  return { ...to };
}
