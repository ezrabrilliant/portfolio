import { describe, expect, it } from "vitest";
import { hitAt, uvToLogical, type HitRegion } from "./types";

const regions: HitRegion[] = [
  { x: 0, y: 0, w: 100, h: 100, action: "card", arg: 1 },
  { x: 40, y: 40, w: 20, h: 20, action: "badge" },
  { x: 200, y: 0, w: 50, h: 30, action: "pay" },
];

describe("hitAt", () => {
  it("returns the region under the point", () => {
    expect(hitAt(regions, 10, 10)).toEqual(regions[0]);
    expect(hitAt(regions, 220, 15)?.action).toBe("pay");
  });

  it("prefers the last (topmost) region where regions overlap", () => {
    expect(hitAt(regions, 50, 50)?.action).toBe("badge");
  });

  it("counts the edges as inside", () => {
    expect(hitAt(regions, 100, 100)?.action).toBe("card");
    expect(hitAt(regions, 250, 30)?.action).toBe("pay");
  });

  it("returns null on a miss or without regions", () => {
    expect(hitAt(regions, 150, 50)).toBeNull();
    expect(hitAt(regions, -1, 10)).toBeNull();
    expect(hitAt([], 10, 10)).toBeNull();
  });
});

describe("uvToLogical", () => {
  const logical = { w: 640, h: 400 };

  it("maps uv (origin bottom-left, y up) to logical units (origin top-left, y down)", () => {
    expect(uvToLogical({ x: 0, y: 1 }, logical)).toEqual({ x: 0, y: 0 });
    expect(uvToLogical({ x: 1, y: 0 }, logical)).toEqual({ x: 640, y: 400 });
    expect(uvToLogical({ x: 0.5, y: 0.25 }, logical)).toEqual({ x: 320, y: 300 });
  });
});
