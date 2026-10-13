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
  it("returns the heading toward the viewer it was aimed at", () => {
    const toCamera = { x: -0.33, z: 0.95 };
    const s = findSeat(disc(6), { x: 0, y: 0, z: 0 }, toCamera);
    expect(s.viewerHeading).toBeCloseTo(Math.atan2(-0.33, 0.95), 6);
    expect(s.heading).toBeCloseTo(0, 6); // still snapped to the +Z face
  });

  describe("with stamped blocks (world-space isSolid)", () => {
    // square top |x|,|z| ≤ 4 at y 0, origin (0, 0, 0): without stamps the seat cell is (−3, 4), seat (−2.5, 1, 5 − inset)
    const square: IslandShape = { cells: [], surface: (x, z) => (Math.abs(x) <= 4 && Math.abs(z) <= 4 ? 0 : null) };
    const origin = { x: 0, y: 0, z: 0 };
    const dir = { x: -VIEW_F.x, z: -VIEW_F.z };
    const stamped = (...blocks: Array<[number, number, number]>) => {
      const set = new Set(blocks.map((b) => b.join(",")));
      return (x: number, y: number, z: number) => (y <= 0 && Math.abs(x) <= 4 && Math.abs(z) <= 4) || set.has(`${x},${y},${z}`);
    };
    const cellOf = (s: { pos: { x: number; z: number } }) => [Math.floor(s.pos.x), Math.floor(s.pos.z)];

    it("keeps the best ledge when nothing is stamped near it", () => {
      expect(cellOf(findSeat(square, origin, dir, stamped([0, 1, 0], [0, 2, 0])))).toEqual([-3, 4]);
    });
    it("moves off a ledge with a prop on the seat cell", () => {
      const s = findSeat(square, origin, dir, stamped([-3, 1, 4]));
      expect(cellOf(s)).not.toEqual([-3, 4]);
      expect(s.heading).toBeCloseTo(0, 6);
    });
    it("moves off a ledge with a prop on a side cell (head height) or anything beyond the edge", () => {
      expect(cellOf(findSeat(square, origin, dir, stamped([-2, 2, 4])))).not.toEqual([-3, 4]);
      expect(cellOf(findSeat(square, origin, dir, stamped([-3, 0, 5])))).not.toEqual([-3, 4]); // e.g. a bridge deck
    });
    it("the seat it picks has room: its cell and both sides free for two blocks, the column beyond free", () => {
      const isSolid = stamped([-3, 1, 4], [-2, 2, 4], [-4, 1, 4], [-1, 0, 5]);
      const s = findSeat(square, origin, dir, isSolid);
      const [cx, cz] = cellOf(s);
      for (const dx of [-1, 0, 1]) for (const y of [1, 2]) expect(isSolid(cx + dx, y, cz)).toBe(false);
      for (const y of [0, 1, 2]) expect(isSolid(cx, y, cz + 1)).toBe(false);
      expect(Math.abs(cx - -3)).toBeLessThanOrEqual(4); // still the camera side of the +Z rim
    });
  });
});

