import { describe, expect, it } from "vitest";
import type { IslandShape } from "@/world/engine/gen/islandGen";
import { VIEW_F } from "../islands/types";
import { SEAT_INSET, findSeat } from "./seat";

const disc = (r: number): IslandShape => ({
  cells: [],
  surface: (x, z) => (Math.hypot(x, z) <= r ? 0 : null),
});

describe("findSeat", () => {
  it("puts the seat on the walkable top, just behind the rim face toward the given direction", () => {
    const s = findSeat(disc(4), { x: 10, y: 2, z: -3 }, { x: 0, z: 1 });
    expect(s.pos.y).toBe(3);
    expect(s.pos.x).toBeCloseTo(10.5, 6);
    expect(s.pos.z).toBeCloseTo(-3 + 5 - SEAT_INSET, 6); // last solid cell z=4 → its outer face at local z=5
    expect(s.heading).toBeCloseTo(0, 6);
  });
  it("faces outward along the direction", () => {
    const s = findSeat(disc(3), { x: 0, y: 0, z: 0 }, { x: -1, z: 0 });
    expect(s.heading).toBeCloseTo(-Math.PI / 2, 6);
    expect(s.pos.x).toBeCloseTo(-3 + SEAT_INSET, 6);
  });
  it("on a straight edge, sits at the rim point toward a diagonal, facing the dominant axis", () => {
    const square: IslandShape = { cells: [], surface: (x, z) => (Math.abs(x) <= 4 && Math.abs(z) <= 4 ? 0 : null) };
    const s = findSeat(square, { x: 0, y: 0, z: 0 }, { x: -VIEW_F.x, z: -VIEW_F.z });
    expect(s.heading).toBeCloseTo(0, 6); // −VIEW_F is mostly +Z: sit on a +Z face, ~35° off the camera
    expect(s.pos.x).toBeCloseTo(-2.5, 6); // the ray toward the camera leaves the top at cell (−3, 4)
    expect(s.pos.z).toBeCloseTo(5 - SEAT_INSET, 6);
  });
  it("on a round rim, moves to the nearest straight ledge instead of a staircase corner", () => {
    const shape = disc(6);
    const s = findSeat(shape, { x: 0, y: 0, z: 0 }, { x: -VIEW_F.x, z: -VIEW_F.z });
    expect(s.heading).toBeCloseTo(0, 6);
    const cx = Math.floor(s.pos.x);
    const cz = Math.floor(s.pos.z);
    expect(s.pos.z).toBeCloseTo(cz + 1 - SEAT_INSET, 6); // on the top, just behind the cell's +Z face
    // the hips' cell and both side neighbours are solid with open air beyond their +Z faces: one straight ledge
    for (const dx of [-1, 0, 1]) {
      expect(shape.surface(cx + dx, cz)).not.toBeNull();
      expect(shape.surface(cx + dx, cz + 1)).toBeNull();
    }
    // and it stays near the camera-side rim point (−3, 5) on the diagonal
    expect(Math.hypot(cx - -3, cz - 5)).toBeLessThanOrEqual(2);
  });
});
