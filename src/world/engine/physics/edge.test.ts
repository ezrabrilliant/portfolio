import { describe, expect, it } from "vitest";
import {
  createCharacter, stepCharacter, type CharacterInput, type CharacterState, type StepResult,
} from "@/world/engine/physics/character";
import { CLOUD_CATCH_DROP, EDGE_DROP, cloudCatchRide, hasFooting, shouldCloudCatch } from "@/world/engine/physics/edge";
import { ColliderSet } from "@/world/engine/physics/colliders";
import { RampSet } from "@/world/engine/physics/ramps";
import { positionAt } from "@/world/engine/traversal/ballistic";
import { blockId } from "@/world/engine/voxel/blocks";
import { VoxelGrid } from "@/world/engine/voxel/grid";

const FRAME = 1 / 60;
const idle: CharacterInput = { moveX: 0, moveZ: 0, run: false, jump: false };

/** Ground slab: blocks at y = 0 for x, z in [-10, 10] → walkable surface at y = 1; the east rim is at x = 11. */
function ground(): VoxelGrid {
  const g = new VoxelGrid();
  for (let x = -10; x <= 10; x++) for (let z = -10; z <= 10; z++) g.set(x, 0, z, blockId("stone"));
  return g;
}

interface World { g: VoxelGrid; ramps?: RampSet; edgeGuard?: boolean }

function run(s: CharacterState, w: World, input: CharacterInput, seconds: number): StepResult[] {
  const out: StepResult[] = [];
  for (let t = 0; t < seconds - 1e-9; t += FRAME) {
    out.push(stepCharacter(s, input, FRAME, { isSolid: w.g.isSolid, killY: -40, ramps: w.ramps, edgeGuard: w.edgeGuard }));
  }
  return out;
}

function standing(w: World, x: number, z = 0.5): CharacterState {
  const s = createCharacter({ x, y: 1, z });
  run(s, w, idle, 0.1);
  return s;
}

describe("edge guard: walking never leaves the island", () => {
  it("stops at the rim, still standing, and reports the teeter", () => {
    const w = { g: ground(), edgeGuard: true };
    const s = standing(w, 8.5);
    const res = run(s, w, { ...idle, moveX: 1 }, 2);
    expect(s.onGround).toBe(true);
    expect(s.pos.y).toBeCloseTo(1, 6);
    expect(s.pos.x).toBeLessThan(11.3);
    expect(s.pos.x).toBeGreaterThan(10.8); // right at the rim, not a block short of it
    expect(res.some((r) => r.teetered)).toBe(true);
  });

  it("without the guard he still walks off (the old behaviour is kept for everything else)", () => {
    const w = { g: ground() };
    const s = standing(w, 8.5);
    run(s, w, { ...idle, moveX: 1 }, 2);
    expect(s.pos.y).toBeLessThan(0);
  });

  it("slides along the rim when pushed diagonally into it", () => {
    const w = { g: ground(), edgeGuard: true };
    const s = standing(w, 10.6, 0.5);
    run(s, w, { ...idle, moveX: 1, moveZ: 1 }, 0.5);
    expect(s.onGround).toBe(true);
    expect(s.pos.x).toBeLessThan(11.3);
    expect(s.pos.z).toBeGreaterThan(1.5);
  });

  it("a jump at the rim still carries him off it", () => {
    const w = { g: ground(), edgeGuard: true };
    const s = standing(w, 8.5);
    run(s, w, { ...idle, moveX: 1 }, 1);
    run(s, w, { ...idle, moveX: 1, jump: true }, FRAME);
    run(s, w, { ...idle, moveX: 1 }, 1);
    expect(s.pos.x).toBeGreaterThan(12);
    expect(s.pos.y).toBeLessThan(1);
  });

  it("walks down a ledge no deeper than EDGE_DROP", () => {
    const g = ground();
    for (let x = 11; x <= 15; x++) for (let z = -2; z <= 2; z++) g.set(x, 1 - EDGE_DROP, z, blockId("stone"));
    const w = { g, edgeGuard: true };
    const s = standing(w, 9.5);
    run(s, w, { ...idle, moveX: 1 }, 1.5);
    expect(s.pos.x).toBeGreaterThan(12);
    expect(s.pos.y).toBeCloseTo(2 - EDGE_DROP, 6);
  });

  it("stops at a drop deeper than EDGE_DROP", () => {
    const g = ground();
    for (let x = 11; x <= 15; x++) for (let z = -2; z <= 2; z++) g.set(x, -EDGE_DROP - 1, z, blockId("stone"));
    const w = { g, edgeGuard: true };
    const s = standing(w, 9.5);
    run(s, w, { ...idle, moveX: 1 }, 1.5);
    expect(s.pos.x).toBeLessThan(11.3);
    expect(s.pos.y).toBeCloseTo(1, 6);
  });

  it("stepping down off a prop near the rim lands on the island, not past it (the guard holds while he drops)", () => {
    // a crate 0.64 high whose outer side is 0.8 inside the rim (x 11), as the POS stall's props sit: walking off it, the
    // drop's drift (~1 block at walking speed) would carry him past the rim without the guard
    const props = new ColliderSet([{ x: 9.7, y: 1.32, z: 0.5, hx: 0.5, hy: 0.32, hz: 0.5, ry: 0 }]);
    const w = { g: ground(), edgeGuard: true };
    const s = createCharacter({ x: 9.5, y: 1.64, z: 0.5 });
    const step = (input: CharacterInput, seconds: number) => {
      for (let t = 0; t < seconds - 1e-9; t += FRAME) stepCharacter(s, input, FRAME, { isSolid: w.g.isSolid, killY: -40, colliders: props, edgeGuard: true });
    };
    step(idle, 0.1);
    expect(s.pos.y).toBeCloseTo(1.64, 2);
    step({ ...idle, moveX: 1 }, 1.5);
    expect(s.onGround).toBe(true);
    expect(s.pos.y).toBeCloseTo(1, 6);
    expect(s.pos.x).toBeLessThan(11.3);
  });

  it("a jump is not held back in the air: it still clears the rim", () => {
    const w = { g: ground(), edgeGuard: true };
    const s = standing(w, 10.2);
    run(s, w, { ...idle, moveX: 1, jump: true }, FRAME);
    run(s, w, { ...idle, moveX: 1 }, 1);
    expect(s.pos.x).toBeGreaterThan(12);
  });

  it("a bridge deck (ramp) past the rim is footing, and its sides are rims", () => {
    const ramps = new RampSet([{ a: { x: 11, y: 1, z: 0.5 }, b: { x: 20, y: 1, z: 0.5 }, halfWidth: 0.7 }]);
    const w = { g: ground(), ramps, edgeGuard: true };
    const s = standing(w, 9.5);
    run(s, w, { ...idle, moveX: 1 }, 1.5);
    expect(s.pos.x).toBeGreaterThan(13);
    expect(s.onGround).toBe(true);
    run(s, w, { ...idle, moveZ: 1 }, 1);
    expect(s.onGround).toBe(true);
    expect(s.pos.y).toBeCloseTo(1, 6);
    expect(s.pos.z).toBeLessThan(0.5 + 0.7 + 0.3);
  });
});

describe("hasFooting", () => {
  it("finds the ground under the feet and nothing past the rim", () => {
    const g = ground();
    expect(hasFooting(g.isSolid, 0.5, 1, 0.5)).toBe(true);
    expect(hasFooting(g.isSolid, 11.5, 1, 0.5)).toBe(false);
  });

  it("a prop counts only by a top under the feet: a crate below does, a post standing past them does not", () => {
    const g = ground();
    // a bridge post beside the rim, over the void, from 4 below the feet to 1 above them (as on the rope bridges)
    const post = new ColliderSet([{ x: 11.5, y: -0.5, z: 0.5, hx: 0.08, hy: 2.5, hz: 0.08, ry: 0 }]);
    expect(hasFooting(g.isSolid, 11.5, 1, 0.5, post)).toBe(false);
    // a crate whose top is a block under the feet
    const crate = new ColliderSet([{ x: 11.5, y: -0.5, z: 0.5, hx: 0.4, hy: 0.5, hz: 0.4, ry: 0 }]);
    expect(hasFooting(g.isSolid, 11.5, 1, 0.5, crate)).toBe(true);
    // both: the crate still holds him, the post beside it does not hide it
    const both = new ColliderSet([
      { x: 11.5, y: -0.5, z: 0.5, hx: 0.4, hy: 0.5, hz: 0.4, ry: 0 },
      { x: 11.5, y: -0.5, z: 0.75, hx: 0.08, hy: 2.5, hz: 0.08, ry: 0 },
    ]);
    expect(hasFooting(g.isSolid, 11.5, 1, 0.5, both)).toBe(true);
  });
});

describe("cloud catch", () => {
  it("catches only a fall CLOUD_CATCH_DROP below the last footing", () => {
    const s = createCharacter({ x: 12, y: 1, z: 0.5 });
    s.lastSafe = { x: 10.9, y: 1, z: 0.5 };
    s.onGround = false;
    s.pos.y = 1 - CLOUD_CATCH_DROP + 0.1;
    expect(shouldCloudCatch(s)).toBe(false);
    s.pos.y = 1 - CLOUD_CATCH_DROP - 0.1;
    expect(shouldCloudCatch(s)).toBe(true);
    s.onGround = true;
    expect(shouldCloudCatch(s)).toBe(false);
  });

  it("throws him back on an arc that lands exactly on the last footing, above it on the way", () => {
    const s = createCharacter({ x: 13, y: -6, z: 2 });
    s.lastSafe = { x: 10.9, y: 1, z: 0.5 };
    const r = cloudCatchRide(s);
    expect(r.kind).toBe("arc");
    const end = positionAt(r.from, r.vel, 30, r.time);
    expect(end.x).toBeCloseTo(10.9, 6);
    expect(end.y).toBeCloseTo(1, 6);
    expect(end.z).toBeCloseTo(0.5, 6);
    const apex = positionAt(r.from, r.vel, 30, r.vel.y / 30);
    expect(apex.y).toBeGreaterThan(s.lastSafe.y + 1.5);
  });
});
