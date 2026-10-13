import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { buildTourPath, stopProgress } from "@/world/engine/camera/tourPath";
import type { TourStop } from "@/world/engine/camera/tourPath";
import { buildLayout } from "@/world/engine/gen/layout";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { IsSolid } from "@/world/engine/types";
import { defaultTourStop, islandTop } from "./islands/types";
import { dropStart, enterKind, landingColumn, watchPoint } from "./modes";
import { tourVia } from "./tour/tourMath";
import { buildTourTrack, nearestTrackProgress, stopAt } from "./tour/tourMotion";

const p: IslandPlacement = { id: "orbit-store", kind: "star", district: "discord", origin: { x: 64, y: 10, z: -18 }, radius: 8, depth: 6, seed: 3 };

describe("enterKind", () => {
  it("stands up when seated on the hero island", () => {
    expect(enterKind("hero", true)).toBe("standUp");
  });
  it("drops from the sky anywhere else, or once Ezra has stood up", () => {
    expect(enterKind("orbit-store", true)).toBe("drop");
    expect(enterKind("hero", false)).toBe("drop");
  });
});

describe("dropStart", () => {
  it("starts high above the island centre", () => {
    expect(dropStart(p)).toEqual({ x: 64.5, y: 26, z: -17.5 });
  });
  it("starts above a given landing column at the same height", () => {
    expect(dropStart(p, { x: 61.5, z: -14.5 })).toEqual({ x: 61.5, y: 26, z: -14.5 });
  });
});

/** A flat disc of grass at p's top row, plus extra solid blocks. */
function island(extra: Array<[number, number, number]> = []): IsSolid {
  const solid = new Set(extra.map(([x, y, z]) => `${x},${y},${z}`));
  return (x, y, z) => {
    const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
    if (by === p.origin.y && Math.hypot(bx - p.origin.x, bz - p.origin.z) <= p.radius) return true;
    return solid.has(`${bx},${by},${bz}`);
  };
}

describe("landingColumn", () => {
  const centre = { x: p.origin.x + 0.5, z: p.origin.z + 0.5 };

  it("lands on the grass cell nearest the aim point", () => {
    expect(landingColumn(island(), p, { x: 61.2, z: -15.9 })).toEqual({ x: 61.5, z: -15.5 });
    expect(landingColumn(island(), p, centre)).toEqual(centre);
  });

  it("never lands on a prop: a pillar on the centre column pushes the landing next to it", () => {
    const pillar: Array<[number, number, number]> = [1, 2, 3].map((dy) => [p.origin.x, p.origin.y + dy, p.origin.z]);
    const c = landingColumn(island(pillar), p, centre);
    expect(c).not.toEqual(centre);
    expect(Math.hypot(c.x - centre.x, c.z - centre.z)).toBe(1);
  });

  it("keeps the whole fall clear: a block high above the cell rules it out", () => {
    const c = landingColumn(island([[p.origin.x, p.origin.y + 15, p.origin.z]]), p, centre);
    expect(c).not.toEqual(centre);
  });

  it("stays off the rim: the aim far outside the island lands one cell in from the edge", () => {
    const c = landingColumn(island(), p, { x: p.origin.x + 40.5, z: p.origin.z + 0.5 });
    expect(c).toEqual({ x: p.origin.x + p.radius - 1 + 0.5, z: p.origin.z + 0.5 });
  });

  it("falls back to the centre column when nothing is free", () => {
    expect(landingColumn(() => false, p, { x: 0, z: 0 })).toEqual(centre);
  });
});

describe("watchPoint (resuming the tour after Play)", () => {
  const stops: TourStop[] = [
    { id: "a", camera: { x: -10, y: 12, z: 20 }, target: { x: 0, y: 1, z: 0 }, dwell: 1 },
    { id: "b", camera: { x: 90, y: 12, z: 20 }, target: { x: 100, y: 1, z: 0 }, dwell: 1 },
  ];
  it("is the stop camera when Ezra stands at its look target", () => {
    expect(watchPoint(stops, { x: 100, y: 1, z: 0 })).toEqual({ x: 90, y: 12, z: 20 });
  });
  it("moves with Ezra, framed like the stop nearest to him", () => {
    expect(watchPoint(stops, { x: 3, y: 0, z: -2 })).toEqual({ x: -7, y: 11, z: 18 });
  });

  it("resumes the real tour on the chapter of the island Ezra stands on", () => {
    const layout = buildLayout(worldProjects);
    const at = (id: string) => layout.islands.find((i) => i.id === id)!;
    const tourStops = layout.tourOrder.map((id) => defaultTourStop(at(id), { dwell: id === "hero" ? 1.3 : 1 }));
    const path = buildTourPath(tourStops, tourVia(layout));
    const track = buildTourTrack(path);
    layout.tourOrder.forEach((id, i) => {
      const t = islandTop(at(id));
      for (const [dx, dz] of [[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4]]) {
        const prog = nearestTrackProgress(track, watchPoint(path.stops, { x: t.x + dx, y: t.y, z: t.z + dz }));
        expect(stopAt(track, prog), `${id} (${dx}, ${dz})`).toBe(i);
      }
      expect(nearestTrackProgress(track, watchPoint(path.stops, path.stops[i].target))).toBeCloseTo(stopProgress(path, i), 3);
    });
  });
});
