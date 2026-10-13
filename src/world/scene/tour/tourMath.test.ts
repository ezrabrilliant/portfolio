import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { buildLayout } from "@/world/engine/gen/layout";
import { buildTourPath, stopProgress } from "@/world/engine/camera/tourPath";
import { chapterAt, progressToScroll, scrollToProgress, tourVia, trackHeightPx } from "./tourMath";

describe("scroll ↔ progress", () => {
  it("maps the scrollable range to 0..1 and back", () => {
    const track = trackHeightPx(5, 1000);
    expect(track).toBe(7000);
    expect(scrollToProgress(0, track, 1000)).toBe(0);
    expect(scrollToProgress(6000, track, 1000)).toBe(1);
    expect(scrollToProgress(9999, track, 1000)).toBe(1);
    expect(progressToScroll(0.5, track, 1000)).toBe(3000);
    expect(scrollToProgress(progressToScroll(0.37, track, 1000), track, 1000)).toBeCloseTo(0.37, 9);
  });
});

describe("tourVia", () => {
  const layout = buildLayout(worldProjects);
  it("gives one via list per consecutive pair, sized by crossing kind", () => {
    const via = tourVia(layout);
    expect(via).toHaveLength(layout.tourOrder.length - 1);
    const expected = { bridge: 1, bouncePads: 3, minecart: 4 } as const;
    layout.tourOrder.slice(0, -1).forEach((from, i) => {
      const to = layout.tourOrder[i + 1];
      const c = layout.crossings.find((x) => x.from === from && x.to === to);
      expect(c).toBeDefined();
      expect(via[i]).toHaveLength(expected[c!.kind]);
    });
  });
  it("keeps via cameras above the crossing they follow", () => {
    const via = tourVia(layout);
    layout.tourOrder.slice(0, -1).forEach((from, i) => {
      const c = layout.crossings.find((x) => x.from === from && x.to === layout.tourOrder[i + 1])!;
      for (const v of via[i]) expect(v.y).toBeGreaterThan(Math.min(c.a.y, c.b.y));
    });
  });
});

describe("chapterAt", () => {
  it("returns the nearest stop index", () => {
    const stop = (id: string, x: number) => ({ id, camera: { x, y: 10, z: 20 }, target: { x, y: 0, z: 0 }, dwell: 1 });
    const path = buildTourPath([stop("a", 0), stop("b", 30), stop("c", 60)]);
    expect(chapterAt(path, 0)).toBe(0);
    expect(chapterAt(path, stopProgress(path, 1))).toBe(1);
    expect(chapterAt(path, 1)).toBe(2);
  });
});
