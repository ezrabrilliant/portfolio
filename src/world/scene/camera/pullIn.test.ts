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
});
