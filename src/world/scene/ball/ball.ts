import type { IsSolid, Vec3 } from "@/world/engine/types";
import type { ColliderSet } from "@/world/engine/physics/colliders";
import type { RampSet } from "@/world/engine/physics/ramps";

/**
 * The plaza's ball (polish #12): a blocky ball Ezra kicks by running into it. It rolls, bounces off walls and props,
 * comes to rest on the grass, rides the bridges' ramps, and if it rolls off an island it pops back home.
 */
export const BALL = { r: 0.25, gravity: 22, bounce: 0.5, wall: 0.55, friction: 1.6, kickUp: 3.2, kickPush: 2.2, kickCarry: 1.3 } as const;

export interface Ball { pos: Vec3; vel: Vec3; onGround: boolean; spin: number }
export interface BallWorld { isSolid: IsSolid; props?: ColliderSet; ramps?: RampSet; killY: number }

export function createBall(at: Vec3): Ball {
  return { pos: { ...at }, vel: { x: 0, y: 0, z: 0 }, onGround: false, spin: 0 };
}

const box = { x0: 0, y0: 0, z0: 0, x1: 0, y1: 0, z1: 0 };
function blocked(w: BallWorld, x: number, y: number, z: number): boolean {
  const r = BALL.r * 0.95;
  for (const dx of [-r, r]) for (const dy of [-r, r]) for (const dz of [-r, r]) if (w.isSolid(Math.floor(x + dx), Math.floor(y + dy), Math.floor(z + dz))) return true;
  if (!w.props) return false;
  box.x0 = x - r; box.x1 = x + r; box.y0 = y - r; box.y1 = y + r; box.z0 = z - r; box.z1 = z + r;
  return w.props.hits(box);
}

/**
 * Kicks the ball if Ezra (feet `feet`, velocity `vel`) runs into it: away from him, with his speed carried and a hop.
 * Returns true when it kicked.
 */
export function kickBall(b: Ball, feet: Vec3, vel: Vec3): boolean {
  const dx = b.pos.x - feet.x, dz = b.pos.z - feet.z;
  const d = Math.hypot(dx, dz);
  if (d > BALL.r + 0.35 || b.pos.y < feet.y - 0.3 || b.pos.y > feet.y + 1.6) return false;
  const speed = Math.hypot(vel.x, vel.z);
  if (speed < 0.5) return false;
  const nx = d > 1e-4 ? dx / d : vel.x / speed, nz = d > 1e-4 ? dz / d : vel.z / speed;
  // only when he moves toward it
  if (nx * vel.x + nz * vel.z <= 0) return false;
  b.vel.x = vel.x * BALL.kickCarry + nx * BALL.kickPush;
  b.vel.z = vel.z * BALL.kickCarry + nz * BALL.kickPush;
  b.vel.y = BALL.kickUp * Math.min(1, speed / 5);
  b.onGround = false;
  return true;
}

/** One physics step. Returns "fell" when it dropped below the world (the caller sends it home). */
export function stepBall(b: Ball, w: BallWorld, dt: number): "fell" | null {
  const h = Math.min(dt, 1 / 30);
  b.vel.y -= BALL.gravity * h;
  // sideways, axis by axis: a wall or a prop sends it back, slower
  for (const axis of ["x", "z"] as const) {
    const next = b.pos[axis] + b.vel[axis] * h;
    const x = axis === "x" ? next : b.pos.x, z = axis === "z" ? next : b.pos.z;
    if (blocked(w, x, b.pos.y, z)) b.vel[axis] = -b.vel[axis] * BALL.wall;
    else b.pos[axis] = next;
  }
  const ny = b.pos.y + b.vel.y * h;
  const ramp = w.ramps?.surfaceAt(b.pos.x, b.pos.z, b.pos.y - BALL.r);
  const rampTop = ramp === null || ramp === undefined ? -Infinity : ramp + BALL.r;
  if (b.vel.y <= 0 && ny <= rampTop) {
    b.pos.y = rampTop;
    b.vel.y = Math.abs(b.vel.y) > 2 ? -b.vel.y * BALL.bounce : 0;
    b.onGround = b.vel.y === 0;
  } else if (blocked(w, b.pos.x, ny, b.pos.z)) {
    // landing (or a head-bump): bounce, settling once slow
    b.vel.y = Math.abs(b.vel.y) > 2 ? -b.vel.y * BALL.bounce : 0;
    b.onGround = b.vel.y === 0 || b.vel.y > 0;
  } else {
    b.pos.y = ny;
    b.onGround = false;
  }
  if (b.onGround) {
    const f = Math.exp(-BALL.friction * h);
    b.vel.x *= f;
    b.vel.z *= f;
    if (Math.hypot(b.vel.x, b.vel.z) < 0.03) b.vel.x = b.vel.z = 0;
  }
  b.spin += (Math.hypot(b.vel.x, b.vel.z) * h) / BALL.r;
  return b.pos.y < w.killY ? "fell" : null;
}
