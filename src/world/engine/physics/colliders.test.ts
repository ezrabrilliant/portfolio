import { describe, expect, it } from "vitest";
import { ColliderSet, colliderBounds, overlaps, type Collider } from "./colliders";

const post: Collider = { x: 0.5, y: 1, z: 0.5, hx: 0.1, hy: 1, hz: 0.1, ry: 0 };
const box = (x: number, z: number, h = 0.3) => ({ x0: x - h, y0: 0, z0: z - h, x1: x + h, y1: 1.8, z1: z + h });

describe("colliders", () => {
  it("overlap a box only where the post really is", () => {
    expect(overlaps(box(0.5, 0.5), post)).toBe(true);
    expect(overlaps(box(0.5, 0.95), post)).toBe(false); // 0.3 + 0.1 short of the post
    expect(overlaps(box(0.5, 0.85), post)).toBe(true);
  });

  it("test turned panels on their own axes, not their bounds", () => {
    const panel: Collider = { x: 0, y: 1, z: 0, hx: 1, hy: 0.5, hz: 0.03, ry: Math.PI / 4 };
    const b = colliderBounds(panel);
    expect(b.x1).toBeCloseTo(Math.SQRT1_2 + 0.03 * Math.SQRT1_2, 6);
    // a box in the bounds' corner, away from the diagonal panel
    expect(overlaps({ x0: 0.4, y0: 0, z0: 0.4, x1: 0.7, y1: 1.8, z1: 0.7 }, panel)).toBe(false);
    expect(overlaps({ x0: 0.3, y0: 0, z0: -0.6, x1: 0.6, y1: 1.8, z1: -0.3 }, panel)).toBe(true);
  });

  it("separate on y", () => {
    expect(overlaps({ ...box(0.5, 0.5), y0: 2, y1: 3.8 }, post)).toBe(false);
  });

  it("find colliders through their buckets, tops and touched cells", () => {
    const set = new ColliderSet([post, { x: 5.5, y: 0.45, z: 5.5, hx: 0.4, hy: 0.45, hz: 0.4, ry: 0, what: "gentong" }]);
    expect(set.hits(box(0.5, 0.5))).toBe(true);
    expect(set.hits(box(3, 3))).toBe(false);
    expect(set.topOf(box(5.5, 5.5))).toBeCloseTo(0.9, 9);
    expect(set.touchesCell(5, 0, 5)).toBe(true);
    expect(set.touchesCell(5, 1, 5)).toBe(false);
    expect(set.touchesCell(1, 0, 0)).toBe(false);
  });
});
