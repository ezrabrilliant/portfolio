import { describe, expect, it } from "vitest";
import { buildLayout } from "@/world/engine/gen/layout";
import { generateIsland } from "@/world/engine/gen/islandGen";
import { milestones, worldProjects } from "@/config/portfolio";
import { bridgeCells, steppingStones } from "@/world/scene/crossings/geometry";
import { FOOTPRINTS } from "@/world/scene/islands/layouts";
import { VIEW_F } from "@/world/scene/islands/types";
import { MILESTONE_BRIDGE, MILESTONE_LEG_TRAVEL, PILLAR_FOOT, PLAQUE_RY, milestoneCells, pillarCollider, milestoneSpots, milestoneSpotsFor, tourTravelWeights } from "./placement";

const layout = buildLayout(worldProjects);
const island = (id: string) => layout.islands.find((i) => i.id === id)!;
const bridge = layout.crossings.find((c) => c.from === MILESTONE_BRIDGE.from && c.to === MILESTONE_BRIDGE.to)!;
const years = milestones.map((m) => m.year);
const spots = milestoneSpots(bridge, island("hero"), island("gtid"), years);
const cheb = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z));
const cellsXZ = (s: (typeof spots)[number]) => milestoneCells(s).map((c) => ({ x: c.x, z: c.z }));

describe("milestone placement", () => {
  it("puts one pillar per year in order: the first on the hero, the last on GTID, the middle one on its own stone", () => {
    expect(bridge.kind).toBe("bridge");
    expect(spots.map((s) => s.year)).toEqual([2022, 2024, 2026]);
    expect(spots.map((s) => s.ownStone)).toEqual([false, true, false]);
    expect(milestoneSpotsFor(layout, years)).toEqual(spots);
  });

  it("stands the island pillars on grass beside the bridge heads, at walking height", () => {
    for (const [s, id, head] of [[spots[0], "hero", bridge.a], [spots[2], "gtid", bridge.b]] as const) {
      const p = island(id);
      const grass = new Set(generateIsland({ radius: p.radius, depth: p.depth, seed: p.seed }).cells.filter((c) => c.y === 0).map((c) => `${c.x},${c.z}`));
      expect(grass.has(`${Math.floor(s.pos.x) - p.origin.x},${Math.floor(s.pos.z) - p.origin.z}`), `${s.year} on grass`).toBe(true);
      expect(s.pos.y).toBe(p.origin.y + 1);
      const d = Math.hypot(s.pos.x - head.x, s.pos.z - head.z);
      expect(d, `${s.year} beside its bridge head`).toBeGreaterThanOrEqual(2);
      expect(d, `${s.year} beside its bridge head`).toBeLessThan(3.5);
    }
  });

  it("keeps every pillar and stone off the deck and a block clear of it and of the stepping stones", () => {
    const deck = bridgeCells(bridge.a, bridge.b);
    const stones = steppingStones(bridge.a, bridge.b);
    for (const s of spots) {
      for (const c of cellsXZ(s)) {
        for (const d of deck) expect(cheb(c, d), `${s.year} (${c.x},${c.z}) vs deck`).toBeGreaterThanOrEqual(s.ownStone ? 2 : 1);
        for (const st of stones) expect(cheb(c, st), `${s.year} (${c.x},${c.z}) vs stepping stone`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("puts the own stone's top at the deck's walking height there, every pillar on the side away from the stepping stones", () => {
    expect(spots[1].pos.y).toBe(Math.round((bridge.a.y + bridge.b.y) / 2));
    const u = { x: bridge.b.x - bridge.a.x, z: bridge.b.z - bridge.a.z };
    const side = (p: { x: number; z: number }) => Math.sign(u.x * (p.z - bridge.a.z) - u.z * (p.x - bridge.a.x));
    const first = steppingStones(bridge.a, bridge.b)[0];
    const stoneSide = side({ x: first.x + 0.5, z: first.z + 0.5 });
    for (const s of spots) expect(side(s.pos), `${s.year}`).toBe(-stoneSide);
  });

  it("stays clear of the hero's and GTID's props, one free block between", () => {
    for (const [s, id] of [[spots[0], "hero"], [spots[2], "gtid"]] as const) {
      const p = island(id);
      for (const [x, , z] of FOOTPRINTS[id]) {
        expect(cheb({ x: Math.floor(s.pos.x), z: Math.floor(s.pos.z) }, { x: p.origin.x + x, z: p.origin.z + z }), `${s.year} vs ${id} (${x},${z})`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("turns every plaque to face the tour camera", () => {
    for (const s of spots) {
      expect(s.ry).toBe(PLAQUE_RY);
      // a plaque facing +z turned by ry looks along (sin ry, cos ry): straight back along the camera's forward
      expect(Math.sin(s.ry) * VIEW_F.x + Math.cos(s.ry) * VIEW_F.z).toBeCloseTo(-1, 9);
    }
  });

  it("occupies a 3 × 3 stone slab and a keel block under the own stone, and no barrier: the pillar is a prop collider", () => {
    const own = milestoneCells(spots[1]);
    expect(own.filter((c) => c.block === "stone")).toHaveLength(10);
    expect(own.some((c) => c.block === "barrier")).toBe(false);
    expect(milestoneCells(spots[0])).toEqual([]);
  });

  it("collides each pillar as its turned plinth, standing on its ground, inside its own stone", () => {
    for (const s of spots) {
      const c = pillarCollider(s);
      expect(c.y - c.hy).toBeCloseTo(s.pos.y, 9);
      expect(c.ry).toBe(s.ry);
      expect([c.hx * 2, c.hz * 2]).toEqual([PILLAR_FOOT.w, PILLAR_FOOT.d]);
    }
    const c = pillarCollider(spots[1]);
    const reach = Math.hypot(c.hx, c.hz);
    expect(cheb({ x: c.x - reach, z: c.z }, { x: Math.floor(spots[1].pos.x) + 0.5, z: Math.floor(spots[1].pos.z) + 0.5 })).toBeLessThan(1.5);
  });

  it("slows the tour only on the milestone bridge's leg", () => {
    const w = tourTravelWeights(layout);
    expect(w).toHaveLength(layout.tourOrder.length - 1);
    expect(w[0]).toBe(MILESTONE_LEG_TRAVEL);
    expect(MILESTONE_LEG_TRAVEL).toBeGreaterThan(1);
    expect(w.slice(1).every((x) => x === 1)).toBe(true);
  });

  it("returns no spots when the layout has no hero → GTID bridge", () => {
    expect(milestoneSpotsFor({ ...layout, crossings: [] }, years)).toEqual([]);
  });
});
