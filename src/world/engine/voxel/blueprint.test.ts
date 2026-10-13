import { describe, expect, it } from "vitest";
import { blockId } from "@/world/engine/voxel/blocks";
import { stampBlueprint, type Blueprint } from "@/world/engine/voxel/blueprint";
import { VoxelGrid } from "@/world/engine/voxel/grid";

describe("stampBlueprint", () => {
  const bp: Blueprint = {
    layers: [
      { y: 0, rows: ["#.#", "...", "#.#"] },
      { y: 1, rows: ["W"] },
    ],
    legend: { "#": "stone", W: "wood" },
  };

  it("places blocks centred on the origin, skipping air", () => {
    const g = new VoxelGrid();
    stampBlueprint(g, bp, { x: 10, y: 5, z: -3 });
    expect(g.get(9, 5, -4)).toBe(blockId("stone"));
    expect(g.get(11, 5, -4)).toBe(blockId("stone"));
    expect(g.get(9, 5, -2)).toBe(blockId("stone"));
    expect(g.get(11, 5, -2)).toBe(blockId("stone"));
    expect(g.get(10, 5, -3)).toBe(0);
    expect(g.get(10, 6, -3)).toBe(blockId("wood"));
    expect(g.size).toBe(5);
  });

  it("centres ragged rows on the widest row", () => {
    const g = new VoxelGrid();
    stampBlueprint(g, { layers: [{ y: 0, rows: ["#####", "#"] }], legend: { "#": "plank" } }, { x: 0, y: 0, z: 0 });
    expect(g.get(-2, 0, -1)).toBe(blockId("plank"));
    expect(g.get(2, 0, -1)).toBe(blockId("plank"));
    expect(g.get(-2, 0, 0)).toBe(blockId("plank"));
    expect(g.get(-1, 0, 0)).toBe(0);
  });

  it("treats spaces as air", () => {
    const g = new VoxelGrid();
    stampBlueprint(g, { layers: [{ y: 2, rows: ["# #"] }], legend: { "#": "crate" } }, { x: 0, y: 0, z: 0 });
    expect(g.size).toBe(2);
    expect(g.get(-1, 2, 0)).toBe(blockId("crate"));
  });

  it("throws on characters missing from the legend", () => {
    expect(() => stampBlueprint(new VoxelGrid(), { layers: [{ y: 0, rows: ["?"] }], legend: {} }, { x: 0, y: 0, z: 0 }))
      .toThrow(/no legend entry for "\?"/);
  });
});
