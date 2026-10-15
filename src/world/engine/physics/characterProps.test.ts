import { describe, expect, it } from "vitest";
import { MODEL_TOP, createCharacter, stepCharacter, type CharacterInput, type CharacterState } from "./character";
import { ColliderSet, type Collider } from "./colliders";
import { blockId } from "@/world/engine/voxel/blocks";
import { VoxelGrid } from "@/world/engine/voxel/grid";

const FRAME = 1 / 60;
const ground = () => {
  const g = new VoxelGrid();
  for (let x = -10; x <= 10; x++) for (let z = -10; z <= 10; z++) g.set(x, 0, z, blockId("stone"));
  return g;
};
const g = ground();
const run = (s: CharacterState, set: ColliderSet, input: CharacterInput, seconds: number) => {
  for (let t = 0; t < seconds - 1e-9; t += FRAME) stepCharacter(s, input, FRAME, { isSolid: g.isSolid, killY: -20, colliders: set });
};
const walk = (moveX: number, moveZ: number, jump = false): CharacterInput => ({ moveX, moveZ, run: false, jump });
const post = (x: number, z: number, h = 2): Collider => ({ x, y: 1 + h / 2, z, hx: 0.1, hy: h / 2, hz: 0.1, ry: 0 });

describe("walking among prop colliders", () => {
  it("stops flush against a thin post, not a block short of it", () => {
    const s = createCharacter({ x: 0.5, y: 1, z: 0.5 });
    run(s, new ColliderSet([post(0.5, 3.5)]), walk(0, 1), 2);
    expect(s.pos.z).toBeGreaterThan(3.5 - 0.1 - 0.3 - 0.01);
    expect(s.pos.z).toBeLessThan(3.5 - 0.1 - 0.3 + 1e-6);
  });

  it("slips between two posts a block apart, where two barrier blocks were a wall", () => {
    const s = createCharacter({ x: 0.5, y: 1, z: 0.5 });
    run(s, new ColliderSet([post(-0.05, 3), post(1.05, 3)]), walk(0, 1), 2);
    expect(s.pos.z).toBeGreaterThan(5);
  });

  it("steps up onto a gentong and stands on its top", () => {
    const gentong: Collider = { x: 0.5, y: 1.45, z: 3, hx: 0.4, hy: 0.45, hz: 0.4, ry: 0 };
    const s = createCharacter({ x: 0.5, y: 1, z: 0.5 });
    run(s, new ColliderSet([gentong]), walk(0, 1), 0.65);
    run(s, new ColliderSet([gentong]), walk(0, 0), 0.3);
    expect(s.pos.y).toBeCloseTo(1.9, 3);
    expect(s.onGround).toBe(true);
  });

  it("lands on a crate's top from a jump", () => {
    const crate: Collider = { x: 0.5, y: 1.5, z: 0.5, hx: 0.5, hy: 0.5, hz: 0.5, ry: 0 };
    const s = createCharacter({ x: 0.5, y: 3, z: 0.5 });
    run(s, new ColliderSet([crate]), walk(0, 0), 1);
    expect(s.pos.y).toBeCloseTo(2, 3);
    expect(s.onGround).toBe(true);
  });

  it("keeps his model out of a board's panel hung at head height", () => {
    // a panel from 1.95 to 2.6 above the grass: his box (1.8) would pass under it, his hair and cap (MODEL_TOP) not
    const panel: Collider = { x: 0.5, y: 1 + 2.275, z: 3, hx: 1, hy: 0.325, hz: 0.04, ry: 0 };
    expect(MODEL_TOP).toBeGreaterThan(1.95);
    const s = createCharacter({ x: 0.5, y: 1, z: 0.5 });
    run(s, new ColliderSet([panel]), walk(0, 1), 2);
    expect(s.pos.z).toBeLessThan(3 - 0.04 - 0.3 + 1e-6);
  });

  it("is stopped by a turned panel along its face", () => {
    const panel: Collider = { x: 0.5, y: 2, z: 3, hx: 1.5, hy: 1, hz: 0.04, ry: 0.6 };
    const s = createCharacter({ x: 0.5, y: 1, z: 0.5 });
    run(s, new ColliderSet([panel]), walk(0, 1), 2);
    expect(s.pos.z).toBeLessThan(3);
  });
});
