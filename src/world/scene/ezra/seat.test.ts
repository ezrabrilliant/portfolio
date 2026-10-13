import { describe, expect, it } from "vitest";
import type { IslandShape } from "@/world/engine/gen/islandGen";
import { findSeat } from "./seat";

const disc = (r: number): IslandShape => ({
  cells: [],
  surface: (x, z) => (Math.hypot(x, z) <= r ? 0 : null),
});

describe("findSeat", () => {
  it("sits on the rim toward the given direction, on the walkable surface", () => {
    const s = findSeat(disc(4), { x: 10, y: 2, z: -3 }, { x: 0, z: 1 });
    expect(s.pos.y).toBe(3);
    expect(s.pos.x).toBeCloseTo(10.5, 6);
    expect(s.pos.z).toBeCloseTo(-3 + 4 + 1, 6); // last solid cell z=4 → its far face at local z=5
    expect(s.heading).toBeCloseTo(0, 6);
  });
  it("faces outward along the direction", () => {
    const s = findSeat(disc(3), { x: 0, y: 0, z: 0 }, { x: -1, z: 0 });
    expect(s.heading).toBeCloseTo(-Math.PI / 2, 6);
    expect(s.pos.x).toBeLessThan(-2);
  });
});
