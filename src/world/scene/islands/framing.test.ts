import { describe, expect, it } from "vitest";
import { buildLayout } from "@/world/engine/gen/layout";
import { worldProjects } from "@/config/portfolio";
import { islandFrame } from "./shared/local";
import { tourStopFor } from "./framing";

const layout = buildLayout(worldProjects);

describe("tour framing", () => {
  it("views every island from the +z side with the subject right of centre", () => {
    for (const p of layout.islands.filter((i) => layout.tourOrder.includes(i.id))) {
      const s = tourStopFor(p);
      const [fx, , fz] = islandFrame(p);
      expect(s.id).toBe(p.id);
      expect(s.camera.z).toBeGreaterThan(fz + 8);
      expect(s.target.x).toBeLessThan(fx); // looking left of the subject puts the subject right of centre
      const d = Math.hypot(s.camera.x - s.target.x, s.camera.y - s.target.y, s.camera.z - s.target.z);
      expect(d).toBeGreaterThan(10);
      expect(d).toBeLessThan(20);
    }
  });
  it("throws for an island without framing", () => {
    expect(() => tourStopFor({ ...layout.islands[0], id: "nope" })).toThrow("No framing for island nope");
  });
});
