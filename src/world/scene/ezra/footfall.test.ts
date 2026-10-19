import { describe, expect, it } from "vitest";
import { fallWind, footfalls, landingRing, landingWeight, surfaceOfBlock } from "./footfall";

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

describe("landing and falling sounds", () => {
  it("a landing grows louder and lower with the drop, with a thump under a big one only", () => {
    const hop = landingWeight(0.5), roof = landingWeight(4), sky = landingWeight(20);
    expect(hop.heavy).toBe(0);
    expect(roof.heavy).toBeGreaterThan(0);
    expect(sky.heavy).toBe(1);
    expect(roof.volume).toBeGreaterThan(hop.volume);
    expect(roof.rate).toBeLessThan(hop.rate);
    expect(sky.volume).toBeLessThanOrEqual(1);
  });
  it("the rush of air is silent rising or in a hop, and full in a long fall", () => {
    expect(fallWind(5)).toBe(0);
    expect(fallWind(-4)).toBe(0);
    expect(fallWind(-12)).toBeGreaterThan(0);
    expect(fallWind(-40)).toBe(1);
  });
});
