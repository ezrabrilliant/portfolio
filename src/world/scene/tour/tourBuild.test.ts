import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { buildLayout } from "@/world/engine/gen/layout";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { TourStop } from "@/world/engine/camera/tourPath";
import type { Vec3 } from "@/world/engine/types";
import { portraitStop, tourStopFor } from "../islands/framing";
import { defaultTourStop } from "../islands/types";
import { tourTravelWeights } from "../milestones/placement";
import { buildTour, isPortrait } from "./tourBuild";
import { stopProgresses, tourVia } from "./tourMath";

const layout = buildLayout(worldProjects);
const island = (id: string) => layout.islands.find((i) => i.id === id)!;
const sub = (p: Vec3, q: Vec3) => ({ x: p.x - q.x, y: p.y - q.y, z: p.z - q.z });
const dist = (s: TourStop) => Math.hypot(s.camera.x - s.target.x, s.camera.y - s.target.y, s.camera.z - s.target.z);

describe("tour build", () => {
  for (const [name, stopOf] of [
    ["island framing", (p: IslandPlacement) => tourStopFor(p)],
    ["placeholder framing", (p: IslandPlacement) => defaultTourStop(p)],
  ] as const) {
    it(`${name}: landscape uses each island's own stop and the standard vias`, () => {
      const path = buildTour(layout, stopOf, false);
      expect(path.stops).toEqual(layout.tourOrder.map((id) => stopOf(island(id))));
      expect(path.via).toEqual(tourVia(layout));
      expect(path.travel).toEqual(tourTravelWeights(layout));
    });

    it(`${name}: portrait re-frames every stop and moves each via with its leg's stops`, () => {
      const land = buildTour(layout, stopOf, false);
      const path = buildTour(layout, stopOf, true);
      expect(path.stops).toEqual(layout.tourOrder.map((id) => portraitStop(island(id), stopOf(island(id)))));
      path.via.forEach((vs, i) => {
        expect(vs).toHaveLength(land.via[i].length);
        const da = sub(path.stops[i].camera, land.stops[i].camera);
        const db = sub(path.stops[i + 1].camera, land.stops[i + 1].camera);
        let last = -1;
        vs.forEach((v, j) => {
          // the via's displacement is a blend da + (db − da)·t, with t in 0..1 growing along the leg
          const d = sub(v, land.via[i][j]);
          const e = sub(db, da);
          const t = ((d.x - da.x) * e.x + (d.y - da.y) * e.y + (d.z - da.z) * e.z) / (e.x * e.x + e.y * e.y + e.z * e.z);
          expect(t).toBeGreaterThanOrEqual(0);
          expect(t).toBeLessThanOrEqual(1);
          expect(t).toBeGreaterThanOrEqual(last);
          last = t;
          for (const k of ["x", "y", "z"] as const) expect(d[k]).toBeCloseTo(da[k] + e[k] * t, 9);
        });
      });
      expect(path.stops.every((s, i) => dist(s) > dist(land.stops[i]))).toBe(true);
      // same dwell weights: a stop's scroll progress is the same in both, so rotating keeps the chapter
      expect(stopProgresses(path)).toEqual(stopProgresses(land));
    });
  }

  it("portrait means narrower than tall", () => {
    expect(isPortrait(390, 844)).toBe(true);
    expect(isPortrait(1280, 720)).toBe(false);
    expect(isPortrait(800, 800)).toBe(false);
  });

  it("holds the current class across a band around square, so a window dragged across it doesn't re-snap", () => {
    // from landscape: stays landscape until clearly portrait
    expect(isPortrait(790, 800, false)).toBe(false);
    expect(isPortrait(740, 800, false)).toBe(true);
    // from portrait: stays portrait until clearly landscape
    expect(isPortrait(810, 800, true)).toBe(true);
    expect(isPortrait(860, 800, true)).toBe(false);
    // far from square the previous class doesn't matter
    expect(isPortrait(390, 844, false)).toBe(true);
    expect(isPortrait(1280, 720, true)).toBe(false);
  });
});
