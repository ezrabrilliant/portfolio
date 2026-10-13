import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { buildLayout } from "@/world/engine/gen/layout";
import { VoxelGrid } from "@/world/engine/voxel/grid";
import { blockId } from "@/world/engine/voxel/blocks";
import { bridgeCells } from "./geometry";
import { stampCrossings } from "./stamp";

describe("stampCrossings", () => {
  const layout = buildLayout(worldProjects);
  it("makes every bridge deck solid and leaves existing blocks alone", () => {
    const grid = new VoxelGrid();
    const keep = blockId("grass");
    const bridge = layout.crossings.find((c) => c.kind === "bridge")!;
    const first = bridgeCells(bridge.a, bridge.b)[0];
    grid.set(first.x, first.y, first.z, keep);
    stampCrossings(grid, layout);
    for (const c of bridgeCells(bridge.a, bridge.b)) expect(grid.isSolid(c.x, c.y, c.z)).toBe(true);
    expect(grid.get(first.x, first.y, first.z)).toBe(keep);
  });
});
