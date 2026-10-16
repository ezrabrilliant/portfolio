import { describe, expect, it } from "vitest";
import { BIRD, birdOffset, butterflyAt, chickenAt, createBird, stepBird, wingFlap } from "./motion";

describe("critters", () => {
  it("keeps a butterfly near its anchor, above the grass", () => {
    const a = { x: 3, y: 10, z: -2 };
    const p = { x: 0, y: 0, z: 0 };
    for (let t = 0; t < 30; t += 0.37) {
      butterflyAt(a, 1.2, t, p);
      expect(Math.hypot(p.x - a.x, p.z - a.z)).toBeLessThan(1.7);
      expect(p.y).toBeGreaterThan(a.y + 0.4);
      expect(wingFlap(t, 1)).toBeGreaterThan(0);
    }
  });

  it("flies a bird off when Ezra comes near and brings it back once he is gone", () => {
    const b = createBird();
    stepBird(b, 10, 0.1);
    expect(b.mode).toBe("perch");
    stepBird(b, 2, 0.1);
    expect(b.mode).toBe("away");
    const o = { x: 0, y: 0, z: 0 };
    for (let t = 0; t < BIRD.flight + 0.1; t += 0.1) stepBird(b, 2, 0.1);
    expect(birdOffset(b, { x: 1, z: 0 }, o)).toBe(false);
    for (let t = 0; t < BIRD.gone + 1 && b.mode !== "back"; t += 0.1) stepBird(b, 10, 0.1);
    expect(b.mode).toBe("back");
    for (let t = 0; t < BIRD.flight + 0.2; t += 0.1) stepBird(b, 10, 0.1);
    expect(b.mode).toBe("perch");
    expect(birdOffset(b, { x: 1, z: 0 }, o)).toBe(true);
    expect(o).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("walks the chicken round its spot, pecking part of the time", () => {
    let pecks = 0;
    for (let t = 0; t < 40; t += 0.1) {
      const c = chickenAt(t, 0.5);
      expect(Math.hypot(c.x, c.z)).toBeCloseTo(0.5, 6);
      if (c.pecking) pecks++;
    }
    expect(pecks).toBeGreaterThan(100);
    expect(pecks).toBeLessThan(300);
  });
});
