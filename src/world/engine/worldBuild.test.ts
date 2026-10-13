import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { buildLayout } from "@/world/engine/gen/layout";
import { mulberry32 } from "@/world/engine/gen/rng";
import { blockId } from "@/world/engine/voxel/blocks";
import { buildBatch } from "@/world/engine/voxel/mesher";
import { buildWorld } from "@/world/engine/worldBuild";

const layout = buildLayout(worldProjects);

describe("buildWorld", () => {
  it("stamps every island at its origin with walkable air above", () => {
    const { grid, shapes } = buildWorld(layout);
    for (const isl of layout.islands) {
      expect(grid.isSolid(isl.origin.x, isl.origin.y, isl.origin.z)).toBe(true);
      expect(grid.isSolid(isl.origin.x, isl.origin.y + 1, isl.origin.z)).toBe(false);
      expect(shapes[isl.id].surface(0, 0)).toBe(0);
    }
  });

  it("meshes one non-empty batch per island", () => {
    const { batches } = buildWorld(layout);
    expect(Object.keys(batches).sort()).toEqual(layout.islands.map((i) => i.id).sort());
    for (const id of Object.keys(batches)) expect(batches[id].count).toBeGreaterThan(0);
  });

  it("never meshes a block twice", () => {
    const { grid, batches } = buildWorld(layout);
    const total = Object.values(batches).reduce((s, b) => s + b.count, 0);
    expect(total).toBe(buildBatch(grid, () => true, mulberry32(1)).count);
  });

  it("runs extra stamps before meshing", () => {
    const plain = buildWorld(layout);
    const stamped = buildWorld(layout, [
      (g) => g.set(0, 4, 0, blockId("crate")),
      (g) => g.set(1, 4, 0, blockId("barrier")),
    ]);
    expect(stamped.grid.isSolid(0, 4, 0)).toBe(true);
    expect(stamped.grid.isSolid(1, 4, 0)).toBe(true);
    expect(stamped.batches.hero.count).toBe(plain.batches.hero.count + 1);
  });

  it("is deterministic", () => {
    const a = buildWorld(layout), b = buildWorld(layout);
    expect(Array.from(a.batches.gtid.colors)).toEqual(Array.from(b.batches.gtid.colors));
  });
});
