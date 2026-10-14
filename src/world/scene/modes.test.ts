import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { buildTourPath, stopProgress } from "@/world/engine/camera/tourPath";
import type { TourStop } from "@/world/engine/camera/tourPath";
import { buildLayout } from "@/world/engine/gen/layout";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { IsSolid } from "@/world/engine/types";
import { defaultTourStop, islandTop } from "./islands/types";
import { cutsStandUp, dropStart, enterKind, followLineClear, islandUnder, landingColumn, watchPoint } from "./modes";
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

  describe("with the camera's eye", () => {
    // a 5-wide, 3-deep, 5-tall house on the centre; the camera looks at it from the front (+z), like a tour stop
    const box = (x0: number, x1: number) => {
      const out: Array<[number, number, number]> = [];
      for (let x = x0; x <= x1; x++) for (let z = -1; z <= 1; z++) for (let y = 1; y <= 5; y++) out.push([p.origin.x + x, p.origin.y + y, p.origin.z + z]);
      return out;
    };
    const house = box(-2, 2);
    const eye = { x: p.origin.x + 0.5, y: p.origin.y + 7.5, z: p.origin.z + 20 };
    const behind = { x: p.origin.x + 0.5, z: p.origin.z - 1.2 }; // aim just behind the house's middle
    const hiddenSpot = { x: p.origin.x + 0.5, z: p.origin.z - 1.5 }; // the free cell right behind the house

    it("without it, lands on the nearest free cell even if that is behind a prop", () => {
      expect(landingColumn(island(house), p, behind)).toEqual(hiddenSpot);
    });

    it("lands where the camera can see him: past the house's side, or in front of a wall across the island", () => {
      const c = landingColumn(island(house), p, behind, eye);
      expect(c).not.toEqual(hiddenSpot);
      expect(Math.abs(c.x - behind.x)).toBeGreaterThan(2); // beside the house's footprint (x within ±2.5)
      const wall = landingColumn(island(box(-10, 10)), p, behind, eye);
      expect(wall.z).toBeGreaterThan(p.origin.z + 2); // in front of the wall's front face
      expect(Math.abs(wall.x - behind.x)).toBeLessThanOrEqual(1);
    });

    it("keeps the nearest cell when nothing hides it", () => {
      expect(landingColumn(island(), p, { x: 61.2, z: -15.9 }, eye)).toEqual({ x: 61.5, z: -15.5 });
    });

    it("ignores the camera when it can see no free cell at all", () => {
      const walled = landingColumn(island(house), p, behind, { x: p.origin.x + 0.5, y: p.origin.y + 3, z: p.origin.z + 0.5 });
      expect(walled).toEqual({ x: p.origin.x + 0.5, z: p.origin.z - 1.5 });
    });
  });

  describe("with a clear line for the Play camera (followLineClear)", () => {
    const { x: ox, y: oy, z: oz } = p.origin;
    const centreFeet = { x: ox + 0.5, y: oy + 1, z: oz + 0.5 };
    // a steep tour camera in front (+z): it sees over a board, the low follow camera does not
    const eye = { x: ox + 0.5, y: oy + 120, z: oz + 20 };
    // a board 11 wide and 3 rows tall in the row in front of the centre cell: the follow line from the centre passes
    // it 1.58–1.95 up, and from each of the next three cells back still below its top (3)
    const board: Array<[number, number, number]> = [];
    for (let x = -5; x <= 5; x++) for (let y = 1; y <= 3; y++) board.push([ox + x, oy + y, oz + 1]);

    it("is clear on open grass, and blocked by a board between Ezra's head and the camera", () => {
      expect(followLineClear(island(), centreFeet, eye)).toBe(true);
      expect(followLineClear(island(board), centreFeet, eye)).toBe(false);
      // the same board on his other side is behind the camera's line
      expect(followLineClear(island(board), centreFeet, { x: eye.x, z: oz - 20 })).toBe(true);
    });

    it("lands on the nearest seen cell whose camera line is clear: in front of the board, not right behind it", () => {
      // the tour camera alone would take the centre (it sees him over the board)
      expect(landingColumn(island(board), p, centreFeet, eye)).toEqual({ x: ox + 0.5, z: oz + 2.5 });
      expect(landingColumn(island(), p, centreFeet, eye)).toEqual({ x: ox + 0.5, z: oz + 0.5 });
    });

    it("keeps the camera line clear even when the tour camera sees no free cell (still far off or mid-flight)", () => {
      // the eye is sealed in a block far in front: it sees nothing, but the Play camera still starts toward it
      const sealed = { x: ox + 0.5, y: oy + 3.5, z: oz + 30.5 };
      const solid = island([...board, [ox, oy + 3, oz + 30]]);
      // without the clear-line rule the nearest free cell (the centre) would win, its line blocked by the board
      expect(followLineClear(solid, centreFeet, sealed)).toBe(false);
      const c = landingColumn(solid, p, centreFeet, sealed);
      expect(c).toEqual({ x: ox + 0.5, z: oz + 2.5 });
      expect(followLineClear(solid, { x: c.x, y: oy + 1, z: c.z }, sealed)).toBe(true);
    });

    it("still lands where the tour camera sees him when no such cell has a clear line", () => {
      // a slab 3–5 above the grass over the front (z ≥ 2): every camera line toward +z from rows 0 and −1 ends in
      // it, while an eye almost overhead sees those rows over it; a tall wall in row −2 hides the rest from the eye
      const ground = island();
      const slab: IsSolid = (x, y, z) => {
        const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
        if (ground(x, y, z)) return true;
        if (Math.abs(bx - ox) > 12) return false;
        return (by >= oy + 4 && by <= oy + 5 && bz >= oz + 2) || (by >= oy + 1 && by <= oy + 25 && bz === oz - 2);
      };
      const high = { x: ox + 0.5, y: oy + 60, z: oz + 15 };
      const aim = { x: ox + 0.5, z: oz + 1.5 }; // nearest free cell: z 1, which that eye cannot see
      expect(landingColumn(slab, p, aim)).toEqual(aim);
      const c = landingColumn(slab, p, aim, high);
      expect(c).toEqual({ x: ox + 0.5, z: oz + 0.5 });
      expect(followLineClear(slab, { x: c.x, y: oy + 1, z: c.z }, high)).toBe(false);
    });
  });
});

describe("islandUnder (the island Ezra stands on in Play)", () => {
  const layout = buildLayout(worldProjects);
  const centre = (q: IslandPlacement) => ({ x: q.origin.x + 0.5, z: q.origin.z + 0.5 });

  it("is the island whose centre column he stands near", () => {
    for (const q of layout.islands) {
      const c = centre(q);
      expect(islandUnder(layout.islands, c.x, c.z)?.id).toBe(q.id);
      expect(islandUnder(layout.islands, c.x + q.radius * 0.9, c.z)?.id).toBe(q.id);
    }
  });

  it("is null between islands (on a bridge or in the air past every radius)", () => {
    for (const c of layout.crossings) {
      const a = layout.islands.find((q) => q.id === c.from)!;
      const b = layout.islands.find((q) => q.id === c.to)!;
      const mid = { x: (centre(a).x + centre(b).x) / 2, z: (centre(a).z + centre(b).z) / 2 };
      const gap = Math.hypot(centre(a).x - centre(b).x, centre(a).z - centre(b).z) / 2;
      if (gap > Math.max(a.radius, b.radius)) expect(islandUnder(layout.islands, mid.x, mid.z), `${c.from} → ${c.to}`).toBeNull();
    }
    expect(islandUnder(layout.islands, 1e4, 1e4)).toBeNull();
  });

  it("takes the nearer centre when two radii overlap", () => {
    const a: IslandPlacement = { ...p, id: "a", origin: { x: 0, y: 0, z: 0 }, radius: 8 };
    const b: IslandPlacement = { ...p, id: "b", origin: { x: 10, y: 0, z: 0 }, radius: 8 };
    expect(islandUnder([a, b], 4, 0.5)?.id).toBe("a");
    expect(islandUnder([a, b], 7, 0.5)?.id).toBe("b");
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

describe("cutsStandUp", () => {
  it("moving during the stand-up stretch ends it, so the first push of the stick or W already walks", () => {
    expect(cutsStandUp(0.8, { x: 0.6, z: 0 })).toBe(true);
  });
  it("no input lets the stretch play out", () => {
    expect(cutsStandUp(0.8, { x: 0, z: 0 })).toBe(false);
    expect(cutsStandUp(0.8, { x: 0.02, z: 0.03 })).toBe(false);
  });
  it("does nothing once he is standing", () => {
    expect(cutsStandUp(0, { x: 1, z: 0 })).toBe(false);
  });
});
