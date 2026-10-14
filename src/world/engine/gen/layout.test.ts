import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import type { District, WorldProject } from "@/config/schema";
import { generateIsland } from "@/world/engine/gen/islandGen";
import { hashString } from "@/world/engine/gen/rng";
import {
  CHAIN_BRIDGE, CHAIN_DEPTH, CHAIN_DIR, CHAIN_HEIGHTS, DISTRICT_HUBS, HUB_DEPTH, HUB_RADIUS, MINI_RADIUS, STAR_ANCHORS,
  STAR_TOUR, WEB_PLAZA_ID, buildLayout, chooseCrossing, edgeAnchor, webChain, type IslandPlacement, type WorldLayout,
} from "@/world/engine/gen/layout";

function place(id: string, district: IslandPlacement["district"], y: number, x = 0): IslandPlacement {
  return { id, kind: district === "hero" ? "hero" : "star", district, origin: { x, y, z: 0 }, radius: 6, depth: 6, seed: 1 };
}

const mini = (id: string, district: District = "web"): WorldProject => ({
  id, title: id, year: 2025, line: "x", tags: [], tier: "mini", links: {}, district,
});
const WEB_MINIS = ["pos-monosuko", "bee-furniture-crm", "pedulipasal"];
/** The tour's screen-forward: CHAIN_DIR is its right vector (−F.z, F.x), so F = (R.z, −R.x). */
const FWD = { x: CHAIN_DIR.z, z: -CHAIN_DIR.x };
const flat = (a: IslandPlacement, b: IslandPlacement) => Math.hypot(a.origin.x - b.origin.x, a.origin.z - b.origin.z);

describe("chooseCrossing", () => {
  it("uses a minecart between different districts", () => {
    expect(chooseCrossing(place("a", "game", 0), place("b", "discord", 0))).toBe("minecart");
  });
  it("uses bounce pads for height differences above 2 blocks", () => {
    expect(chooseCrossing(place("a", "discord", 10), place("b", "discord", 14))).toBe("bouncePads");
    expect(chooseCrossing(place("h", "hero", 0), place("b", "discord", 10))).toBe("bouncePads");
  });
  it("uses a bridge otherwise (hero counts as no district)", () => {
    expect(chooseCrossing(place("h", "hero", 0), place("g", "game", 2))).toBe("bridge");
    expect(chooseCrossing(place("a", "game", 3), place("b", "game", 1))).toBe("bridge");
  });
});

describe("edgeAnchor", () => {
  it("sits on the rim facing the other island, on the walkable surface", () => {
    const a = place("a", "game", 2, 0), b = place("b", "game", 3, 30);
    const p = edgeAnchor(a, b);
    expect(p.y).toBe(3);
    expect(Math.hypot(p.x - a.origin.x, p.z - a.origin.z)).toBeCloseTo(a.radius * 0.75, 9);
    expect(p.x).toBeGreaterThan(a.origin.x);
    expect(p.z).toBeCloseTo(0, 9);
  });
  it("measures from the true centre (origin + 0.5) on the small Web & Apps islands", () => {
    const hub: IslandPlacement = { ...place("h", "game", 2, 0), kind: "hub", radius: 5 };
    const mini: IslandPlacement = { ...place("m", "game", 3, 20), kind: "mini", radius: 4 };
    const p = edgeAnchor(hub, mini), q = edgeAnchor(mini, hub);
    expect(p).toEqual({ x: 0.5 + 3.75, y: 3, z: 0.5 });
    expect(q).toEqual({ x: 20.5 - 3, y: 4, z: 0.5 });
    // the hero and star islands keep the Phase 1 anchors, measured from the origin corner
    expect(edgeAnchor(place("a", "game", 2, 0), mini)).toEqual({ x: 4.5, y: 3, z: 0 });
  });
});

describe("CHAIN_DIR", () => {
  it("is the tour's screen-right: unit length, 12° from +x toward +z", () => {
    expect(Math.hypot(CHAIN_DIR.x, CHAIN_DIR.z)).toBeCloseTo(1, 12);
    expect((Math.atan2(CHAIN_DIR.z, CHAIN_DIR.x) * 180) / Math.PI).toBeCloseTo(12, 9);
    expect(CHAIN_DIR.x).toBeCloseTo(0.9781, 4);
    expect(CHAIN_DIR.z).toBeCloseTo(0.2079, 4);
  });
});

describe("buildLayout", () => {
  const layout = buildLayout(worldProjects);
  const byId = (l: WorldLayout, id: string) => l.islands.find((i) => i.id === id)!;

  it("places the hero and the four stars at their anchors", () => {
    const anchored = layout.islands.filter((i) => i.kind === "hero" || i.kind === "star");
    expect(anchored.map((i) => i.id)).toEqual(["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot"]);
    for (const isl of anchored) {
      expect(isl.origin).toEqual(STAR_ANCHORS[isl.id].origin);
      expect(isl.radius).toBe(STAR_ANCHORS[isl.id].radius);
    }
    expect(layout.islands[0].kind).toBe("hero");
    expect(layout.islands[1].district).toBe("game");
  });

  it("emits the Web & Apps plaza as a hub on the district slot", () => {
    const hub = byId(layout, WEB_PLAZA_ID);
    expect(hub).toMatchObject({ kind: "hub", district: "web", radius: HUB_RADIUS, depth: HUB_DEPTH });
    expect(hub.origin).toEqual(DISTRICT_HUBS.web.origin);
    expect(hub.origin).toEqual({ x: 120, y: 8, z: -6 });
  });

  it("puts the plaza after Ezra Bot on the tour's right, 6 blocks lower", () => {
    const ezra = byId(layout, "ezra-bot"), hub = byId(layout, WEB_PLAZA_ID);
    const dx = hub.origin.x - ezra.origin.x, dz = hub.origin.z - ezra.origin.z;
    const along = dx * CHAIN_DIR.x + dz * CHAIN_DIR.z;
    const depth = dx * FWD.x + dz * FWD.z;
    expect(along).toBeGreaterThan(34);
    expect(along).toBeLessThan(38);
    expect(Math.abs(depth)).toBeLessThanOrEqual(CHAIN_DEPTH);
    expect(ezra.origin.y - hub.origin.y).toBe(6);
  });

  it("emits no plaza and keeps the star tour when there are no web projects", () => {
    const l = buildLayout(worldProjects.filter((p) => p.district !== "web"));
    expect(l.islands.some((i) => i.kind === "hub")).toBe(false);
    expect(l.tourOrder).toEqual([...STAR_TOUR]);
  });

  it("derives the tour order: the stars, the plaza, then the web minis in config order", () => {
    expect(STAR_TOUR).toEqual(["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot"]);
    expect(layout.tourOrder).toEqual([...STAR_TOUR, WEB_PLAZA_ID, ...WEB_MINIS]);
    const minis = worldProjects.filter((p) => p.tier === "mini");
    const flipped = buildLayout([...worldProjects.filter((p) => p.tier === "star"), ...[...minis].reverse()]);
    expect(flipped.tourOrder).toEqual([...STAR_TOUR, WEB_PLAZA_ID, ...[...WEB_MINIS].reverse()]);
  });

  it("places the web district at the pinned origins (Parts B and C build on these)", () => {
    expect(WEB_MINIS.map((id) => byId(layout, id).origin)).toEqual([
      { x: 134, y: 9, z: 0 },
      { x: 147, y: 10, z: -3 },
      { x: 158, y: 9, z: 5 },
    ]);
    for (const id of WEB_MINIS) expect(byId(layout, id)).toMatchObject({ kind: "mini", district: "web", radius: MINI_RADIUS });
  });

  it("links consecutive islands with the crossing the rules pick: minecart to the plaza, bridges along the chain", () => {
    expect(layout.crossings.map((c) => `${c.from}>${c.to}:${c.kind}`)).toEqual([
      "hero>gtid:bridge",
      "gtid>petak-umpet:bridge",
      "petak-umpet>orbit-store:minecart",
      "orbit-store>ezra-bot:bouncePads",
      "ezra-bot>web-plaza:minecart",
      "web-plaza>pos-monosuko:bridge",
      "pos-monosuko>bee-furniture-crm:bridge",
      "bee-furniture-crm>pedulipasal:bridge",
    ]);
    const first = layout.crossings[0];
    expect(first.a.y).toBe(STAR_ANCHORS.hero.origin.y + 1);
    expect(first.b.y).toBe(STAR_ANCHORS.gtid.origin.y + 1);
  });

  it("is deterministic", () => {
    expect(buildLayout(worldProjects)).toEqual(layout);
  });

  // the shipped chain, and a longer one that runs CHAIN_HEIGHTS round more than once
  const longer = buildLayout([...worldProjects, mini("alpha"), mini("beta"), mini("gamma")]);
  for (const [name, l] of [["shipped", layout], ["six minis", longer]] as const) {
    describe(`web chain rules (${name})`, () => {
      const hub = byId(l, WEB_PLAZA_ID);
      const chain = l.tourOrder.slice(l.tourOrder.indexOf(WEB_PLAZA_ID) + 1).map((id) => byId(l, id));
      const links = [hub, ...chain].slice(1).map((b, i) => [[hub, ...chain][i], b] as const);

      it("chains every web mini", () => {
        expect(chain.length).toBe(name === "shipped" ? 3 : 6);
      });

      it("keeps each bridge 6–9 blocks long between the edge anchors", () => {
        for (const [a, b] of links) {
          const p = edgeAnchor(a, b), q = edgeAnchor(b, a);
          const len = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
          expect(len, `${a.id} → ${b.id}`).toBeGreaterThanOrEqual(CHAIN_BRIDGE.min);
          expect(len, `${a.id} → ${b.id}`).toBeLessThanOrEqual(CHAIN_BRIDGE.max);
        }
        expect(CHAIN_BRIDGE).toEqual({ min: 6, max: 9 });
      });

      it("steps at most 2 blocks up or down, at CHAIN_HEIGHTS above the hub, so every link is a bridge", () => {
        chain.forEach((m, i) => expect(m.origin.y - hub.origin.y, m.id).toBe(CHAIN_HEIGHTS[i % CHAIN_HEIGHTS.length]));
        expect(CHAIN_HEIGHTS).toEqual([1, 2, 1]);
        for (const [a, b] of links) {
          expect(Math.abs(b.origin.y - a.origin.y), `${a.id} → ${b.id}`).toBeLessThanOrEqual(2);
          expect(chooseCrossing(a, b)).toBe("bridge");
          expect(l.crossings.find((c) => c.from === a.id && c.to === b.id)?.kind).toBe("bridge");
        }
      });

      it("overlaps no other island (the layout's clearance margin)", () => {
        for (const a of [hub, ...chain]) {
          for (const b of l.islands) {
            if (a === b) continue;
            expect(flat(a, b), `${a.id} vs ${b.id}`).toBeGreaterThanOrEqual((a.radius + b.radius) * 1.25 + 3);
          }
        }
      });

      it("advances along CHAIN_DIR, alternately nearer to and further from the tour camera", () => {
        for (const [a, b] of links) {
          const along = (b.origin.x - a.origin.x) * CHAIN_DIR.x + (b.origin.z - a.origin.z) * CHAIN_DIR.z;
          expect(along, `${a.id} → ${b.id}`).toBeGreaterThan(8);
        }
        chain.forEach((m, i) => {
          const depth = (m.origin.x - hub.origin.x) * FWD.x + (m.origin.z - hub.origin.z) * FWD.z;
          expect(Math.sign(depth), m.id).toBe(i % 2 === 0 ? -1 : 1);
          // whole columns, and moving a bridge end onto grass, shift an island up to ~2 blocks off its nominal depth
          expect(Math.abs(Math.abs(depth) - CHAIN_DEPTH), m.id).toBeLessThan(name === "shipped" ? 1 : 2);
        });
      });

      it("lands both ends of every chain bridge on grass (Ezra's 0.6-wide feet)", () => {
        const top = (isl: IslandPlacement) => generateIsland({ radius: isl.radius, depth: isl.depth, seed: isl.seed });
        for (const [a, b] of links) {
          for (const [from, to] of [[a, b], [b, a]] as const) {
            const p = edgeAnchor(from, to);
            const shape = top(from);
            for (const ox of [-0.3, 0.3]) {
              for (const oz of [-0.3, 0.3]) {
                const cell = shape.surface(Math.floor(p.x + ox) - from.origin.x, Math.floor(p.z + oz) - from.origin.z);
                expect(cell, `${from.id} end of ${a.id} → ${b.id}`).toBe(0);
              }
            }
          }
        }
      });

      it("runs no crossing over a third island", () => {
        for (const c of l.crossings) {
          const dx = c.b.x - c.a.x, dz = c.b.z - c.a.z;
          const len2 = dx * dx + dz * dz;
          for (const isl of l.islands) {
            if (isl.id === c.from || isl.id === c.to) continue;
            const t = Math.min(1, Math.max(0, ((isl.origin.x - c.a.x) * dx + (isl.origin.z - c.a.z) * dz) / len2));
            const d = Math.hypot(c.a.x + dx * t - isl.origin.x, c.a.z + dz * t - isl.origin.z);
            expect(d, `${c.from} → ${c.to} over ${isl.id}`).toBeGreaterThan(isl.radius * 1.2 + 1);
          }
        }
      });
    });
  }

  it("webChain avoids taken islands and reports when there is no room", () => {
    const hub = byId(layout, WEB_PLAZA_ID);
    const [first] = webChain(hub, [MINI_RADIUS], [hub], [hashString("pos-monosuko")]);
    expect(first).toEqual({ x: 134, y: 9, z: 0 });
    // a small island just past the first slot pushes the chain off it; one covering every candidate column stops it
    const blocker = (x: number, z: number, radius: number): IslandPlacement => ({ ...hub, id: "blocker", origin: { x, y: 0, z }, radius });
    const small = blocker(first.x + 8, first.z + 4, 1);
    const [moved] = webChain(hub, [MINI_RADIUS], [hub, small]);
    expect(moved).not.toEqual(first);
    expect(Math.hypot(moved.x - small.origin.x, moved.z - small.origin.z)).toBeGreaterThanOrEqual((1 + MINI_RADIUS) * 1.25 + 3);
    const p = edgeAnchor(hub, { ...hub, origin: moved, radius: MINI_RADIUS }), q = edgeAnchor({ ...hub, origin: moved, radius: MINI_RADIUS }, hub);
    expect(Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z)).toBeLessThanOrEqual(CHAIN_BRIDGE.max);
    expect(() => webChain(hub, [MINI_RADIUS], [hub, blocker(first.x, first.z, 6)])).toThrow("webChain: no free column for chain island 0");
  });

  it("gives minis of other districts non-overlapping satellite slots off the tour; web minis join the chain", () => {
    const extra = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"].map((id, i) => mini(id, (["game", "discord", "web"] as const)[i % 3]));
    const l = buildLayout([...worldProjects, ...extra]);
    const placed = l.islands.filter((i) => i.kind === "mini");
    expect(placed).toHaveLength(6 + 3);
    for (const m of placed) {
      for (const other of l.islands) {
        if (other === m) continue;
        expect(flat(other, m)).toBeGreaterThanOrEqual((other.radius + m.radius) * 1.25 + 3);
      }
    }
    expect(l.tourOrder).toEqual([...STAR_TOUR, WEB_PLAZA_ID, ...WEB_MINIS, "gamma", "zeta"]);
  });
});
