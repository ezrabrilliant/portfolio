import { describe, expect, it } from "vitest";
import { generateIsland } from "@/world/engine/gen/islandGen";

const spec = { radius: 6, depth: 6, seed: 42 };

describe("generateIsland", () => {
  it("is deterministic", () => {
    expect(JSON.stringify(generateIsland(spec).cells)).toBe(JSON.stringify(generateIsland(spec).cells));
  });

  it("changes with the seed", () => {
    expect(JSON.stringify(generateIsland(spec).cells)).not.toBe(JSON.stringify(generateIsland({ ...spec, seed: 43 }).cells));
  });

  it("has a grass top at y = 0 covering the centre", () => {
    const { cells, surface } = generateIsland(spec);
    expect(cells).toContainEqual({ x: 0, y: 0, z: 0, block: "grass" });
    expect(cells.filter((c) => c.y === 0).every((c) => c.block === "grass")).toBe(true);
    expect(cells.filter((c) => c.block === "grass").every((c) => c.y === 0)).toBe(true);
    expect(surface(0, 0)).toBe(0);
    expect(surface(40, 40)).toBeNull();
  });

  it("stays inside its footprint and depth", () => {
    const { cells } = generateIsland(spec);
    for (const c of cells) {
      expect(c.y).toBeLessThanOrEqual(0);
      expect(c.y).toBeGreaterThanOrEqual(-spec.depth);
      if (c.y === 0) expect(Math.hypot(c.x, c.z)).toBeLessThanOrEqual(spec.radius * 1.2 + 1e-9);
    }
  });

  it("tapers to a stone underside", () => {
    const { cells } = generateIsland(spec);
    const at = (y: number) => cells.filter((c) => c.y === y).length;
    expect(at(-3)).toBeGreaterThan(at(-spec.depth));
    expect(cells.some((c) => c.block === "stone")).toBe(true);
    expect(cells.some((c) => c.block === "earth")).toBe(true);
  });
});
