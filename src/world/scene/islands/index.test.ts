import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { WEB_PLAZA_ID, buildLayout } from "@/world/engine/gen/layout";
import { ISLANDS } from "./index";
import { FRAMING, tourStopFor } from "./framing";

const WEB = [WEB_PLAZA_ID, "pos-monosuko", "bee-furniture-crm", "pedulipasal"];

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

  it("keeps the Web & Apps islands bare for now: terrain only, no props and no collision", () => {
    for (const id of WEB) {
      expect(ISLANDS[id].stamp, id).toBeUndefined();
      expect(ISLANDS[id].Component({ placement: layout.islands[0] }), id).toBeNull();
    }
  });
});
