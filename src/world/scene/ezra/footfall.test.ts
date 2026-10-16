import { describe, expect, it } from "vitest";
import { footfalls, landingRing, surfaceOfBlock } from "./footfall";

describe("footfalls", () => {
  it("maps blocks to surfaces", () => {
    expect(surfaceOfBlock("grass")).toBe("grass");
    expect(surfaceOfBlock("plank")).toBe("wood");
    expect(surfaceOfBlock("stone")).toBe("stone");
    expect(surfaceOfBlock(undefined)).toBe("stone");
  });

  it("falls twice per stride", () => {
    expect(footfalls(0, Math.PI * 0.9)).toBe(0);
    expect(footfalls(Math.PI * 0.9, Math.PI * 1.1)).toBe(1);
    expect(footfalls(0, Math.PI * 2.01)).toBe(2);
  });

  it("rings bigger for higher drops, never for a step down", () => {
    expect(landingRing(0.4)).toBeNull();
    const small = landingRing(1)!, big = landingRing(5)!;
    expect(big.count).toBeGreaterThan(small.count);
    expect(big.speed).toBeGreaterThan(small.speed);
    expect(landingRing(100)!.count).toBeLessThanOrEqual(22);
  });
});
