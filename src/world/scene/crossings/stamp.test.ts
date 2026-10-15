import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { buildLayout } from "@/world/engine/gen/layout";
import { VoxelGrid } from "@/world/engine/voxel/grid";
import { blockId } from "@/world/engine/voxel/blocks";
import { bridgeCells, steppingStones } from "./geometry";
import { stampCrossings } from "./stamp";

describe("stampCrossings", () => {
  const layout = buildLayout(worldProjects);
  it("stamps the stepping stones, leaves existing blocks alone, and leaves bridge decks to their ramps", () => {
    const grid = new VoxelGrid();
    const keep = blockId("grass");
    const bridge = layout.crossings.find((c) => c.kind === "bridge")!;
    const [first, ...rest] = steppingStones(bridge.a, bridge.b);
    grid.set(first.x, first.y, first.z, keep);
    stampCrossings(grid, layout);
    for (const st of rest) expect(grid.isSolid(st.x, st.y, st.z)).toBe(true);
    expect(grid.get(first.x, first.y, first.z)).toBe(keep);
    const mid = bridgeCells(bridge.a, bridge.b).filter((c) => grid.get(c.x, c.y, c.z) === blockId("barrier"));
    expect(mid).toEqual([]);
  });
});
