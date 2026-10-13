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
  });

  it("clears the O's faces wherever the ring crosses its bars (front arc in front, back arc behind)", () => {
    const S = ORBIT_LOGO.size / ORBIT_LOGO.src;
    const outer = ORBIT_LOGO.outer.map(([x, y]) => toTile(x, y));
    const hole = ORBIT_LOGO.hole.map(([x, y]) => toTile(x, y));
    const c = toTile(ORBIT_LOGO.ringCenter[0], ORBIT_LOGO.ringCenter[1]);
    const cos = Math.cos(ORBIT_LOGO.ringTilt);
    const sin = Math.sin(ORBIT_LOGO.ringTilt);
    const [a, b, r] = [ORBIT_LOGO.ra * S, ORBIT_LOGO.rb * S, ORBIT_LOGO.tube];
    const face = ORBIT_LOGO.depth / 2;
    let maxCos = 0;
    for (let i = 0; i < 1440; i++) {
      const th = (i / 1440) * Math.PI * 2;
      const p = ringPoint(th);
      const l = Math.hypot(b * Math.cos(th), a * Math.sin(th));
      const n = { x: (b * Math.cos(th)) / l, y: (-a * Math.sin(th)) / l };
      // the tube's whole cross-section, not just its centre line
      const over = [-r, 0, r].some((d) => {
        const x = p.x + n.x * d;
        const y = p.y + n.y * d;
        const q = { x: c.x + x * cos - y * sin, y: c.y + x * sin + y * cos };
        return pointInPolygon(q, outer) && !pointInPolygon(q, hole);
      });
      if (!over) continue;
      maxCos = Math.max(maxCos, Math.abs(Math.cos(th)));
      if (p.z > 0) expect(p.z - r, `front at θ ${th.toFixed(3)}`).toBeGreaterThan(face);
      else expect(p.z + r, `back at θ ${th.toFixed(3)}`).toBeLessThan(-face);
    }
    expect(maxCos).toBeGreaterThan(0.85); // the check reached the bars' outer edges
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
