import { describe, expect, it } from "vitest";
import {
  DEFAULT_PARAMS, characterCollides, createCharacter, respawn, stepCharacter,
  type CharacterInput, type CharacterState, type StepResult,
} from "@/world/engine/physics/character";
import { blockId } from "@/world/engine/voxel/blocks";
import { VoxelGrid } from "@/world/engine/voxel/grid";

const FRAME = 1 / 60;
const idle: CharacterInput = { moveX: 0, moveZ: 0, run: false, jump: false };

/** Ground slab: blocks at y = 0 for x, z in [-10, 10] → walkable surface at y = 1. */
function ground(): VoxelGrid {
  const g = new VoxelGrid();
  for (let x = -10; x <= 10; x++) for (let z = -10; z <= 10; z++) g.set(x, 0, z, blockId("stone"));
  return g;
}

function run(s: CharacterState, g: VoxelGrid, input: CharacterInput, seconds: number, killY = -20): StepResult[] {
  const results: StepResult[] = [];
  for (let t = 0; t < seconds - 1e-9; t += FRAME) results.push(stepCharacter(s, input, FRAME, { isSolid: g.isSolid, killY }));
  return results;
}

function settled(g: VoxelGrid, x = 0.5, z = 0.5): CharacterState {
  const s = createCharacter({ x, y: 1, z });
  run(s, g, idle, 0.1);
  return s;
}

describe("character basics", () => {
  it("lands and stays on the ground", () => {
    const g = ground();
    const s = createCharacter({ x: 0.5, y: 1.4, z: 0.5 });
    const res = run(s, g, idle, 0.5);
    expect(res.some((r) => r.landed)).toBe(true);
    expect(s.onGround).toBe(true);
    expect(s.pos.y).toBeCloseTo(1, 6);
  });

  it("walks at walk speed and runs faster", () => {
    const g = ground();
    const walk = settled(g), runner = settled(g);
    run(walk, g, { ...idle, moveX: 1 }, 1);
    run(runner, g, { ...idle, moveX: 1, run: true }, 1);
    expect(walk.vel.x).toBeCloseTo(DEFAULT_PARAMS.walkSpeed, 3);
    expect(runner.vel.x).toBeCloseTo(DEFAULT_PARAMS.runSpeed, 3);
    expect(runner.pos.x).toBeGreaterThan(walk.pos.x);
  });

  it("characterCollides detects blocks overlapping the body", () => {
    const g = ground();
    expect(characterCollides(g.isSolid, 0.5, 1, 0.5)).toBe(false);
    expect(characterCollides(g.isSolid, 0.5, 0.9, 0.5)).toBe(true);
  });
});

describe("walls and steps", () => {
  it("slides along a wall instead of stopping", () => {
    const g = ground();
    for (let z = -10; z <= 10; z++) for (let y = 1; y <= 3; y++) g.set(2, y, z, blockId("stone"));
    const s = settled(g);
    run(s, g, { ...idle, moveX: Math.SQRT1_2, moveZ: Math.SQRT1_2 }, 1);
    expect(s.pos.x).toBeLessThanOrEqual(2 - DEFAULT_PARAMS.width / 2 + 1e-3);
    expect(s.pos.x).toBeGreaterThan(1.6);
    expect(s.pos.z).toBeGreaterThan(2);
  });

  it("climbs a 1-block step without jumping", () => {
    const g = ground();
    for (let z = -10; z <= 10; z++) for (let x = 2; x <= 4; x++) g.set(x, 1, z, blockId("stone"));
    const s = settled(g);
    const res = run(s, g, { ...idle, moveX: 1 }, 0.8);
    expect(res.some((r) => r.stepped)).toBe(true);
    expect(s.pos.x).toBeGreaterThan(2.5);
    expect(s.pos.y).toBeCloseTo(2, 6);
  });

  it("does not climb a 2-block wall", () => {
    const g = ground();
    for (let z = -10; z <= 10; z++) { g.set(2, 1, z, blockId("stone")); g.set(2, 2, z, blockId("stone")); }
    const s = settled(g);
    run(s, g, { ...idle, moveX: 1 }, 1);
    expect(s.pos.x).toBeLessThanOrEqual(2 - DEFAULT_PARAMS.width / 2 + 1e-3);
    expect(s.pos.y).toBeCloseTo(1, 6);
  });
});

describe("jumping", () => {
  it("reaches an apex of about 1.5 blocks", () => {
    const g = ground();
    const s = settled(g);
    stepCharacter(s, { ...idle, jump: true }, FRAME, { isSolid: g.isSolid, killY: -20 });
    let peak = s.pos.y;
    for (let i = 0; i < 60; i++) {
      stepCharacter(s, idle, FRAME, { isSolid: g.isSolid, killY: -20 });
      peak = Math.max(peak, s.pos.y);
    }
    expect(peak - 1).toBeGreaterThan(1.35);
    expect(peak - 1).toBeLessThan(1.6);
  });

  it("allows a jump within coyote time after leaving the ground", () => {
    const g = new VoxelGrid();
    const s = createCharacter({ x: 0, y: 5, z: 0 });
    s.sinceGround = 0.05;
    const r = stepCharacter(s, { ...idle, jump: true }, FRAME, { isSolid: g.isSolid, killY: -20 });
    expect(r.jumped).toBe(true);
    expect(s.vel.y).toBeGreaterThan(8);
  });

  it("refuses a jump after coyote time has passed", () => {
    const g = new VoxelGrid();
    const s = createCharacter({ x: 0, y: 5, z: 0 });
    s.sinceGround = 0.2;
    const r = stepCharacter(s, { ...idle, jump: true }, FRAME, { isSolid: g.isSolid, killY: -20 });
    expect(r.jumped).toBe(false);
    expect(s.vel.y).toBeLessThan(0);
  });

  it("buffers a jump pressed just before landing", () => {
    const g = ground();
    const s = createCharacter({ x: 0.5, y: 1.3, z: 0.5 });
    s.vel.y = -3;
    s.sinceGround = 1;
    const res = [stepCharacter(s, { ...idle, jump: true }, FRAME, { isSolid: g.isSolid, killY: -20 })];
    res.push(...run(s, g, idle, 0.3));
    expect(res.some((r) => r.jumped)).toBe(true);
    expect(s.pos.y).toBeGreaterThan(1.5);
  });

  it("forgets a jump pressed too early", () => {
    const g = ground();
    const s = createCharacter({ x: 0.5, y: 3, z: 0.5 });
    s.sinceGround = 1;
    const res = [stepCharacter(s, { ...idle, jump: true }, FRAME, { isSolid: g.isSolid, killY: -20 })];
    res.push(...run(s, g, idle, 0.6));
    expect(res.some((r) => r.jumped)).toBe(false);
    expect(s.pos.y).toBeCloseTo(1, 6);
  });
});

describe("falling and safety", () => {
  it("tracks the last safe position while grounded", () => {
    const g = ground();
    const s = settled(g, 3.5, -2.5);
    expect(s.lastSafe).toEqual({ x: 3.5, y: 1, z: -2.5 });
  });

  it("reports fellOut below killY and respawns at the last safe spot", () => {
    const g = new VoxelGrid();
    g.set(0, 0, 0, blockId("stone"));
    const s = settled(g);
    const res = run(s, g, { ...idle, moveX: 1 }, 2.5, -5);
    expect(res.some((r) => r.fellOut)).toBe(true);
    expect(s.pos.y).toBeLessThan(-5);
    expect(s.lastSafe.y).toBe(1);
    respawn(s);
    expect(s.pos).toEqual(s.lastSafe);
    expect(s.vel).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("ignores input and gravity while locked", () => {
    const g = new VoxelGrid();
    const s = createCharacter({ x: 0, y: 5, z: 0 });
    s.locked = true;
    const r = stepCharacter(s, { moveX: 1, moveZ: 1, run: true, jump: true }, FRAME, { isSolid: g.isSolid, killY: -20 });
    expect(r).toEqual({ landed: false, jumped: false, fellOut: false, stepped: false, teetered: false });
    expect(s.pos).toEqual({ x: 0, y: 5, z: 0 });
    expect(s.vel).toEqual({ x: 0, y: 0, z: 0 });
  });
});
