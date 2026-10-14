import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { WEB_PLAZA_ID, buildLayout } from "@/world/engine/gen/layout";
import { blockId } from "@/world/engine/voxel/blocks";
import { VoxelGrid } from "@/world/engine/voxel/grid";
import { ISLANDS } from "./index";
import { FRAMING, tourStopFor } from "./framing";
import { FOOTPRINTS } from "./layouts";

const WEB = [WEB_PLAZA_ID, "pos-monosuko", "bee-furniture-crm", "pedulipasal"];
/** The Web & Apps islands whose module has landed (C2–C4 add one each; C4 replaces this file). */
const DRESSED = [WEB_PLAZA_ID, "pos-monosuko", "bee-furniture-crm"];

describe("island registry", () => {
  const layout = buildLayout(worldProjects);

  it("holds the hero, the four stars, the Web & Apps plaza and its three minis", () => {
    expect(Object.keys(ISLANDS)).toEqual(["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot", ...WEB]);
    for (const [id, m] of Object.entries(ISLANDS)) expect(m.id).toBe(id);
  });

  it("has a module and a tour framing for every island the layout places", () => {
    for (const p of layout.islands) {
      expect(ISLANDS[p.id], p.id).toBeDefined();
      expect(FRAMING[p.id], p.id).toBeDefined();
      expect(ISLANDS[p.id].tourStop(p)).toEqual(tourStopFor(p));
    }
  });

  it("stamps a dressed Web & Apps island's FOOTPRINTS as barriers and keeps the others bare", () => {
    for (const id of WEB) {
      const p = layout.islands.find((i) => i.id === id)!;
      if (!DRESSED.includes(id)) {
        expect(ISLANDS[id].stamp, id).toBeUndefined();
        expect(ISLANDS[id].Component({ placement: p }), id).toBeNull();
        continue;
      }
      const grid = new VoxelGrid();
      ISLANDS[id].stamp?.(grid, p);
      expect(FOOTPRINTS[id].length, id).toBeGreaterThan(0);
      for (const [x, y, z] of FOOTPRINTS[id]) expect(grid.get(p.origin.x + x, p.origin.y + 1 + y, p.origin.z + z), `${id} (${x},${y},${z})`).toBe(blockId("barrier"));
    }
  });
});
