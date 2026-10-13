import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { buildLayout } from "@/world/engine/gen/layout";
import { buildTourPath, samplePath, stopProgress } from "@/world/engine/camera/tourPath";
import type { TourPath, TourStop } from "@/world/engine/camera/tourPath";
import type { Vec3 } from "@/world/engine/types";
import { defaultTourStop, islandTop } from "../islands/types";
import { tourVia, trackHeightPx } from "./tourMath";
import { buildTourTrack, followProgress, nearestTrackProgress, sampleTrack, stopAt } from "./tourMotion";
import type { TourTrack } from "./tourMotion";

const layout = buildLayout(worldProjects);
const island = (id: string) => layout.islands.find((i) => i.id === id)!;

// Today's placeholder stops (Part B) and the framing Part C's islands will use
// (docs/superpowers/plans/2026-10-13-voxel-world-phase1-c-islands.md, FRAMING in islands/framing.ts).
const placeholderStops: TourStop[] = layout.tourOrder.map((id) => defaultTourStop(island(id), { dwell: id === "hero" ? 1.3 : 1 }));
type T3 = readonly [number, number, number];
const FRAMING: Record<string, { cam: T3; target: T3; dwell: number }> = {
  hero: { cam: [-5.5, 5.2, 11.5], target: [-1.4, 1.3, -0.4], dwell: 1.2 },
  gtid: { cam: [-8, 7, 15], target: [-2.6, 2.6, 0], dwell: 1 },
  "petak-umpet": { cam: [-7, 4.6, 13], target: [-2.2, 1.8, -0.6], dwell: 1 },
  "orbit-store": { cam: [-6.5, 5.6, 12], target: [-2, 2.4, 0], dwell: 1 },
  "ezra-bot": { cam: [-7, 6.2, 13.5], target: [-2, 2.9, 0.2], dwell: 1 },
};
const islandStops: TourStop[] = layout.tourOrder.map((id) => {
  const t = islandTop(island(id));
  const f = FRAMING[id];
  return {
    id,
    camera: { x: t.x + f.cam[0], y: t.y + f.cam[1], z: t.z + f.cam[2] },
    target: { x: t.x + f.target[0], y: t.y + f.target[1], z: t.z + f.target[2] },
    dwell: f.dwell,
  };
});

const FPS = 60;
const DT = 1 / FPS;
// one viewport of scroll per second: the scrollable range is (stops × 140vh − 100vh)
const VIEWPORT_PER_S = 1 / (trackHeightPx(5, 1) - 1);

type Pose = (p: number, cam: Vec3, look: Vec3) => void;
type Follow = (f: { x: number; v: number }, target: number) => void;

const spring: Follow = (f, target) => followProgress(f, target, DT);
/** The brief's original follower: first-order damp(progress, target, 4, dt). */
const firstOrder: Follow = (f, target) => {
  f.x += (target - f.x) * (1 - Math.exp(-4 * DT));
};
const trackPose = (track: TourTrack): Pose => (p, cam, look) => sampleTrack(track, p, cam, look);
const enginePose = (path: TourPath): Pose => (p, cam, look) => {
  const s = samplePath(path, p);
  Object.assign(cam, s.camera);
  Object.assign(look, s.target);
};

/** Fly the camera at 60 fps while the scroll target moves; per-frame camera speed and velocity changes. */
function fly(pose: Pose, follow: Follow, target: (t: number) => number, seconds: number) {
  const f = { x: target(0), v: 0 };
  const cam = { x: 0, y: 0, z: 0 }, look = { x: 0, y: 0, z: 0 };
  const pos: number[][] = [];
  for (let k = 0; k <= Math.round(seconds * FPS); k++) {
    follow(f, target(k * DT));
    pose(f.x, cam, look);
    pos.push([cam.x, cam.y, cam.z]);
  }
  const vel = pos.slice(1).map((p, k) => p.map((x, j) => (x - pos[k][j]) * FPS));
  const speed = vel.map((v) => Math.hypot(v[0], v[1], v[2]));
  const peak = Math.max(...speed);
  /** largest frame-to-frame change of speed, as a fraction of the peak speed */
  const speedJump = Math.max(...speed.slice(1).map((s, k) => Math.abs(s - speed[k]))) / peak;
  /** largest frame-to-frame change of the velocity vector (speed and direction), as a fraction of the peak */
  const velJump = Math.max(...vel.slice(1).map((v, k) => Math.hypot(v[0] - vel[k][0], v[1] - vel[k][1], v[2] - vel[k][2]))) / peak;
  return { speed, peak, speedJump, velJump };
}

/** Scroll steadily from the previous stop, past stop i, to the next stop (both dwell↔travel boundaries). */
function acrossStop(path: TourPath, i: number, rate: number) {
  const from = stopProgress(path, Math.max(0, i - 1)), to = stopProgress(path, Math.min(path.stops.length - 1, i + 1));
  return { target: (t: number) => Math.min(to, from + rate * t), seconds: (to - from) / rate };
}

/** Wheel notches: 100 px every 100 ms on a 720 px viewport, over the same stretch. */
function notchesAcrossStop(path: TourPath, i: number) {
  const from = stopProgress(path, Math.max(0, i - 1)), to = stopProgress(path, Math.min(path.stops.length - 1, i + 1));
  const notch = (100 / 720) * VIEWPORT_PER_S;
  return { target: (t: number) => Math.min(to, from + notch * Math.floor(t / 0.1)), seconds: (to - from) / notch / 10 };
}

describe("tour track", () => {
  for (const [name, stops] of [["placeholder", placeholderStops], ["island", islandStops]] as const) {
    const path = buildTourPath(stops, tourVia(layout));
    const track = buildTourTrack(path);

    it(`${name} framing: every stop is a fixed point of the re-timing`, () => {
      const cam = { x: 0, y: 0, z: 0 }, look = { x: 0, y: 0, z: 0 };
      stops.forEach((s, i) => {
        sampleTrack(track, stopProgress(path, i), cam, look);
        for (const [a, b] of [[cam, s.camera], [look, s.target]]) {
          expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeLessThan(1e-6);
        }
        expect(stopAt(track, stopProgress(path, i))).toBe(i);
      });
    });

    // Threshold: no single frame may change the camera speed by more than 10% of the stretch's
    // peak (cruise) speed, so going from the slow stop pace to cruise takes at least ~10 frames
    // (≈ 170 ms): an acceleration, never a jump. Measured: 6-7% (steady), 6-10.5% (notches).
    // The engine mapping with the original first-order damp does 40-95% of it in a single frame.
    it(`${name} framing: steady scrolling past each stop changes speed smoothly and never halts`, () => {
      for (let i = 0; i < stops.length; i++) {
        const { target, seconds } = acrossStop(path, i, VIEWPORT_PER_S);
        const now = fly(trackPose(track), spring, target, seconds);
        const before = fly(enginePose(path), firstOrder, target, seconds);
        expect(before.speedJump, `engine kink at stop ${i}`).toBeGreaterThan(0.35);
        expect(now.speedJump, `speed jump at stop ${i}`).toBeLessThan(0.1);
        // slow at the islands but always drifting (≥ half a block per second while scrolling)
        expect(Math.min(...now.speed.slice(FPS / 2, -FPS / 2)), `halt near stop ${i}`).toBeGreaterThan(0.5);
      }
    });

    it(`${name} framing: wheel notches glide instead of stop-and-go`, () => {
      for (let i = 0; i < stops.length; i++) {
        const { target, seconds } = notchesAcrossStop(path, i);
        const now = fly(trackPose(track), spring, target, seconds);
        const before = fly(enginePose(path), firstOrder, target, seconds);
        expect(before.speedJump, `engine notch jolt at stop ${i}`).toBeGreaterThan(0.25);
        expect(now.speedJump, `notch jolt at stop ${i}`).toBeLessThan(0.12);
        expect(Math.min(...now.speed.slice(FPS / 2, -FPS / 2)), `halt between notches near stop ${i}`).toBeGreaterThan(0.5);
      }
    });
  }

  it("island framing: the flight direction turns smoothly too", () => {
    // Part C's stop cameras sit behind the crossing vias, so the path never doubles back; the
    // velocity vector (speed and heading) changes by < 10% of the peak speed per frame.
    const path = buildTourPath(islandStops, tourVia(layout));
    const track = buildTourTrack(path);
    for (let i = 0; i < islandStops.length; i++) {
      const { target, seconds } = acrossStop(path, i, VIEWPORT_PER_S);
      expect(fly(trackPose(track), spring, target, seconds).velJump, `turn jolt at stop ${i}`).toBeLessThan(0.1);
    }
  });

  it("nearestTrackProgress finds the stop for its own camera", () => {
    const path = buildTourPath(islandStops, tourVia(layout));
    const track = buildTourTrack(path);
    islandStops.forEach((s, i) => expect(nearestTrackProgress(track, s.camera)).toBeCloseTo(stopProgress(path, i), 3));
  });
});
