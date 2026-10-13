import { describe, expect, it } from "vitest";
import { VoxelGrid } from "@/world/engine/voxel/grid";
import { blockId } from "@/world/engine/voxel/blocks";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { boxCells, islandFrame, postCells, stampCells, worldOf, worldTuple } from "./local";

const P: IslandPlacement = { id: "t", kind: "star", district: "game", origin: { x: 10, y: 2, z: -4 }, radius: 8, depth: 6, seed: 1 };

describe("island local frame", () => {
  it("puts local (0,0,0) on the surface of the centre column", () => {
    expect(islandFrame(P)).toEqual([10.5, 3, -3.5]);
    expect(worldOf(P, 1, 2, -1)).toEqual({ x: 11.5, y: 5, z: -4.5 });
    expect(worldTuple(P, 0, 0, 0)).toEqual([10.5, 3, -3.5]);
  });

  it("builds inclusive boxes and 2-high posts at the nearest column", () => {
    expect(boxCells(0, 1, 0, 0, 0, 2)).toHaveLength(6);
    expect(postCells(2.4, -0.6)).toEqual([[2, 0, -1], [2, 1, -1]]);
    expect(postCells(0, 0, 3)).toHaveLength(3);
  });

  it("stamps cells one row above the grass top", () => {
    const g = new VoxelGrid();
    stampCells(g, P, [[1, 0, -1]]);
    expect(g.get(11, 3, -5)).toBe(blockId("barrier"));
    stampCells(g, P, [[0, 1, 0]], "plank");
    expect(g.get(10, 4, -4)).toBe(blockId("plank"));
  });
});
