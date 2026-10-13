import type { Vec3 } from "@/world/engine/types";

/** Launch velocity that passes the apex (max(from.y, to.y) + apexAbove) and lands exactly on `to`. */
export function solveLaunch(from: Vec3, to: Vec3, gravity: number, apexAbove: number): { vel: Vec3; time: number } {
  const apex = Math.max(from.y, to.y) + Math.max(apexAbove, 0.01);
  const vy = Math.sqrt(2 * gravity * (apex - from.y));
  const tUp = vy / gravity;
  const tDown = Math.sqrt((2 * (apex - to.y)) / gravity);
  const time = tUp + tDown;
  return { vel: { x: (to.x - from.x) / time, y: vy, z: (to.z - from.z) / time }, time };
}

export function positionAt(from: Vec3, vel: Vec3, gravity: number, t: number): Vec3 {
  return { x: from.x + vel.x * t, y: from.y + vel.y * t - 0.5 * gravity * t * t, z: from.z + vel.z * t };
}
