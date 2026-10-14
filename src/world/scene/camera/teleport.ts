import type { Vec3 } from "@/world/engine/types";

/** A move of Ezra's feet longer than this between two frames is a teleport (a respawn, a fast travel's arrival). */
export const TELEPORT_DIST = 4;

/** True when Ezra moved more than TELEPORT_DIST since the last frame: the follow camera cuts instead of gliding. */
export function isTeleport(prev: Vec3, pos: Vec3): boolean {
  return Math.hypot(pos.x - prev.x, pos.y - prev.y, pos.z - prev.z) > TELEPORT_DIST;
}

/**
 * The follow camera's yaw after a teleport cut: behind Ezra's new heading (updateFollowCam puts the camera at
 * yaw = heading + π). A fast travel faces him away from the destination's tour camera, so the camera lands on the side
 * landingColumn kept clear, not at the angle it had on the island he left. Wrapped to [−π, π] (−π for a heading of 0:
 * Math.atan2(−0, −1)).
 */
export function yawBehind(heading: number): number {
  return Math.atan2(-Math.sin(heading), -Math.cos(heading));
}
