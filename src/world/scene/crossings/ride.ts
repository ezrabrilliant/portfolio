import { positionAt, solveLaunch } from "@/world/engine/traversal/ballistic";
import { railPoint, railTangent, rideProgress } from "@/world/engine/traversal/rail";
import { DEFAULT_PARAMS } from "@/world/engine/physics/character";
import type { CharacterState } from "@/world/engine/physics/character";
import type { Ride } from "@/world/state/runtime";

/** Ezra's feet sit this far above the rail while he rides in the cart. */
const SEAT = 0.35;
/** The hop out of the cart peaks this far above the seat. */
const HOP_APEX = 0.5;

/**
 * Advances a locked ride; returns true on the frame it finishes (player placed at the exit).
 *
 * A cart ride ends with a hop: when the cart reaches the far station the same ride object turns into a
 * short ballistic arc from Ezra's seat to the exit (callers see `kind === "arc"` from then on and land it
 * like a bounce, with dust and the landing pose).
 */
export function advanceRide(ride: Ride, player: CharacterState, dt: number): boolean {
  ride.t += dt;
  if (ride.kind === "arc") {
    if (ride.t >= ride.time) {
      Object.assign(player.pos, ride.to);
      return true;
    }
    Object.assign(player.pos, positionAt(ride.from, ride.vel, DEFAULT_PARAMS.gravity, ride.t));
    // airborne with the arc's vertical speed, so Ezra's animation plays jump, then fall
    player.vel.y = ride.vel.y - DEFAULT_PARAMS.gravity * ride.t;
    player.onGround = false;
    return false;
  }
  if (ride.t >= ride.duration) {
    const over = ride.t - ride.duration;
    const end = railPoint(ride.rail, ride.reverse ? 0 : 1);
    const from = { x: end.x, y: end.y + SEAT, z: end.z };
    const to = { ...ride.exit };
    const { vel, time } = solveLaunch(from, to, DEFAULT_PARAMS.gravity, HOP_APEX);
    const hop = Object.assign(ride, { kind: "arc", t: 0, from, to, vel, time }) as Ride;
    return advanceRide(hop, player, over);
  }
  const u = rideProgress(ride.t, ride.duration);
  const p = railPoint(ride.rail, ride.reverse ? 1 - u : u);
  player.pos.x = p.x;
  player.pos.y = p.y + SEAT;
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
