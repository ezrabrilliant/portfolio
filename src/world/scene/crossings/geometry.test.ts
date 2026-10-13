import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { buildLayout } from "@/world/engine/gen/layout";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { buildRail, railPoint, railTangent } from "@/world/engine/traversal/rail";
import { buildWorld } from "@/world/engine/worldBuild";
import { bridgeCells, bridgePlanks, inset, minecartRail, padPair, railEnds, railLength, steppingStones } from "./geometry";

const a = { x: 0, y: 1, z: 0 };
const b = { x: 9, y: 3, z: 3 };

describe("bridgeCells", () => {
  const cells = bridgeCells(a, b);
  it("spans both anchors", () => {
    expect(Math.min(...cells.map((c) => c.x))).toBeLessThanOrEqual(0);
    expect(Math.max(...cells.map((c) => c.x))).toBeGreaterThanOrEqual(8);
  });
  it("rises in stairs of at most one block along the way", () => {
    const along = (c: { x: number; z: number }) => ((c.x + 0.5 - a.x) * (b.x - a.x) + (c.z + 0.5 - a.z) * (b.z - a.z)) / Math.hypot(b.x - a.x, b.z - a.z);
    const sorted = [...cells].sort((p, q) => along(p) - along(q));
    for (let i = 1; i < sorted.length; i++) expect(Math.abs(sorted[i].y - sorted[i - 1].y)).toBeLessThanOrEqual(1);
  });
  it("puts the deck one row under the walking surface", () => {
    const ys = cells.map((c) => c.y);
    expect(Math.min(...ys)).toBe(a.y - 1);
    expect(Math.max(...ys)).toBe(b.y - 1);
  });
});

describe("bridgePlanks", () => {
  it("lies flush with the stepped walking surface", () => {
    for (const p of bridgePlanks(a, b)) {
      expect(Math.abs(p.y + 0.09 - Math.round(p.y + 0.09))).toBeLessThan(1e-9);
      expect(p.s).toBeGreaterThanOrEqual(0);
      expect(p.s).toBeLessThanOrEqual(1);
    }
  });
});

describe("steppingStones", () => {
  const stones = steppingStones({ x: 0, y: 2, z: 0 }, { x: 12, y: 3, z: 0 });
  it("places reachable stones beside the bridge", () => {
    expect(stones.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < stones.length; i++) {
      // 1-block stones: ≤ 2.9 centre-to-center leaves a ≤ 1.9-block gap, inside the ~2.8-block walking jump
      const d = Math.hypot(stones[i].x - stones[i - 1].x, stones[i].z - stones[i - 1].z);
      expect(d).toBeLessThanOrEqual(2.9);
      expect(Math.abs(stones[i].y - stones[i - 1].y)).toBeLessThanOrEqual(1);
    }
    for (const s of stones) expect(Math.abs(s.z)).toBeGreaterThanOrEqual(2);
  });
});

const island = (id: string, x: number, y: number, z: number, r = 8): IslandPlacement => ({
  id, kind: "star", district: "game", origin: { x, y, z }, radius: r, depth: 6, seed: 1,
});

describe("inset / padPair / railEnds", () => {
  const from = island("f", 0, 2, 0);
  const to = island("t", 30, 8, 0);
  const crossing = { kind: "bouncePads" as const, from: "f", to: "t", a: { x: 8, y: 3, z: 0.5 }, b: { x: 22, y: 9, z: 0.5 } };
  it("moves an anchor toward its island centre", () => {
    const p = inset(crossing.a, from, 2);
    expect(p.x).toBeCloseTo(6, 1);
    expect(p.y).toBe(3);
  });
  it("snaps pads to block centres inside each island", () => {
    const { a: pa, b: pb } = padPair(crossing, from, to);
    expect(pa.x % 1).toBeCloseTo(0.5, 6);
    expect(pb.z % 1).toBeCloseTo(0.5, 6);
    expect(Math.hypot(pa.x - 0.5, pa.z - 0.5)).toBeLessThan(from.radius);
    expect(Math.hypot(pb.x - 30.5, pb.z - 0.5)).toBeLessThan(to.radius);
  });
  it("gives stations and stand points for a rail", () => {
    const e = railEnds({ ...crossing, kind: "minecart" }, from, to);
    expect(Math.hypot(e.standA.x - 0.5, e.standA.z - 0.5)).toBeLessThan(Math.hypot(e.stationA.x - 0.5, e.stationA.z - 0.5));
    expect(railLength(buildRail(e.stationA, e.stationB, 3))).toBeGreaterThan(Math.hypot(e.stationB.x - e.stationA.x, e.stationB.z - e.stationA.z));
  });
});

describe("minecartRail", () => {
  const layout = buildLayout(worldProjects);
  const world = buildWorld(layout);
  const byId = (id: string) => layout.islands.find((i) => i.id === id)!;
  const c = layout.crossings.find((x) => x.kind === "minecart")!;
  const ends = railEnds(c, byId(c.from), byId(c.to));
  const rail = minecartRail(ends, world.grid.isSolid);

  it("runs flat from station to station, 0.3 above the walking surface", () => {
    const a = railPoint(rail, 0);
    const b = railPoint(rail, 1);
    expect(a.y).toBeCloseTo(ends.stationA.y + 0.3, 6);
    expect(b.y).toBeCloseTo(ends.stationB.y + 0.3, 6);
    expect(Math.abs(railTangent(rail, 0.001).y)).toBeLessThan(0.1); // under 6°: the parked cart sits level
    expect(Math.abs(railTangent(rail, 0.999).y)).toBeLessThan(0.1);
  });

  it("never runs through an island: the track bed, cart and Ezra stay in open air", () => {
    for (let i = 0; i <= 400; i++) {
      const p = railPoint(rail, i / 400);
      const t = railTangent(rail, i / 400);
      const h = Math.hypot(t.x, t.z) || 1;
      for (const side of [-0.6, 0, 0.6]) {
        const x = Math.floor(p.x - (t.z / h) * side);
        const z = Math.floor(p.z + (t.x / h) * side);
        for (let y = Math.floor(p.y - 0.1); y <= Math.floor(p.y + 0.35 + 1.8); y++) expect(world.grid.isSolid(x, y, z)).toBe(false);
      }
    }
  });

  it("climbs no steeper than an ascending voxel rail and sags in the open gap", () => {
    let prev = railPoint(rail, 0);
    for (let i = 1; i <= 200; i++) {
      const p = railPoint(rail, i / 200);
      expect(Math.atan2(p.y - prev.y, Math.hypot(p.x - prev.x, p.z - prev.z))).toBeLessThanOrEqual(Math.PI / 4);
      prev = p;
    }
    const flat = minecartRail(ends, world.grid.isSolid, 0);
    expect(railPoint(rail, 0.5).y).toBeLessThan(railPoint(flat, 0.5).y - 0.5);
  });
});
