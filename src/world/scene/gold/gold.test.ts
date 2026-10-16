import { beforeEach, describe, expect, it } from "vitest";
import { milestones, worldProjects } from "@/config/portfolio";
import { buildLayout } from "@/world/engine/gen/layout";
import { buildWorld } from "@/world/engine/worldBuild";
import { createCharacter, stepCharacter } from "@/world/engine/physics/character";
import { ISLANDS } from "@/world/scene/islands";
import { islandColliders } from "@/world/scene/islands/colliders";
import { stampCrossings } from "@/world/scene/crossings/stamp";
import { bridgeRamp } from "@/world/scene/crossings/geometry";
import { stampMilestones } from "@/world/scene/milestones/stamp";
import { milestoneSpotsFor, pillarCollider } from "@/world/scene/milestones/placement";
import { GOLD_TOTAL, goldInReach, goldInWorld } from "./spots";
import { collectGold, goldSnapshot, resetGold } from "./progress";

const layout = buildLayout(worldProjects);
const years = milestones.map((m) => m.year);
const built = buildWorld(
  layout,
  [...layout.islands.map((p) => (g: Parameters<NonNullable<(typeof ISLANDS)[string]["stamp"]>>[0]) => ISLANDS[p.id]?.stamp?.(g, p)), (g) => stampCrossings(g, layout), (g) => stampMilestones(g, layout, years)],
  [...layout.islands.flatMap((p) => islandColliders(p.id, p)), ...milestoneSpotsFor(layout, years).map(pillarCollider)],
  layout.crossings.filter((c) => c.kind === "bridge").map((c) => bridgeRamp(c.a, c.b)),
);

describe("gold blocks", () => {
  const golds = goldInWorld(layout.islands);

  it("hides one on every island", () => {
    expect(golds).toHaveLength(GOLD_TOTAL);
    expect(new Set(golds.map((g) => g.id)).size).toBe(GOLD_TOTAL);
  });

  it("can be reached: somewhere close by, Ezra stands with it in reach", () => {
    const unreachable: string[] = [];
    for (const g of golds) {
      let ok = false;
      for (let a = 0; a < 8 && !ok; a++) {
        for (const r of [0, 0.35, 0.6]) {
          const p = createCharacter({ x: g.pos.x + Math.cos(a) * r, y: g.pos.y + 1.2, z: g.pos.z + Math.sin(a) * r });
          for (let i = 0; i < 90; i++) stepCharacter(p, { moveX: 0, moveZ: 0, run: false, jump: false }, 1 / 60, { isSolid: built.grid.isSolid, colliders: built.props, ramps: built.ramps, killY: -60 });
          if (p.onGround && goldInReach(g.pos, p.pos)) {
            ok = true;
            break;
          }
        }
      }
      if (!ok) unreachable.push(g.id);
    }
    expect(unreachable).toEqual([]);
  });
});

describe("gold progress", () => {
  beforeEach(() => resetGold());
  it("counts each find once", () => {
    expect(collectGold("hero")).toBe(1);
    expect(collectGold("hero")).toBeNull();
    expect(collectGold("gtid")).toBe(2);
    expect(goldSnapshot()).toEqual({ count: 2, all: false });
  });
});
