import { describe, expect, it } from "vitest";
import { buildTourPath, nearestProgress, samplePath, stopProgress, type TourStop } from "@/world/engine/camera/tourPath";

const stops: TourStop[] = [
  { id: "hero", camera: { x: -10, y: 8, z: 12 }, target: { x: 0, y: 1, z: 0 }, dwell: 1 },
  { id: "gtid", camera: { x: 12, y: 10, z: 6 }, target: { x: 22, y: 3, z: -8 }, dwell: 1.5 },
  { id: "petak", camera: { x: 34, y: 11, z: 12 }, target: { x: 44, y: 4, z: -2 }, dwell: 1 },
];
const via = [[], [{ x: 24, y: 13, z: 12 }]];
const path = buildTourPath(stops, via);
const d = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

describe("buildTourPath", () => {
  it("weights dwell zones plus one travel weight per gap", () => {
    expect(path.totalWeight).toBeCloseTo(1 + 1.5 + 1 + 2, 9);
    expect(path.controls).toHaveLength(4);
    expect(path.stopIndex).toEqual([0, 1, 3]);
  });

  it("needs at least two stops", () => {
    expect(() => buildTourPath([stops[0]])).toThrow();
  });

  it("gives a leg with a heavier travel weight a bigger share of the scroll, keeping the others' proportions", () => {
    const slow = buildTourPath(stops, via, [1.3]);
    expect(slow.travel).toEqual([1.3, 1]);
    expect(path.travel).toEqual([1, 1]);
    expect(slow.totalWeight).toBeCloseTo(path.totalWeight + 0.3, 9);
    const legShare = (p: typeof path, i: number) => stopProgress(p, i + 1) - stopProgress(p, i);
    expect(legShare(slow, 0) / legShare(slow, 1)).toBeGreaterThan(legShare(path, 0) / legShare(path, 1));
    expect(() => buildTourPath(stops, via, [0])).toThrow();
  });
});

describe("samplePath", () => {
  it("starts and ends exactly on the first and last stop", () => {
    expect(d(samplePath(path, 0).camera, stops[0].camera)).toBeLessThan(1e-9);
    expect(d(samplePath(path, 1).camera, stops[2].camera)).toBeLessThan(1e-9);
    expect(d(samplePath(path, 0).target, stops[0].target)).toBeLessThan(1e-9);
  });

  it("is continuous", () => {
    let prev = samplePath(path, 0).camera, worst = 0;
    for (let i = 1; i <= 2000; i++) {
      const c = samplePath(path, i / 2000).camera;
      worst = Math.max(worst, d(c, prev));
      prev = c;
    }
    expect(worst).toBeLessThan(0.2);
  });

  it("never stands still inside a dwell zone", () => {
    const centre = stopProgress(path, 1);
    const span = 1.5 / path.totalWeight;
    const a = samplePath(path, centre - span * 0.3).camera, b = samplePath(path, centre + span * 0.3).camera;
    expect(d(a, b)).toBeGreaterThan(1e-3);
  });

  it("moves slower in dwell zones than in travel zones", () => {
    // weight layout: dwell0 [0,1] · travel0 [1,2] · dwell1 [2,3.5] · travel1 [3.5,4.5] · dwell2 [4.5,5.5]
    const w = path.totalWeight;
    const dwellA = samplePath(path, (2 + 0.2) / w).camera, dwellB = samplePath(path, (2 + 1.3) / w).camera;
    const travelA = samplePath(path, (3.5 + 0.2) / w).camera, travelB = samplePath(path, (3.5 + 0.8) / w).camera;
    const dwellSpeed = d(dwellA, dwellB) / (1.1 / w);
    const travelSpeed = d(travelA, travelB) / (0.6 / w);
    expect(dwellSpeed).toBeLessThan(travelSpeed / 3);
  });

  it("passes through via points", () => {
    const p = nearestProgress(path, via[1][0]);
    expect(d(samplePath(path, p).camera, via[1][0])).toBeLessThan(0.05);
  });

  it("reports chapters in order", () => {
    let last = 0;
    for (let i = 0; i <= 100; i++) {
      const s = samplePath(path, i / 100);
      expect(s.chapter).toBeGreaterThanOrEqual(last);
      expect(s.chapterProgress).toBeGreaterThanOrEqual(0);
      expect(s.chapterProgress).toBeLessThanOrEqual(1);
      last = s.chapter;
    }
    expect(samplePath(path, stopProgress(path, 1)).chapter).toBe(1);
  });
});

describe("stopProgress / nearestProgress", () => {
  it("lands the camera on each stop", () => {
    for (let i = 0; i < stops.length; i++) {
      expect(d(samplePath(path, stopProgress(path, i)).camera, stops[i].camera)).toBeLessThan(1e-6);
      expect(d(samplePath(path, stopProgress(path, i)).target, stops[i].target)).toBeLessThan(1e-6);
    }
  });

  it("finds the progress nearest a point", () => {
    expect(Math.abs(nearestProgress(path, stops[1].camera) - stopProgress(path, 1))).toBeLessThan(0.03);
  });
});
