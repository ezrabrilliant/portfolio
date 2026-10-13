import { describe, expect, it } from "vitest";
import { BLOCK_NAMES, blockDef, blockId } from "@/world/engine/voxel/blocks";
import { VoxelGrid } from "@/world/engine/voxel/grid";

describe("blocks", () => {
  it("gives every block a unique non-zero id that round-trips", () => {
    const ids = BLOCK_NAMES.map(blockId);
    expect(new Set(ids).size).toBe(BLOCK_NAMES.length);
    expect(ids.every((id) => id > 0)).toBe(true);
    for (const name of BLOCK_NAMES) expect(blockDef(blockId(name))?.name).toBe(name);
  });

  it("treats id 0 as air and barrier as solid but invisible", () => {
    expect(blockDef(0)).toBeUndefined();
    const barrier = blockDef(blockId("barrier"))!;
    expect(barrier.solid).toBe(true);
    expect(barrier.visible).toBe(false);
    expect(blockDef(blockId("grass"))!.colors.length).toBeGreaterThan(1);
  });

  it("throws on unknown names", () => {
    expect(() => blockId("lava" as never)).toThrow(/unknown block/);
  });
});

describe("VoxelGrid", () => {
  it("sets, gets and deletes blocks, including negative coordinates", () => {
    const g = new VoxelGrid();
    g.set(-3, 5, -900, blockId("stone"));
    g.set(1000, -1000, 7, blockId("wood"));
    expect(g.get(-3, 5, -900)).toBe(blockId("stone"));
    expect(g.get(1000, -1000, 7)).toBe(blockId("wood"));
    expect(g.get(0, 0, 0)).toBe(0);
    expect(g.size).toBe(2);
    g.set(-3, 5, -900, 0);
    expect(g.get(-3, 5, -900)).toBe(0);
    expect(g.size).toBe(1);
  });

  it("reports solidity, flooring fractional coordinates", () => {
    const g = new VoxelGrid();
    g.set(2, 0, -1, blockId("grass"));
    g.set(5, 5, 5, blockId("barrier"));
    expect(g.isSolid(2, 0, -1)).toBe(true);
    expect(g.isSolid(2.9, 0.4, -0.2)).toBe(true);
    expect(g.isSolid(5, 5, 5)).toBe(true);
    expect(g.isSolid(3, 0, -1)).toBe(false);
  });

  it("isSolid works when passed around unbound", () => {
    const g = new VoxelGrid();
    g.set(0, 0, 0, blockId("stone"));
    const { isSolid } = g;
    expect(isSolid(0, 0, 0)).toBe(true);
  });

  it("iterates decoded coordinates", () => {
    const g = new VoxelGrid();
    g.set(-1, 2, 3, blockId("leaf"));
    g.set(4, -5, -6, blockId("roof"));
    const seen: string[] = [];
    g.forEach((x, y, z, id) => seen.push(`${x},${y},${z}:${blockDef(id)!.name}`));
    expect(seen.sort()).toEqual(["-1,2,3:leaf", "4,-5,-6:roof"]);
  });

  it("rejects non-integer or out-of-range writes", () => {
    const g = new VoxelGrid();
    expect(() => g.set(0.5, 0, 0, 1)).toThrow();
    expect(() => g.set(5000, 0, 0, 1)).toThrow();
  });
});
