import { describe, expect, it } from "vitest";
import { layoutLines, layoutText } from "./voxelFont";

describe("voxel font", () => {
  it("lays out a narrow I as 9 cells, 3 wide", () => {
    const l = layoutText("I");
    expect(l.width).toBe(3);
    expect(l.cells).toHaveLength(9);
  });
  it("adds one empty column between glyphs", () => {
    expect(layoutText("GTID.").width).toBe(23); // 5 + 5 + 3 + 5 + 1 + 4 gaps
  });
  it("rejects glyphs it does not have", () => {
    expect(() => layoutText("Q")).toThrow("Unsupported glyph: Q");
  });
  it("centres multiple lines and stacks them with a 2-row gap", () => {
    const l = layoutLines(["EZRA", "BRILLIANT"]);
    expect(l.width).toBe(49);
    expect(l.height).toBe(12);
    for (const c of l.cells) {
      expect(Math.abs(c.x)).toBeLessThanOrEqual(l.width / 2);
      expect(c.y).toBeGreaterThan(0);
      expect(c.y).toBeLessThan(l.height);
    }
  });
});
