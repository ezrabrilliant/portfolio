import { describe, expect, it } from "vitest";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { VIEW_F, VIEW_R, defaultTourStop, islandTop } from "./types";

const p: IslandPlacement = { id: "gtid", kind: "star", district: "game", origin: { x: 22, y: 2, z: -8 }, radius: 9, depth: 7, seed: 1 };

describe("tour framing helpers", () => {
  it("islandTop is the centre of the walkable surface", () => {
    expect(islandTop(p)).toEqual({ x: 22.5, y: 3, z: -7.5 });
  });

  it("VIEW_F and VIEW_R are unit length and perpendicular", () => {
    expect(Math.hypot(VIEW_F.x, VIEW_F.z)).toBeCloseTo(1, 10);
    expect(Math.hypot(VIEW_R.x, VIEW_R.z)).toBeCloseTo(1, 10);
    expect(VIEW_F.x * VIEW_R.x + VIEW_F.z * VIEW_R.z).toBeCloseTo(0, 10);
  });

  it("VIEW_F and VIEW_R match the contract values (0.582, −0.813) and (0.813, 0.582)", () => {
    expect(Math.abs(VIEW_F.x - 0.582)).toBeLessThan(2e-4);
    expect(Math.abs(VIEW_F.z + 0.813)).toBeLessThan(2e-4);
    expect(Math.abs(VIEW_R.x - 0.813)).toBeLessThan(2e-4);
    expect(Math.abs(VIEW_R.z - 0.582)).toBeLessThan(2e-4);
    // VIEW_R is the camera's right: forward × up = (−F.z, 0, F.x)
    expect(VIEW_R.x).toBe(-VIEW_F.z);
    expect(VIEW_R.z).toBe(VIEW_F.x);
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
    expect(Math.hypot(s.target.x - s.camera.x, s.target.z - s.camera.z)).toBeCloseTo(10, 4);
    expect(s.camera.y - s.target.y).toBeCloseTo(4, 4);
    expect(s.dwell).toBe(2);
  });
});
