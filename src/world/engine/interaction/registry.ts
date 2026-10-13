import type { Vec3 } from "@/world/engine/types";

export interface Interactable {
  id: string; island: string; label: string; position: Vec3;
  hitbox: { min: Vec3; max: Vec3 }; radius: number;
  onActivate: () => void; enabled?: () => boolean;
}

export interface InteractionRegistry {
  register(item: Interactable): () => void;
  all(): Interactable[];
  get(id: string): Interactable | undefined;
  nearest(pos: Vec3, facing: Vec3): Interactable | null;
  raycast(origin: Vec3, dir: Vec3): Interactable | null;
  onIsland(island: string): Interactable[];
}

const AXES = ["x", "y", "z"] as const;
const isEnabled = (i: Interactable) => (i.enabled ? i.enabled() : true);

function rayBox(o: Vec3, d: Vec3, min: Vec3, max: Vec3): number | null {
  let tmin = 0, tmax = Infinity;
  for (const a of AXES) {
    if (Math.abs(d[a]) < 1e-12) {
      if (o[a] < min[a] || o[a] > max[a]) return null;
      continue;
    }
    const inv = 1 / d[a];
    let t1 = (min[a] - o[a]) * inv, t2 = (max[a] - o[a]) * inv;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin;
}

export function createRegistry(): InteractionRegistry {
  const items = new Map<string, Interactable>();
  return {
    register(item) {
      items.set(item.id, item);
      return () => { if (items.get(item.id) === item) items.delete(item.id); };
    },
    all: () => [...items.values()],
    get: (id) => items.get(id),
    onIsland: (island) => [...items.values()].filter((i) => i.island === island),
    nearest(pos, facing) {
      const fl = Math.hypot(facing.x, facing.z) || 1;
      const fx = facing.x / fl, fz = facing.z / fl;
      let best: Interactable | null = null, bestD = Infinity;
      for (const it of items.values()) {
        if (!isEnabled(it)) continue;
        const dx = it.position.x - pos.x, dy = it.position.y - pos.y, dz = it.position.z - pos.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist > it.radius) continue;
        const hd = Math.hypot(dx, dz);
        if (hd > 0.3 && (dx * fx + dz * fz) / hd < 0.2) continue;
        if (dist < bestD) { bestD = dist; best = it; }
      }
      return best;
    },
    raycast(origin, dir) {
      let best: Interactable | null = null, bestT = Infinity;
      for (const it of items.values()) {
        if (!isEnabled(it)) continue;
        const t = rayBox(origin, dir, it.hitbox.min, it.hitbox.max);
        if (t !== null && t < bestT) { bestT = t; best = it; }
      }
      return best;
    },
  };
}
