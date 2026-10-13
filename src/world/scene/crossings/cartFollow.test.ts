import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { buildLayout } from "@/world/engine/gen/layout";
import { buildTourPath, stopProgress } from "@/world/engine/camera/tourPath";
import type { TourStop } from "@/world/engine/camera/tourPath";
import { railPoint } from "@/world/engine/traversal/rail";
import type { Vec3 } from "@/world/engine/types";
import { buildWorld } from "@/world/engine/worldBuild";
import { defaultTourStop } from "../islands/types";
import { tourStopFor } from "../islands/framing";
import { tourVia } from "../tour/tourMath";
import { sampleTrack, trackFor } from "../tour/tourMotion";
import { cartTourTable, sampleTable } from "./cartFollow";
import { minecartRail, railEnds } from "./geometry";

const layout = buildLayout(worldProjects);
const island = (id: string) => layout.islands.find((i) => i.id === id)!;

// Today's placeholder stops and the real island framing (islands/framing.ts).
const fixtures: Record<string, TourStop[]> = {
  placeholder: layout.tourOrder.map((id) => defaultTourStop(island(id), { dwell: id === "hero" ? 1.3 : 1 })),
  framing: layout.tourOrder.map((id) => tourStopFor(island(id))),
};

/** Normalised device coordinates of `p` for a camera at `cam` looking at `look` (fov 40°, 16:9). */
function ndc(cam: Vec3, look: Vec3, p: Vec3): { x: number; y: number } {
  const fl = Math.hypot(look.x - cam.x, look.y - cam.y, look.z - cam.z);
  const f = { x: (look.x - cam.x) / fl, y: (look.y - cam.y) / fl, z: (look.z - cam.z) / fl };
  const rl = Math.hypot(f.x, f.z);
  const r = { x: -f.z / rl, y: 0, z: f.x / rl };
  const u = { x: r.y * f.z - r.z * f.y, y: r.z * f.x - r.x * f.z, z: r.x * f.y - r.y * f.x };
  const d = { x: p.x - cam.x, y: p.y - cam.y, z: p.z - cam.z };
  const depth = d.x * f.x + d.y * f.y + d.z * f.z;
  const t = Math.tan((20 * Math.PI) / 180);
  return { x: (d.x * r.x + d.y * r.y + d.z * r.z) / (depth * t * (16 / 9)), y: (d.x * u.x + d.y * u.y + d.z * u.z) / (depth * t) };
}

describe("cartTourTable", () => {
  const c = layout.crossings.find((x) => x.kind === "minecart")!;
  const leg = layout.tourOrder.indexOf(c.from);
  const e = railEnds(c, island(c.from), island(c.to));
  const rail = minecartRail(e, buildWorld(layout).grid.isSolid);

  for (const [name, stops] of Object.entries(fixtures)) {
    const path = buildTourPath(stops, tourVia(layout));
    const table = cartTourTable(path, leg, rail);

    it(`parks at the stations and only rolls forward (${name})`, () => {
      expect(sampleTable(table, 0)).toBe(0);
      expect(sampleTable(table, 1)).toBe(1);
      expect(sampleTable(table, -0.5)).toBe(0);
      expect(sampleTable(table, 1.5)).toBe(1);
      for (let i = 1; i < table.length; i++) expect(table[i]).toBeGreaterThanOrEqual(table[i - 1]);
    });

    it(`keeps the cart in the tour camera's frame across the whole leg (${name})`, () => {
      const track = trackFor(path);
      const a = stopProgress(path, leg);
      const b = stopProgress(path, leg + 1);
      const cam = { x: 0, y: 0, z: 0 };
      const look = { x: 0, y: 0, z: 0 };
      for (let k = 0; k <= 100; k++) {
        const f = k / 100;
        sampleTrack(track, a + (b - a) * f, cam, look);
        const n = ndc(cam, look, railPoint(rail, sampleTable(table, f)));
        expect(Math.abs(n.x)).toBeLessThan(0.9);
        expect(Math.abs(n.y)).toBeLessThan(0.9);
      }
    });
  }
});
