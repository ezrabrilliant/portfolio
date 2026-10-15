import type { IsSolid, Vec3 } from "@/world/engine/types";
import { EZRA_REACH } from "./ezraModel";
import type { Aabb, ColliderSet } from "./colliders";

export interface CharacterParams {
  width: number; height: number; walkSpeed: number; runSpeed: number; accel: number;
  gravity: number; jumpSpeed: number; stepHeight: number; coyoteTime: number; jumpBuffer: number;
}

export const DEFAULT_PARAMS: CharacterParams = {
  width: 0.6, height: 1.8, walkSpeed: 4.5, runSpeed: 7.5, accel: 30, gravity: 30, jumpSpeed: 9.5,
  stepHeight: 1, coyoteTime: 0.1, jumpBuffer: 0.12,
};

/**
 * How high above his feet Ezra's model reaches (ezraModel.ts): his hair (~2.01), or once the 2026 moment has put the
 * mortarboard on him for the rest of the visit, its button (~2.09). His collision box stops at DEFAULT_PARAMS.height,
 * so the model stands up to ~0.29 taller; the head-clearance rules (scene/islands/layouts) keep visuals clear of this,
 * not of the box.
 */
export const MODEL_TOP = Math.max(EZRA_REACH.hairTop, EZRA_REACH.capTop);

export interface CharacterState {
  pos: Vec3; vel: Vec3; onGround: boolean; sinceGround: number; jumpTimer: number;
  lastSafe: Vec3; locked: boolean;
}
export interface CharacterInput { moveX: number; moveZ: number; run: boolean; jump: boolean }
export interface StepResult { landed: boolean; jumped: boolean; fellOut: boolean; stepped: boolean }

const SUBSTEP = 1 / 120;
const MAX_DT = 0.1;
const EPS = 1e-6;
const SKIN = 1e-4;
const MAX_FALL = 40;
const AIR_CONTROL = 0.6;

export function createCharacter(pos: Vec3): CharacterState {
  return {
    pos: { ...pos }, vel: { x: 0, y: 0, z: 0 }, onGround: false, sinceGround: 0, jumpTimer: 0,
    lastSafe: { ...pos }, locked: false,
  };
}

/** Does the character's AABB (feet centre at x, y, z) overlap any solid block, or a prop collider? */
export function characterCollides(isSolid: IsSolid, x: number, y: number, z: number, p: CharacterParams = DEFAULT_PARAMS, colliders?: ColliderSet): boolean {
  const hw = p.width / 2;
  const x0 = Math.floor(x - hw + EPS), x1 = Math.floor(x + hw - EPS);
  const y0 = Math.floor(y + EPS), y1 = Math.floor(y + p.height - EPS);
  const z0 = Math.floor(z - hw + EPS), z1 = Math.floor(z + hw - EPS);
  for (let bx = x0; bx <= x1; bx++) {
    for (let by = y0; by <= y1; by++) {
      for (let bz = z0; bz <= z1; bz++) {
        if (isSolid(bx, by, bz)) return true;
      }
    }
  }
  return colliders ? hitsProp(colliders, x, y, z, p) : false;
}

const PROP_BOX: Aabb = { x0: 0, y0: 0, z0: 0, x1: 0, y1: 0, z1: 0 };

/**
 * Props are tested against Ezra's model height, not his box's: a board's panel then stops his hair and mortarboard
 * (MODEL_TOP) instead of letting them through, with no invisible rows standing in for it.
 */
function propBox(x: number, y: number, z: number, p: CharacterParams): Aabb {
  const hw = p.width / 2;
  PROP_BOX.x0 = x - hw; PROP_BOX.x1 = x + hw;
  PROP_BOX.y0 = y; PROP_BOX.y1 = y + Math.max(p.height, MODEL_TOP);
  PROP_BOX.z0 = z - hw; PROP_BOX.z1 = z + hw;
  return PROP_BOX;
}

function hitsProp(colliders: ColliderSet, x: number, y: number, z: number, p: CharacterParams): boolean {
  return colliders.hits(propBox(x, y, z, p));
}

/** Iterations of the sweeps against props: the last free point ends within delta / 2^SWEEP of the contact. */
const SWEEP = 14;

/** The largest fraction f in [0, 1] of the move from free to blocked for which `free(f)` holds (free(0) is assumed). */
function sweep(free: (f: number) => boolean): number {
  let lo = 0, hi = 1;
  for (let i = 0; i < SWEEP; i++) {
    const mid = (lo + hi) / 2;
    if (free(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

function approach(v: number, target: number, maxDelta: number): number {
  return v < target ? Math.min(v + maxDelta, target) : Math.max(v - maxDelta, target);
}

/** Moves along x or z; tries a ≤ stepHeight step-up when grounded, else stops at the blocking face. Returns true if it stepped. */
function moveAxis(s: CharacterState, axis: "x" | "z", delta: number, isSolid: IsSolid, p: CharacterParams, canStep: boolean, colliders?: ColliderSet): boolean {
  if (delta === 0) return false;
  const pos = s.pos;
  const nx = axis === "x" ? pos.x + delta : pos.x;
  const nz = axis === "z" ? pos.z + delta : pos.z;
  if (!characterCollides(isSolid, nx, pos.y, nz, p, colliders)) {
    pos.x = nx; pos.z = nz;
    return false;
  }
  if (canStep) {
    // up a block, or onto the top of the prop in the way (a gentong, a crate)
    const stepY = Math.floor(pos.y + SKIN) + 1;
    const propTop = colliders ? colliders.topOf(propBox(nx, pos.y, nz, p)) : -Infinity;
    for (const y of [propTop + SKIN, stepY]) {
      if (y > pos.y && y - pos.y <= p.stepHeight + SKIN
        && !characterCollides(isSolid, pos.x, y, pos.z, p, colliders)
        && !characterCollides(isSolid, nx, y, nz, p, colliders)) {
        pos.x = nx; pos.z = nz; pos.y = y;
        return true;
      }
    }
  }
  const hw = p.width / 2;
  const cur = pos[axis];
  const target = cur + delta;
  const contact = delta > 0 ? Math.floor(target + hw - EPS) - hw - SKIN : Math.floor(target - hw + EPS) + 1 + hw + SKIN;
  const cx = axis === "x" ? contact : pos.x;
  const cz = axis === "z" ? contact : pos.z;
  const forward = delta > 0 ? contact > cur : contact < cur;
  if (forward && !characterCollides(isSolid, cx, pos.y, cz, p, colliders)) { pos.x = cx; pos.z = cz; }
  else if (colliders && hitsProp(colliders, nx, pos.y, nz, p)) {
    // a prop in the way: stop flush against it (the block snap above only knows block faces)
    const f = sweep((t) => !characterCollides(isSolid, axis === "x" ? cur + delta * t : pos.x, pos.y, axis === "z" ? cur + delta * t : pos.z, p, colliders));
    pos[axis] = cur + delta * f;
  }
  s.vel[axis] = 0;
  return false;
}

export function stepCharacter(
  s: CharacterState, input: CharacterInput, dt: number,
  world: { isSolid: IsSolid; killY: number; colliders?: ColliderSet }, p: CharacterParams = DEFAULT_PARAMS,
): StepResult {
  const res: StepResult = { landed: false, jumped: false, fellOut: false, stepped: false };
  if (s.locked) return res;
  if (input.jump) s.jumpTimer = p.jumpBuffer;

  let mx = input.moveX, mz = input.moveZ;
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  const speed = input.run ? p.runSpeed : p.walkSpeed;

  const total = Math.min(Math.max(dt, 0), MAX_DT);
  const steps = Math.max(1, Math.ceil(total / SUBSTEP - 1e-9));
  const h = total / steps;

  for (let i = 0; i < steps; i++) {
    const control = s.onGround ? 1 : AIR_CONTROL;
    s.vel.x = approach(s.vel.x, mx * speed, p.accel * control * h);
    s.vel.z = approach(s.vel.z, mz * speed, p.accel * control * h);

    if (s.jumpTimer > 0 && (s.onGround || s.sinceGround <= p.coyoteTime)) {
      s.vel.y = p.jumpSpeed;
      s.onGround = false;
      s.sinceGround = p.coyoteTime + 1;
      s.jumpTimer = 0;
      res.jumped = true;
    }
    s.jumpTimer = Math.max(0, s.jumpTimer - h);
    s.vel.y = Math.max(s.vel.y - p.gravity * h, -MAX_FALL);

    const canStep = s.onGround;
    const props = world.colliders;
    if (moveAxis(s, "x", s.vel.x * h, world.isSolid, p, canStep, props)) res.stepped = true;
    if (moveAxis(s, "z", s.vel.z * h, world.isSolid, p, canStep, props)) res.stepped = true;

    const wasGround = s.onGround;
    const ny = s.pos.y + s.vel.y * h;
    if (!characterCollides(world.isSolid, s.pos.x, ny, s.pos.z, p, props)) {
      s.pos.y = ny;
      s.onGround = false;
    } else if (s.vel.y < 0) {
      const from = s.pos.y;
      if (props && hitsProp(props, s.pos.x, ny, s.pos.z, p)) {
        // landing on a prop's top: as low as stays free
        const f = sweep((t) => !characterCollides(world.isSolid, s.pos.x, from + (ny - from) * t, s.pos.z, p, props));
        s.pos.y = from + (ny - from) * f;
      } else {
        const landY = Math.floor(ny + EPS) + 1;
        if (landY <= s.pos.y + SKIN && !characterCollides(world.isSolid, s.pos.x, landY, s.pos.z, p, props)) s.pos.y = landY;
      }
      s.vel.y = 0;
      s.onGround = true;
      if (!wasGround) res.landed = true;
    } else {
      const from = s.pos.y;
      if (props && hitsProp(props, s.pos.x, ny, s.pos.z, p)) {
        const f = sweep((t) => !characterCollides(world.isSolid, s.pos.x, from + (ny - from) * t, s.pos.z, p, props));
        s.pos.y = from + (ny - from) * f;
      } else {
        const head = Math.floor(ny + p.height - EPS);
        const cy = head - p.height - SKIN;
        if (cy >= s.pos.y - SKIN && !characterCollides(world.isSolid, s.pos.x, cy, s.pos.z, p, props)) s.pos.y = cy;
      }
      s.vel.y = 0;
    }

    if (s.onGround) {
      s.sinceGround = 0;
      s.lastSafe.x = s.pos.x; s.lastSafe.y = s.pos.y; s.lastSafe.z = s.pos.z;
    } else {
      s.sinceGround += h;
    }
  }

  if (s.pos.y < world.killY) res.fellOut = true;
  return res;
}

export function respawn(s: CharacterState): void {
  s.pos.x = s.lastSafe.x; s.pos.y = s.lastSafe.y; s.pos.z = s.lastSafe.z;
  s.vel.x = 0; s.vel.y = 0; s.vel.z = 0;
  s.onGround = false;
  s.sinceGround = 0;
  s.jumpTimer = 0;
}
