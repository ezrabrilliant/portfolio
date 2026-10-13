import { describe, expect, it } from "vitest";
import { ORBIT_LOGO, pointInPolygon, ringPoint, toTile } from "./logoMath";

describe("Orbit logo geometry", () => {
  it("passes the ring in front of the O at the bottom and behind it at the top", () => {
    for (let k = 1; k < 12; k++) {
      const p = ringPoint((k / 12) * Math.PI);
      expect(p.y).toBeLessThan(0);
      expect(p.z).toBeGreaterThan(0);
    }
    for (let k = 13; k < 24; k++) {
      const p = ringPoint((k / 12) * Math.PI);
      expect(p.y).toBeGreaterThan(0);
      expect(p.z).toBeLessThan(0);
    }
  });

  it("keeps the back of the ring between the O and the tile face", () => {
    const deepest = -ORBIT_LOGO.rd - ORBIT_LOGO.tube;
    expect(deepest).toBeGreaterThan(-ORBIT_LOGO.standoff);
    expect(-ORBIT_LOGO.rd * Math.sin(Math.acos(0.75))).toBeLessThan(-0.1); // crossing the O's bars: behind its back face
  });

  it("puts the hole inside the outline and the mark inside the 2.2 tile", () => {
    const outer = ORBIT_LOGO.outer.map(([x, y]) => toTile(x, y));
    const hole = ORBIT_LOGO.hole.map(([x, y]) => toTile(x, y));
    const centroid = { x: hole.reduce((s, p) => s + p.x, 0) / 4, y: hole.reduce((s, p) => s + p.y, 0) / 4 };
    expect(pointInPolygon(centroid, outer)).toBe(true);
    for (const p of hole) expect(pointInPolygon(p, outer)).toBe(true);
    for (const p of outer) {
      expect(Math.abs(p.x)).toBeLessThan(ORBIT_LOGO.size / 2);
      expect(Math.abs(p.y)).toBeLessThan(ORBIT_LOGO.size / 2);
    }
  });
});
