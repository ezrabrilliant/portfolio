import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { buildLayout } from "@/world/engine/gen/layout";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { buildRail, railPoint, railTangent } from "@/world/engine/traversal/rail";
import { buildWorld } from "@/world/engine/worldBuild";
import { characterCollides, createCharacter, stepCharacter } from "@/world/engine/physics/character";
import type { Vec3 } from "@/world/engine/types";
import { bridgeCells, bridgeDeck, bridgePlanks, inset, minecartRail, padPair, railEnds, railLength, steppingStones } from "./geometry";
import type { DeckPlank } from "./geometry";
import { stampCrossings } from "./stamp";

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
  const up = railEnds(c, byId(c.from), byId(c.to));
  // the descending branch goes live if the higher island ever ends up on the "from" side
  const down = { ...up, stationA: up.stationB, stationB: up.stationA };

  for (const [name, ends] of [["climbing", up], ["descending", down]] as const) {
    const rail = minecartRail(ends, world.grid.isSolid);

    it(`runs flat from station to station, 0.3 above the walking surface (${name})`, () => {
      const a = railPoint(rail, 0);
      const b = railPoint(rail, 1);
      expect(a.y).toBeCloseTo(ends.stationA.y + 0.3, 6);
      expect(b.y).toBeCloseTo(ends.stationB.y + 0.3, 6);
      expect(Math.abs(railTangent(rail, 0.001).y)).toBeLessThan(0.1); // under 6°: the parked cart sits level
      expect(Math.abs(railTangent(rail, 0.999).y)).toBeLessThan(0.1);
    });

    it(`never runs through an island: the track bed, cart and Ezra stay in open air (${name})`, () => {
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

    it(`is never steeper than a voxel rail ramp and sags in the open gap (${name})`, () => {
      let prev = railPoint(rail, 0);
      for (let i = 1; i <= 200; i++) {
        const p = railPoint(rail, i / 200);
        expect(Math.abs(Math.atan2(p.y - prev.y, Math.hypot(p.x - prev.x, p.z - prev.z)))).toBeLessThanOrEqual(Math.PI / 4);
        prev = p;
      }
      const flat = minecartRail(ends, world.grid.isSolid, 0);
      let sag = 0;
      for (let i = 0; i <= 100; i++) sag = Math.min(sag, railPoint(rail, i / 100).y - railPoint(flat, i / 100).y);
      expect(sag).toBeLessThan(-0.5);
    });
  }
});

describe("every minecart in the world", () => {
  const layout = buildLayout(worldProjects);
  const world = buildWorld(layout);
  const byId = (id: string) => layout.islands.find((i) => i.id === id)!;
  const carts = layout.crossings.filter((x) => x.kind === "minecart");

  it("links Petak Umpet → Orbit Store and Ezra Bot → the Web & Apps plaza", () => {
    expect(carts.map((c) => `${c.from}>${c.to}`)).toEqual(["petak-umpet>orbit-store", "ezra-bot>web-plaza"]);
  });

  it("rides 26–34 blocks from Ezra Bot down to the plaza, never steeper than Petak Umpet → Orbit Store", () => {
    const [orbit, web] = carts.map((c) => minecartRail(railEnds(c, byId(c.from), byId(c.to)), world.grid.isSolid));
    const steepest = (rail: typeof web) => {
      let max = 0;
      let prev = railPoint(rail, 0);
      for (let i = 1; i <= 200; i++) {
        const p = railPoint(rail, i / 200);
        max = Math.max(max, Math.abs(Math.atan2(p.y - prev.y, Math.hypot(p.x - prev.x, p.z - prev.z))));
        prev = p;
      }
      return max;
    };
    expect(railLength(web)).toBeGreaterThanOrEqual(26);
    expect(railLength(web)).toBeLessThanOrEqual(34);
    expect(steepest(web)).toBeLessThanOrEqual(steepest(orbit));
  });

  for (const c of carts) {
    const rail = minecartRail(railEnds(c, byId(c.from), byId(c.to)), world.grid.isSolid);
    it(`runs in open air and never steeper than a voxel rail ramp (${c.from} → ${c.to})`, () => {
      let prev = railPoint(rail, 0);
      for (let i = 0; i <= 400; i++) {
        const p = railPoint(rail, i / 400);
        const t = railTangent(rail, i / 400);
        const h = Math.hypot(t.x, t.z) || 1;
        for (const side of [-0.6, 0, 0.6]) {
          const x = Math.floor(p.x - (t.z / h) * side);
          const z = Math.floor(p.z + (t.x / h) * side);
          for (let y = Math.floor(p.y - 0.1); y <= Math.floor(p.y + 0.35 + 1.8); y++) expect(world.grid.isSolid(x, y, z)).toBe(false);
        }
        if (i > 0) expect(Math.abs(Math.atan2(p.y - prev.y, Math.hypot(p.x - prev.x, p.z - prev.z)))).toBeLessThanOrEqual(Math.PI / 4);
        prev = p;
      }
    });
  }
});

describe("bridgeDeck on the stamped world", () => {
  const layout = buildLayout(worldProjects);
  const world = buildWorld(layout, [(g) => stampCrossings(g, layout)]);
  const isSolid = world.grid.isSolid;
  const bridges = layout.crossings.filter((x) => x.kind === "bridge");

  /** Height a character centred at (x, z) stands at (searching ±2 around `near`), or NaN in the air. */
  const floorAt = (x: number, z: number, near: number) => {
    for (let y = near + 2; y >= near - 2; y--) if (!characterCollides(isSolid, x, y, z) && characterCollides(isSolid, x, y - 0.01, z)) return y;
    return NaN;
  };
  /** Top of the plank drawn under along-fraction `s` (planks are evenly spaced, one every ~0.5 block). */
  const visibleTop = (deck: DeckPlank[], s: number) => deck[Math.round(Math.min(1, Math.max(0, s)) * (deck.length - 1))].y + 0.09;
  /** Lengths (blocks along the bridge) of the stretches where the two heights differ. */
  const mismatchRuns = (samples: { d: number; bad: boolean }[]) => {
    const runs: number[] = [];
    let start = -1;
    for (const { d, bad } of samples) {
      if (bad && start < 0) start = d;
      if (!bad && start >= 0) {
        runs.push(d - start);
        start = -1;
      }
    }
    if (start >= 0) runs.push(samples[samples.length - 1].d - start);
    return runs;
  };

  for (const c of bridges) {
    const deck = bridgeDeck(c.a, c.b, world.grid);
    const len = Math.hypot(c.b.x - c.a.x, c.b.z - c.a.z);
    const ux = (c.b.x - c.a.x) / len;
    const uz = (c.b.z - c.a.z) / len;
    const tag = `${c.from} → ${c.to}`;

    it(`lays every plank top where Ezra stands at that plank (${tag})`, () => {
      for (const p of deck) {
        const top = p.y + 0.09;
        expect(characterCollides(isSolid, p.x, top, p.z)).toBe(false);
        expect(characterCollides(isSolid, p.x, top - 0.01, p.z)).toBe(true);
      }
      expect(deck[0].grounded && deck[deck.length - 1].grounded).toBe(true);
      expect(deck.some((p) => !p.grounded)).toBe(true);
    });

    it(`shows each step within half a plank of the collision step along the centreline (${tag})`, () => {
      const samples: { d: number; bad: boolean }[] = [];
      for (let d = 0; d <= len; d += 0.02) {
        const x = c.a.x + ux * d;
        const z = c.a.z + uz * d;
        const top = visibleTop(deck, d / len);
        // a NaN floor (nothing to stand on) counts as a mismatch
        samples.push({ d, bad: !(Math.abs(floorAt(x, z, Math.round(top)) - top) <= 0.01) });
      }
      for (const run of mismatchRuns(samples)) expect(run).toBeLessThanOrEqual(0.3);
    });

    it(`keeps Ezra's feet on the visible planks while he walks across and back (${tag})`, () => {
      const walk = (from: Vec3, to: Vec3) => {
        const p = createCharacter({ ...from });
        const dx = to.x - from.x;
        const dz = to.z - from.z;
        const l = Math.hypot(dx, dz);
        const input = { moveX: dx / l, moveZ: dz / l, run: false, jump: false };
        const samples: { d: number; bad: boolean }[] = [];
        for (let i = 0; i < 60 * 8; i++) {
          stepCharacter(p, input, 1 / 60, { isSolid, killY: -50 });
          expect(p.pos.y).toBeGreaterThan(Math.min(from.y, to.y) - 0.5); // never falls off
          const d = (p.pos.x - from.x) * (dx / l) + (p.pos.z - from.z) * (dz / l);
          if (d >= l) break;
          const s = ((p.pos.x - c.a.x) * ux + (p.pos.z - c.a.z) * uz) / len;
          // in the air he is dropping down a step (the stair's own motion), not standing above the deck
          samples.push({ d, bad: p.onGround && !(Math.abs(p.pos.y - visibleTop(deck, s)) <= 0.01) });
        }
        return mismatchRuns(samples);
      };
      // runs ≤ half a plank (the deck samples his standing height every ~0.5 block) + about a frame of walking
      const runs = [...walk(c.a, c.b), ...walk(c.b, c.a)];
      for (const run of runs) expect(run).toBeLessThanOrEqual(0.4);
    });
  }
});
