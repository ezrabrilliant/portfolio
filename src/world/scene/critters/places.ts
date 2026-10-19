import { runtime } from "@/world/state/runtime";
import { MONOSUKO } from "@/world/scene/islands/layouts";
import { islandFrame } from "@/world/scene/islands/shared/local";
import type { Vec3 } from "@/world/engine/types";

/** Where the chicken pecks round: a spot by the POS stall's table (world space, at the island's top). */
export function chickenHome(): Vec3 {
  const [fx, fy, fz] = islandFrame(runtime.islandById("pos-monosuko"));
  return { x: fx + MONOSUKO.table.x + 1.0, y: fy, z: fz + MONOSUKO.table.z - 0.9 };
}

/** A bird's post on each bridge: on the near railing post, its flight direction off it, and the way it faces. */
export function birdPerches(): { perch: Vec3; yaw: number; dir: { x: number; z: number } }[] {
  return runtime.layout.crossings
    .filter((c) => c.kind === "bridge")
    .map((c) => {
      const len = Math.hypot(c.b.x - c.a.x, c.b.z - c.a.z) || 1;
      const ux = (c.b.x - c.a.x) / len, uz = (c.b.z - c.a.z) / len;
      return { perch: { x: c.a.x - uz * 1.05, y: c.a.y + 1.64, z: c.a.z + ux * 1.05 }, yaw: Math.atan2(ux, uz), dir: { x: ux * 0.6 - uz * 0.8, z: uz * 0.6 + ux * 0.8 } };
    });
}
