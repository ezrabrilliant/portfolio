import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { buildLayout } from "@/world/engine/gen/layout";
import { generateIsland } from "@/world/engine/gen/islandGen";
import { FOOTPRINTS } from "../layouts";
import { PROP_BOXES } from "../colliders";
import { HIDE_SPOTS, ROUNDS, pickRounds } from "./hideSeek";

describe("Petak Umpet hide and seek", () => {
  it("plays three different spots each game", () => {
    for (let k = 0; k < 20; k++) {
      const r = pickRounds();
      expect(r).toHaveLength(ROUNDS);
      expect(new Set(r).size).toBe(ROUNDS);
    }
  });

  it("hides the kid on the island's grass, never inside a building or a solid prop", () => {
    const layout = buildLayout(worldProjects);
    const p = layout.islands.find((i) => i.id === "petak-umpet")!;
    const grass = new Set(generateIsland({ radius: p.radius, depth: p.depth, seed: p.seed }).cells.filter((c) => c.y === 0).map((c) => `${c.x},${c.z}`));
    const cells = new Set(FOOTPRINTS["petak-umpet"].filter(([, y]) => y === 0).map(([x, , z]) => `${x},${z}`));
    for (const s of HIDE_SPOTS) {
      const cx = Math.round(s.x), cz = Math.round(s.z);
      expect(grass.has(`${cx},${cz}`), `${s.x},${s.z} on grass`).toBe(true);
      expect(cells.has(`${cx},${cz}`), `${s.x},${s.z} clear of the house`).toBe(false);
      for (const b of PROP_BOXES["petak-umpet"].filter((b) => !b.pass)) {
        const inside = Math.abs(s.x - b.x) < b.sx / 2 + 0.2 && Math.abs(s.z - b.z) < b.sz / 2 + 0.2 && b.y - b.sy / 2 < 1.2;
        expect(inside, `${s.x},${s.z} in ${b.what}`).toBe(false);
      }
    }
  });
});
