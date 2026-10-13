import { positionAt } from "@/world/engine/traversal/ballistic";
import { railPoint, railTangent, rideProgress } from "@/world/engine/traversal/rail";
import { DEFAULT_PARAMS } from "@/world/engine/physics/character";
import type { CharacterState } from "@/world/engine/physics/character";
import type { Ride } from "@/world/state/runtime";

/** Advances a locked ride; returns true on the frame it finishes (player placed at the exit). */
export function advanceRide(ride: Ride, player: CharacterState, dt: number): boolean {
  ride.t += dt;
  if (ride.kind === "arc") {
    if (ride.t >= ride.time) {
      Object.assign(player.pos, ride.to);
      return true;
    }
    Object.assign(player.pos, positionAt(ride.from, ride.vel, DEFAULT_PARAMS.gravity, ride.t));
    return false;
  }
  if (ride.t >= ride.duration) {
    Object.assign(player.pos, ride.exit);
    return true;
  }
  const u = rideProgress(ride.t, ride.duration);
  const p = railPoint(ride.rail, ride.reverse ? 1 - u : u);
  player.pos.x = p.x;
  player.pos.y = p.y + 0.35;
  player.pos.z = p.z;
  return false;
}

/** Heading that faces along the rail in the ride's direction. */
export function rideHeading(ride: Extract<Ride, { kind: "rail" }>): number {
  const u = rideProgress(Math.min(ride.t, ride.duration), ride.duration);
  const tan = railTangent(ride.rail, ride.reverse ? 1 - u : u);
  const s = ride.reverse ? -1 : 1;
  return Math.atan2(tan.x * s, tan.z * s);
}
