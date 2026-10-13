import { describe, expect, it } from "vitest";
import { pullIn } from "./pullIn";

describe("pullIn", () => {
  it("keeps the desired position when nothing blocks", () => {
    const to = { x: 0, y: 5, z: 8 };
    expect(pullIn({ x: 0, y: 2, z: 0 }, to, () => false)).toEqual(to);
  });
  it("stops in front of the first solid block", () => {
    const wall = (x: number, y: number, z: number) => z === 4 && y >= 0 && y < 10 && x >= -5 && x < 5;
    const p = pullIn({ x: 0.5, y: 2.5, z: 0.5 }, { x: 0.5, y: 2.5, z: 9.5 }, wall);
    expect(p.z).toBeLessThan(4);
    expect(p.z).toBeGreaterThan(2.5);
  });

  const wall = (x: number, y: number, z: number) => z === 4 && y >= 0 && y < 10 && x >= -5 && x < 5;

  it("backs off a fixed distance from the exact block face, so the near plane never clips it", () => {
    const p = pullIn({ x: 0.5, y: 2.5, z: 0.6 }, { x: 0.5, y: 2.5, z: 9.5 }, wall);
    expect(p.x).toBe(0.5);
    expect(p.y).toBe(2.5);
    expect(p.z).toBeCloseTo(3.75, 2);
  });

  it("stops at the same point whatever the ray length (no step quantisation jitter)", () => {
    for (const z of [4.3, 5.1, 6.3, 7.77, 9.5, 14]) {
      expect(pullIn({ x: 0.5, y: 2.5, z: 0.5 }, { x: 0.5, y: 2.5, z }, wall).z).toBeCloseTo(3.75, 2);
    }
  });

  it("returns the start point when the block is closer than the back-off", () => {
    const from = { x: 0.5, y: 2.5, z: 3.9 };
    expect(pullIn(from, { x: 0.5, y: 2.5, z: 9.5 }, wall)).toEqual(from);
  });
});
