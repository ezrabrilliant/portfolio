import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import type { WorldProject } from "@/config/schema";
import {
  STAR_ANCHORS, buildLayout, chooseCrossing, edgeAnchor, type IslandPlacement,
} from "@/world/engine/gen/layout";

function place(id: string, district: IslandPlacement["district"], y: number, x = 0): IslandPlacement {
  return { id, kind: district === "hero" ? "hero" : "star", district, origin: { x, y, z: 0 }, radius: 6, depth: 6, seed: 1 };
}

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
});

describe("buildLayout", () => {
  const layout = buildLayout(worldProjects);

  it("places the hero and the four stars at their anchors", () => {
    const anchored = layout.islands.filter((i) => i.kind !== "mini");
    expect(anchored.map((i) => i.id)).toEqual(["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot"]);
    for (const isl of anchored) {
      expect(isl.origin).toEqual(STAR_ANCHORS[isl.id].origin);
      expect(isl.radius).toBe(STAR_ANCHORS[isl.id].radius);
    }
    expect(layout.islands[0].kind).toBe("hero");
    expect(layout.islands[1].district).toBe("game");
  });

  it("tours the islands in the fixed order", () => {
    expect(layout.tourOrder).toEqual(["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot"]);
  });

  it("links consecutive islands with the crossing the rules pick", () => {
    expect(layout.crossings.map((c) => `${c.from}>${c.to}:${c.kind}`)).toEqual([
      "hero>gtid:bridge",
      "gtid>petak-umpet:bridge",
      "petak-umpet>orbit-store:minecart",
      "orbit-store>ezra-bot:bouncePads",
    ]);
    const first = layout.crossings[0];
    expect(first.a.y).toBe(STAR_ANCHORS.hero.origin.y + 1);
    expect(first.b.y).toBe(STAR_ANCHORS.gtid.origin.y + 1);
  });

  it("gives mini projects non-overlapping satellite slots", () => {
    const minis: WorldProject[] = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"].map((id, i): WorldProject => ({
      id, title: id, year: 2025, line: "x", tags: [], tier: "mini", links: {},
      district: (["game", "discord", "web"] as const)[i % 3],
    }));
    const l = buildLayout([...worldProjects, ...minis]);
    const placed = l.islands.filter((i) => i.kind === "mini");
    expect(placed).toHaveLength(6 + 3); // the six test minis and the three shipped web minis
    for (const m of placed) {
      for (const other of l.islands) {
        if (other === m) continue;
        const d = Math.hypot(other.origin.x - m.origin.x, other.origin.z - m.origin.z);
        expect(d).toBeGreaterThanOrEqual((other.radius + m.radius) * 1.25 + 3);
      }
    }
    expect(l.tourOrder).toEqual(["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot"]);
  });
});
