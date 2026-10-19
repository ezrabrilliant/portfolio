import type { IsSolid, Vec3 } from "@/world/engine/types";
import { solveLaunch } from "@/world/engine/traversal/ballistic";
import type { ColliderSet } from "./colliders";
import type { RampSet } from "./ramps";

/*
 * Rims without fences (spec: edge guard). Walking never takes Ezra off an island: a step that would leave no footing is
 * not taken, so he stops at the rim and teeters, and slides along it when pushed at an angle. Only a jump leaves an
 * island. A jump that misses is caught by the cloud sea, which throws him back on an arc to where he last stood.
 */

/**
 * How many blocks below his feet still count as footing: a ledge he walks down lands within this, anything deeper is a
 * rim. The terraces, porches and prop tops on the islands are all shallower.
 */
export const EDGE_DROP = 3;

/**
 * Half the footprint (blocks) that must stay over footing, smaller than his collision box (0.3) so he walks up to the
 * drawn rim and his toes may hang over it, as they do in the reference games, rather than stopping a body short.
 */
export const EDGE_FOOT = 0.15;

/** How far below his last footing a fall has to go before the cloud sea catches it: well past the island's rim. */
export const CLOUD_CATCH_DROP = 6;

/** The throw back peaks this far above the footing it lands on, so the arc reads as a bounce, not a lift. */
export const CLOUD_APEX = 2.5;

const EPS = 1e-6;
const FOOT_BOX = { x0: 0, y0: 0, z0: 0, x1: 0, y1: 0, z1: 0 };

/**
 * Is there something to stand on under feet at (x, y, z) within EDGE_DROP blocks: a solid block under the footprint, a
 * prop's top, or a bridge's deck?
 */
export function hasFooting(isSolid: IsSolid, x: number, y: number, z: number, colliders?: ColliderSet, ramps?: RampSet): boolean {
  const x0 = Math.floor(x - EDGE_FOOT), x1 = Math.floor(x + EDGE_FOOT);
  const z0 = Math.floor(z - EDGE_FOOT), z1 = Math.floor(z + EDGE_FOOT);
  const top = Math.floor(y + EPS) - 1;
  for (let by = top; by >= top - EDGE_DROP + 1; by--) {
    for (let bx = x0; bx <= x1; bx++) for (let bz = z0; bz <= z1; bz++) if (isSolid(bx, by, bz)) return true;
  }
  if (colliders) {
    FOOT_BOX.x0 = x - EDGE_FOOT; FOOT_BOX.x1 = x + EDGE_FOOT;
    FOOT_BOX.z0 = z - EDGE_FOOT; FOOT_BOX.z1 = z + EDGE_FOOT;
    FOOT_BOX.y0 = y - EDGE_DROP; FOOT_BOX.y1 = y + 0.01;
    // only a top under the feet: a bridge post or a sign standing beside the rim is not a floor
    if (colliders.floorUnder(FOOT_BOX, y) >= y - EDGE_DROP) return true;
  }
  if (ramps) {
    const deck = ramps.surfaceAt(x, z, y);
    if (deck !== null && deck >= y - EDGE_DROP) return true;
  }
  return false;
}

/** The state the cloud catch reads (a CharacterState fits). */
export interface Falling { pos: Vec3; onGround: boolean; lastSafe: Vec3 }

/** A missed jump has fallen far enough below his last footing for the cloud sea to catch him. */
export function shouldCloudCatch(s: Falling): boolean {
  return !s.onGround && s.pos.y < s.lastSafe.y - CLOUD_CATCH_DROP;
}

/** The ride a catch starts (runtime's arc ride): from where he is, over CLOUD_APEX, exactly onto his last footing. */
export function cloudCatchRide(s: Falling, gravity = 30): { kind: "arc"; t: number; from: Vec3; to: Vec3; vel: Vec3; time: number } {
  const from = { ...s.pos };
  const to = { ...s.lastSafe };
  const { vel, time } = solveLaunch(from, to, gravity, CLOUD_APEX);
  return { kind: "arc", t: 0, from, to, vel, time };
}
