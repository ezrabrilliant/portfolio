import { describe, expect, it } from "vitest";
import { hashString, mulberry32, rngFor } from "@/world/engine/gen/rng";

describe("hashString (FNV-1a 32-bit)", () => {
  it("matches the published test vectors", () => {
    expect(hashString("")).toBe(2166136261);
    expect(hashString("a")).toBe(3826002220);
    expect(hashString("foobar")).toBe(3214735720);
  });

  it("returns an unsigned 32-bit integer", () => {
    const h = hashString("orbit-store");
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });
});

describe("mulberry32", () => {
  it("is deterministic for a seed", () => {
    const a = mulberry32(1234), b = mulberry32(1234);
    for (let i = 0; i < 50; i++) expect(a()).toBe(b());
  });

  it("differs between seeds", () => {
    const a = mulberry32(1), b = mulberry32(2);
    const sa = Array.from({ length: 5 }, a), sb = Array.from({ length: 5 }, b);
    expect(sa).not.toEqual(sb);
  });

  it("stays in [0, 1) and is roughly uniform", () => {
    const r = mulberry32(99);
    let sum = 0;
    for (let i = 0; i < 2000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      sum += v;
    }
    expect(sum / 2000).toBeGreaterThan(0.45);
    expect(sum / 2000).toBeLessThan(0.55);
  });
});

describe("rngFor", () => {
  it("seeds from the id hash", () => {
    const a = rngFor("gtid"), b = mulberry32(hashString("gtid"));
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });
});
