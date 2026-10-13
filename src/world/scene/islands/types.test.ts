import { describe, expect, it } from "vitest";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { VIEW_F, VIEW_R, defaultTourStop, islandTop } from "./types";

const p: IslandPlacement = { id: "gtid", kind: "star", district: "game", origin: { x: 22, y: 2, z: -8 }, radius: 9, depth: 7, seed: 1 };

describe("tour framing helpers", () => {
  it("islandTop is the centre of the walkable surface", () => {
    expect(islandTop(p)).toEqual({ x: 22.5, y: 3, z: -7.5 });
  });

  it("VIEW_F and VIEW_R are unit length and perpendicular", () => {
    expect(Math.hypot(VIEW_F.x, VIEW_F.z)).toBeCloseTo(1, 2);
    expect(Math.hypot(VIEW_R.x, VIEW_R.z)).toBeCloseTo(1, 2);
    expect(VIEW_F.x * VIEW_R.x + VIEW_F.z * VIEW_R.z).toBeCloseTo(0, 2);
  });

  it("defaultTourStop looks along VIEW_F and puts the island right of centre", () => {
    const s = defaultTourStop(p);
    const dx = s.target.x - s.camera.x;
    const dz = s.target.z - s.camera.z;
    const len = Math.hypot(dx, dz);
    expect(dx / len).toBeCloseTo(VIEW_F.x, 2);
    expect(dz / len).toBeCloseTo(VIEW_F.z, 2);
    const top = islandTop(p);
    const sideways = (top.x - s.target.x) * VIEW_R.x + (top.z - s.target.z) * VIEW_R.z;
    expect(sideways).toBeGreaterThan(2);
    expect(s.camera.y).toBeGreaterThan(top.y);
    expect(s.id).toBe("gtid");
    expect(s.dwell).toBe(1);
  });

  it("respects options", () => {
    const s = defaultTourStop(p, { distance: 10, height: 4, shift: 0, dwell: 2 });
    // VIEW_F/VIEW_R are rounded to 3 decimals (not exactly unit length, see the test above),
    // so distances derived from them are only accurate to ~3 decimals, not 4.
    expect(Math.hypot(s.target.x - s.camera.x, s.target.z - s.camera.z)).toBeCloseTo(10, 2);
    expect(s.camera.y - s.target.y).toBeCloseTo(4, 4);
    expect(s.dwell).toBe(2);
  });
});
