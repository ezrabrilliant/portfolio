import { describe, expect, it } from "vitest";
import { milestones, worldProjects } from "@/config/portfolio";
import { buildLayout } from "@/world/engine/gen/layout";
import { blockId } from "@/world/engine/voxel/blocks";
import { buildWorld } from "@/world/engine/worldBuild";
import { stampCrossings } from "@/world/scene/crossings/stamp";
import { milestoneCells, milestoneSpotsFor, pillarCollider } from "./placement";
import { stampMilestones } from "./stamp";

const layout = buildLayout(worldProjects);
const years = milestones.map((m) => m.year);
const spots = milestoneSpotsFor(layout, years);
const built = buildWorld(layout, [(g) => stampCrossings(g, layout), (g) => stampMilestones(g, layout, years)], spots.map(pillarCollider));

describe("stampMilestones", () => {
  it("leaves the pillars out of the grid (the camera passes them) and blocks their cells for the body", () => {
    for (const s of spots) {
      const x = Math.floor(s.pos.x), z = Math.floor(s.pos.z);
      expect(built.grid.isSolid(x, s.pos.y, z), `${s.year}`).toBe(false);
      expect(built.blocked(x, s.pos.y, z), `${s.year}`).toBe(true);
      expect(built.blocked(x, s.pos.y + 1, z), `${s.year}`).toBe(true);
      expect(built.blocked(x, s.pos.y + 3, z), `${s.year}`).toBe(false);
    }
  });

  it("builds the floating stone from real stone that a terrain batch draws, its top at walking height", () => {
    const own = spots.find((s) => s.ownStone)!;
    const stones = milestoneCells(own).filter((c) => c.block === "stone");
    const drawn = new Set<string>();
    for (const b of Object.values(built.batches)) {
      for (let i = 0; i < b.count; i++) drawn.add(`${b.positions[i * 3] - 0.5},${b.positions[i * 3 + 1] - 0.5},${b.positions[i * 3 + 2] - 0.5}`);
    }
    for (const c of stones) {
      expect(built.grid.get(c.x, c.y, c.z)).toBe(blockId("stone"));
      expect(drawn.has(`${c.x},${c.y},${c.z}`), `stone (${c.x},${c.y},${c.z}) drawn`).toBe(true);
    }
    expect(Math.max(...stones.map((c) => c.y)) + 1).toBe(own.pos.y);
  });
});
