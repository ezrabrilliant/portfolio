import { describe, expect, it } from "vitest";
import { hexToRgb } from "@/world/engine/color";
import { mulberry32 } from "@/world/engine/gen/rng";
import { blockId } from "@/world/engine/voxel/blocks";
import { VoxelGrid } from "@/world/engine/voxel/grid";
import { buildBatch } from "@/world/engine/voxel/mesher";

const all = () => true;

function cube(n: number, name: "stone" | "grass" = "stone"): VoxelGrid {
  const g = new VoxelGrid();
  for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) g.set(x, y, z, blockId(name));
  return g;
}

describe("hexToRgb", () => {
  it("parses #RRGGBB to sRGB 0..1", () => {
    expect(hexToRgb("#ff8000")).toEqual([1, 128 / 255, 0]);
    expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
  });
});

describe("buildBatch", () => {
  it("emits one centred instance for a lone block", () => {
    const g = new VoxelGrid();
    g.set(0, 0, 0, blockId("stone"));
    const b = buildBatch(g, all, mulberry32(1));
    expect(b.count).toBe(1);
    expect(Array.from(b.positions)).toEqual([0.5, 0.5, 0.5]);
    expect(b.colors.length).toBe(3);
  });

  it("skips fully enclosed blocks", () => {
    expect(buildBatch(cube(3), all, mulberry32(1)).count).toBe(26);
  });

  it("skips invisible blocks and treats them as exposure for neighbours", () => {
    const g = cube(3);
    g.set(1, 2, 1, blockId("barrier"));                 // replace the top-centre block
    const b = buildBatch(g, all, mulberry32(1));
    // 26 shell blocks minus the barrier (invisible) plus the now-exposed centre block
    expect(b.count).toBe(26);
    const centres: string[] = [];
    for (let i = 0; i < b.count; i++) centres.push(`${b.positions[i * 3]},${b.positions[i * 3 + 1]},${b.positions[i * 3 + 2]}`);
    expect(centres).toContain("1.5,1.5,1.5");
    expect(centres).not.toContain("1.5,2.5,1.5");
  });

  it("honours the filter", () => {
    const b = buildBatch(cube(3), (x) => x === 0, mulberry32(1));
    expect(b.count).toBe(9);
  });

  it("produces deterministic colours inside [0, 1]", () => {
    const a = buildBatch(cube(3, "grass"), all, mulberry32(5));
    const b = buildBatch(cube(3, "grass"), all, mulberry32(5));
    expect(Array.from(a.colors)).toEqual(Array.from(b.colors));
    for (const c of a.colors) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
  });
});
