import type { Rng } from "@/world/engine/gen/rng";

/** Motion of punched voxel letters, free of three/React so it can be stepped in tests. Lengths are title-local units. */

export const SCATTER = 0.75; // s before the first block may set off home
export const STAGGER = 0.3; // s between the left and the right edge being allowed home: the title rebuilds as a wave
export const FLIGHT_MAX = 1.6; // s after which a block still in the air sets off home anyway (+ its stagger)
export const HOME = 0.6; // s for one block to fly home
export const GRAVITY = 16;
export const BOUNCE = 0.35; // share of the fall speed kept when a block hits the grass
export const SLIDE = 0.55; // share of the sideways speed and spin kept on that impact
export const SQUASH = 0.3; // s of the reduced-motion squash

export type TitlePhase = "rest" | "scatter" | "squash";

export interface TitleSim {
  phase: TitlePhase;
  t: number;
  /** Vertical scale of the whole title (the reduced-motion squash). */
  scaleY: number;
  readonly count: number;
  readonly size: number;
  /** Rest centre of each block. */
  readonly restX: Float32Array;
  readonly restY: Float32Array;
  readonly delay: Float32Array;
  readonly off: Float32Array;
  readonly vel: Float32Array;
  readonly spin: Float32Array;
  readonly ang: Float32Array;
  readonly from: Float32Array;
  readonly fromAng: Float32Array;
  /** Time the block set off home, or -1 while it is still flying. */
  readonly launch: Float32Array;
  /** 1 when the block touched the grass in the last step. */
  readonly grounded: Uint8Array;
  home: number;
}

/** `cells` in cell units (x from the title centre, y from its bottom), as `layoutLines` returns them. */
export function createTitleSim(cells: readonly { x: number; y: number }[], size: number): TitleSim {
  const count = cells.length;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const c of cells) {
    minX = Math.min(minX, c.x);
    maxX = Math.max(maxX, c.x);
  }
  const spanX = maxX - minX || 1;
  const v3 = () => new Float32Array(count * 3);
  return {
    phase: "rest",
    t: 0,
    scaleY: 1,
    count,
    size,
    restX: Float32Array.from(cells, (c) => c.x * size),
    restY: Float32Array.from(cells, (c) => c.y * size),
    delay: Float32Array.from(cells, (c) => (STAGGER * (c.x - minX)) / spanX),
    off: v3(),
    vel: v3(),
    spin: v3(),
    ang: v3(),
    from: v3(),
    fromAng: v3(),
    launch: new Float32Array(count).fill(-1),
    grounded: new Uint8Array(count),
    home: 0,
  };
}

/** Punch: every block flies up and out of the title's front (+z, the side kept clear of props). */
export function scatterTitle(sim: TitleSim, rng: Rng): void {
  for (let i = 0; i < sim.count; i++) {
    const j = i * 3;
    for (let a = j; a < j + 3; a++) sim.off[a] = sim.ang[a] = 0;
    sim.vel[j] = (rng() - 0.5) * 6;
    sim.vel[j + 1] = 2 + rng() * 5;
    sim.vel[j + 2] = 1 + rng() * 3;
    sim.spin[j] = (rng() - 0.5) * 8;
    sim.spin[j + 1] = (rng() - 0.5) * 8;
    sim.spin[j + 2] = (rng() - 0.5) * 8;
  }
  sim.launch.fill(-1);
  sim.grounded.fill(0);
  sim.home = 0;
  sim.scaleY = 1;
  sim.phase = "scatter";
  sim.t = 0;
}

/** Reduced motion: the letters stay put and only squash once. */
export function squashTitle(sim: TitleSim): void {
  if (sim.phase === "scatter") return;
  sim.phase = "squash";
  sim.t = 0;
}

function settle(sim: TitleSim): void {
  sim.off.fill(0);
  sim.ang.fill(0);
  sim.scaleY = 1;
  sim.phase = "rest";
}

/**
 * Advances the title by `dt`. `floor` is the lowest block centre allowed (the grass under the title, in the title's frame).
 * Each block flies under gravity, bounces and slides on the grass, and sets off home on a ground contact once
 * SCATTER + its stagger has passed (or at FLIGHT_MAX + stagger). The flight home is a cubic Hermite curve that starts
 * with the block's own velocity and spin and ends at rest, so no block ever stops dead in the air.
 */
export function stepTitle(sim: TitleSim, dt: number, floor: number): void {
  if (sim.phase === "rest") return;
  sim.t += dt;
  const t = sim.t;
  if (sim.phase === "squash") {
    const k = Math.min(1, t / SQUASH);
    sim.scaleY = 1 - 0.18 * Math.sin(Math.PI * k);
    if (k >= 1) settle(sim);
    return;
  }
  const { off, vel, spin, ang, from, fromAng, launch, grounded, restY, delay } = sim;
  for (let i = 0; i < sim.count; i++) {
    const j = i * 3;
    if (launch[i] < 0) {
      vel[j + 1] -= GRAVITY * dt;
      for (let a = j; a < j + 3; a++) {
        off[a] += vel[a] * dt;
        ang[a] += spin[a] * dt;
      }
      const below = floor - (restY[i] + off[j + 1]);
      grounded[i] = below > 0 ? 1 : 0;
      if (below > 0) {
        const vy = vel[j + 1];
        const keep = vy < -1 ? SLIDE : Math.exp(-10 * dt); // an impact, or resting contact
        off[j + 1] += below;
        vel[j + 1] = vy < -1 ? -vy * BOUNCE : 0;
        vel[j] *= keep;
        vel[j + 2] *= keep;
        for (let a = j; a < j + 3; a++) spin[a] *= keep;
      }
      if ((grounded[i] && t >= SCATTER + delay[i]) || t >= FLIGHT_MAX + delay[i]) {
        launch[i] = t;
        for (let a = j; a < j + 3; a++) {
          from[a] = off[a];
          fromAng[a] = ang[a];
        }
      }
      continue;
    }
    if (launch[i] === Infinity) continue; // home
    const s = Math.min(1, (t - launch[i]) / HOME);
    const h00 = (2 * s - 3) * s * s + 1; // weight of the take-off position
    const h10 = ((s - 2) * s + 1) * s * HOME; // weight of the take-off velocity
    for (let a = j; a < j + 3; a++) {
      off[a] = h00 * from[a] + h10 * vel[a];
      ang[a] = h00 * fromAng[a] + h10 * spin[a];
    }
    const below = floor - (restY[i] + off[j + 1]);
    if (below > 0) off[j + 1] += below;
    if (s >= 1) {
      launch[i] = Infinity;
      for (let a = j; a < j + 3; a++) off[a] = ang[a] = 0;
      sim.home++;
    }
  }
  if (sim.home === sim.count) settle(sim);
}
