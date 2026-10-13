import { describe, expect, it } from "vitest";
import { buildRail, railPoint, railTangent, rideProgress } from "@/world/engine/traversal/rail";

const a = { x: 50.75, y: 4, z: -0.3 };
const b = { x: 58.0, y: 11, z: -14.8 };

describe("buildRail / railPoint", () => {
  const rail = buildRail(a, b, 2);

  it("starts and ends at the stations", () => {
    expect(railPoint(rail, 0)).toEqual(a);
    const end = railPoint(rail, 1);
    expect(end.x).toBeCloseTo(b.x, 9);
    expect(end.y).toBeCloseTo(b.y, 9);
    expect(end.z).toBeCloseTo(b.z, 9);
  });

  it("dips below the straight line in the middle", () => {
    const mid = railPoint(rail, 0.5);
    expect(mid.y).toBeCloseTo((a.y + b.y) / 2 - 2, 9);
  });

  it("is the same curve in both directions", () => {
    const back = buildRail(b, a, 2);
    for (const u of [0, 0.13, 0.5, 0.77, 1]) {
      const p = railPoint(rail, u), q = railPoint(back, 1 - u);
      expect(p.x).toBeCloseTo(q.x, 9);
      expect(p.y).toBeCloseTo(q.y, 9);
      expect(p.z).toBeCloseTo(q.z, 9);
    }
  });

  it("clamps u outside [0, 1]", () => {
    expect(railPoint(rail, -1)).toEqual(railPoint(rail, 0));
    expect(railPoint(rail, 2)).toEqual(railPoint(rail, 1));
  });
});

describe("railTangent", () => {
  it("is a unit vector pointing toward the far station", () => {
    const rail = buildRail(a, b, 2);
    const t = railTangent(rail, 0.3);
    expect(Math.hypot(t.x, t.y, t.z)).toBeCloseTo(1, 9);
    const dir = { x: b.x - a.x, z: b.z - a.z };
    expect(t.x * dir.x + t.z * dir.z).toBeGreaterThan(0);
  });
});

describe("rideProgress", () => {
  it("eases in and out between 0 and 1", () => {
    expect(rideProgress(0, 5)).toBe(0);
    expect(rideProgress(2.5, 5)).toBeCloseTo(0.5, 9);
    expect(rideProgress(5, 5)).toBe(1);
    expect(rideProgress(9, 5)).toBe(1);
    expect(rideProgress(-1, 5)).toBe(0);
    expect(rideProgress(0.5, 5)).toBeLessThan(0.1);
    let prev = 0;
    for (let t = 0; t <= 5; t += 0.1) { const v = rideProgress(t, 5); expect(v).toBeGreaterThanOrEqual(prev); prev = v; }
  });
});
