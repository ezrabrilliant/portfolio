import { describe, expect, it } from "vitest";
import { PALETTE, treeBlocks } from "./props";

describe("treeBlocks", () => {
  it("is deterministic for a seed", () => {
    expect(treeBlocks(2, -1, 3, 5)).toEqual(treeBlocks(2, -1, 3, 5));
  });
  it("has an h-block trunk on the ground and all leaves above it", () => {
    const blocks = treeBlocks(0, 0, 3, 9);
    const trunk = blocks.filter((b) => b.c === PALETTE.wood);
    expect(trunk.map((b) => b.y)).toEqual([0.5, 1.5, 2.5]);
    for (const leaf of blocks.filter((b) => b.c !== PALETTE.wood)) expect(leaf.y).toBeGreaterThan(3);
  });
});
