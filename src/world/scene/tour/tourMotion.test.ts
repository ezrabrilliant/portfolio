import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { buildLayout } from "@/world/engine/gen/layout";
import { buildTourPath, stopProgress } from "@/world/engine/camera/tourPath";
import type { TourPath, TourStop } from "@/world/engine/camera/tourPath";
import type { Vec3 } from "@/world/engine/types";
import { tourStopFor } from "../islands/framing";
import { defaultTourStop, islandTop } from "../islands/types";
import { buildTour } from "./tourBuild";
import { tourVia, trackHeightPx } from "./tourMath";
import { BLEND_TIME, GLIDE_TIME, MAP_GLIDE_TIME, buildTourTrack, createTourDriver, followProgress, glideEase, nearestTrackProgress, overviewOf, sampleTrack, startGlide, stepTourDriver, stopAt } from "./tourMotion";
import type { TourTrack } from "./tourMotion";

const layout = buildLayout(worldProjects);
const island = (id: string) => layout.islands.find((i) => i.id === id)!;

// The placeholder stops (defaultTourStop) and the real island framing (islands/framing.ts).
const placeholderStops: TourStop[] = layout.tourOrder.map((id) => defaultTourStop(island(id), { dwell: id === "hero" ? 1.3 : 1 }));
const islandStops: TourStop[] = layout.tourOrder.map((id) => tourStopFor(island(id)));

const FPS = 60;
const DT = 1 / FPS;
// one viewport of scroll per second: the scrollable range is (stops × 140vh − 100vh)
const VIEWPORT_PER_S = 1 / (trackHeightPx(layout.tourOrder.length, 1) - 1);

type Pose = (p: number, cam: Vec3, look: Vec3) => void;
type Follow = (f: { x: number; v: number }, target: number) => void;

const spring: Follow = (f, target) => followProgress(f, target, DT);
/** The brief's original follower: first-order damp(progress, target, 4, dt). */
const firstOrder: Follow = (f, target) => {
  f.x += (target - f.x) * (1 - Math.exp(-4 * DT));
};
const trackPose = (track: TourTrack): Pose => (p, cam, look) => sampleTrack(track, p, cam, look);

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
  for (const [name, path] of [
    ["placeholder", buildTourPath(placeholderStops, tourVia(layout))],
    ["island", buildTourPath(islandStops, tourVia(layout))],
    ["portrait island", buildTour(layout, tourStopFor, true)],
  ] as const) {
    const stops = path.stops;
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
    it(`${name} framing: steady scrolling past each stop changes speed smoothly and never halts`, () => {
      for (let i = 0; i < stops.length; i++) {
        const { target, seconds } = acrossStop(path, i, VIEWPORT_PER_S);
        const now = fly(trackPose(track), spring, target, seconds);
        expect(now.speedJump, `speed jump at stop ${i}`).toBeLessThan(0.1);
        // slow at the islands but always drifting (≥ half a block per second while scrolling)
        expect(Math.min(...now.speed.slice(FPS / 2, -FPS / 2)), `halt near stop ${i}`).toBeGreaterThan(0.5);
      }
    });

    it(`${name} framing: wheel notches glide instead of stop-and-go`, () => {
      for (let i = 0; i < stops.length; i++) {
        const { target, seconds } = notchesAcrossStop(path, i);
        const now = fly(trackPose(track), spring, target, seconds);
        expect(now.speedJump, `notch jolt at stop ${i}`).toBeLessThan(0.12);
        expect(Math.min(...now.speed.slice(FPS / 2, -FPS / 2)), `halt between notches near stop ${i}`).toBeGreaterThan(0.5);
      }
    });
  }

  for (const [name, path] of [
    ["island", buildTourPath(islandStops, tourVia(layout))],
    ["portrait island", buildTour(layout, tourStopFor, true)],
  ] as const) {
    it(`${name} framing: the flight direction turns smoothly too`, () => {
      // the island framing puts each stop camera behind the crossing vias, so the path never doubles back; the
      // velocity vector (speed and heading) changes by < 10% of the peak speed per frame.
      const track = buildTourTrack(path);
      for (let i = 0; i < path.stops.length; i++) {
        const { target, seconds } = acrossStop(path, i, VIEWPORT_PER_S);
        expect(fly(trackPose(track), spring, target, seconds).velJump, `turn jolt at stop ${i}`).toBeLessThan(0.1);
      }
    });
  }

  it("nearestTrackProgress finds the stop for its own camera", () => {
    const path = buildTourPath(islandStops, tourVia(layout));
    const track = buildTourTrack(path);
    islandStops.forEach((s, i) => expect(nearestTrackProgress(track, s.camera)).toBeCloseTo(stopProgress(path, i), 3));
  });
});

describe("smoothness metric", () => {
  it("discriminates: a kinked progress mapping fails it, the re-timed track passes", () => {
    // a camera that steps from 10 to 100 units per unit progress at p = 0.5, as a piecewise-linear
    // scroll mapping does at a dwell edge, behind a first-order damp: the step (90% of the peak
    // speed) lands within two frames, so at least 45% of the peak shows up in a single frame
    const kinked: Pose = (p, cam, look) => {
      const s = p < 0.5 ? 10 * p : 5 + 100 * (p - 0.5);
      Object.assign(cam, { x: s, y: 10, z: 20 });
      Object.assign(look, { x: s, y: 0, z: 0 });
    };
    const stop = (id: string, x: number) => ({ id, camera: { x, y: 10, z: 20 }, target: { x, y: 0, z: 0 }, dwell: 1 });
    const path = buildTourPath([stop("a", 0), stop("b", 40), stop("c", 80)], [[{ x: 20, y: 10, z: 20 }], [{ x: 60, y: 10, z: 20 }]]);
    const rate = 1 / 6;
    const target = (t: number) => Math.min(1, rate * t);
    expect(fly(kinked, firstOrder, target, 1 / rate).speedJump).toBeGreaterThan(0.4);
    expect(fly(trackPose(buildTourTrack(path)), spring, target, 1 / rate).speedJump).toBeLessThan(0.1);
  });
});

describe("tour driver: Play → tour hand-off", () => {
  const path = buildTourPath(islandStops, tourVia(layout));
  const track = buildTourTrack(path);
  const resume = stopProgress(path, 2); // Ezra walked from the hero to Petak Umpet
  const t = islandTop(island("petak-umpet"));
  const playPose = { x: t.x - 6, y: t.y + 4, z: t.z + 8 };

  /** Tour near the hero, play for 2 s, exit; the page scroll reaches the hand-off `landsAfter` frames later. */
  function exitPlay(landsAfter: number, reduced = false) {
    const d = createTourDriver();
    const input = { playing: false, scroll: 0.05, handoff: 0, reduced, dt: DT };
    for (let k = 0; k < 60; k++) stepTourDriver(d, track, input);
    input.playing = true;
    for (let k = 0; k < 120; k++) expect(stepTourDriver(d, track, input)).toBe(false);
    input.playing = false;
    input.handoff = resume; // set by the exit code in the same tick as setMode("tour")
    const frames: { edge: boolean; x: number; weight: number; dist: number; rescroll: number }[] = [];
    let scroll = 0.05;
    for (let k = 0; k < 90; k++) {
      if (k >= landsAfter) scroll = resume;
      input.scroll = scroll;
      stepTourDriver(d, track, input);
      if (d.rescroll >= 0) scroll = d.rescroll; // TourCamera scrolls the page itself
      const p = { x: d.cam.x + (playPose.x - d.cam.x) * d.weight, y: d.cam.y + (playPose.y - d.cam.y) * d.weight, z: d.cam.z + (playPose.z - d.cam.z) * d.weight };
      frames.push({ edge: d.edge, x: d.follow.x, weight: d.weight, dist: Math.hypot(p.x - d.cam.x, p.y - d.cam.y, p.z - d.cam.z), rescroll: d.rescroll });
    }
    return frames;
  }

  for (const landsAfter of [0, 3, Infinity]) {
    it(`resumes at the hand-off point and glides straight there (page scroll lands after ${landsAfter} frames)`, () => {
      const frames = exitPlay(landsAfter);
      expect(frames.map((f) => f.edge).filter(Boolean)).toHaveLength(1);
      expect(frames[0].edge).toBe(true);
      for (const f of frames) {
        // the track pose never flies from the stale pre-Play progress (0.05, by the hero)
        expect(Math.abs(f.x - resume)).toBeLessThan(1e-9);
        expect(stopAt(track, f.x)).toBe(2);
      }
      // starts on the Play pose and closes in on the track pose every frame, never swinging back
      expect(frames[0].weight).toBeGreaterThan(0.999);
      for (let k = 1; k < frames.length; k++) expect(frames[k].dist).toBeLessThanOrEqual(frames[k - 1].dist + 1e-9);
      expect(frames[Math.ceil(BLEND_TIME * FPS) + 1].weight).toBe(0);
      expect(frames.filter((f) => f.rescroll >= 0)).toHaveLength(landsAfter === Infinity ? 1 : 0);
    });
  }

  it("eases out of the Play pose and onto the track (no speed step at either end)", () => {
    const w = exitPlay(0).map((f) => f.weight);
    const end = Math.ceil(BLEND_TIME * FPS);
    expect(1 - w[0]).toBeLessThan(0.001);
    expect(w[0] - w[1]).toBeLessThan(0.002);
    expect(w[end - 2] - w[end - 1]).toBeLessThan(0.002);
    // steepest around the middle: 1.875 / 48 frames ≈ 0.04 per frame
    expect(Math.max(...w.slice(1, end).map((x, k) => w[k] - x))).toBeLessThan(0.045);
  });

  it("waits about half a second for the page scroll, at any frame rate", () => {
    for (const fps of [30, 60, 144]) {
      const d = createTourDriver();
      const input = { playing: true, scroll: 0.05, handoff: resume, reduced: false, dt: 1 / fps };
      stepTourDriver(d, track, input);
      input.playing = false;
      let waited = 0;
      while (d.rescroll < 0 && waited < 2) {
        stepTourDriver(d, track, input);
        waited += input.dt;
      }
      expect(d.rescroll).toBe(resume);
      expect(waited).toBeGreaterThan(0.5);
      expect(waited).toBeLessThan(0.5 + 2 / fps);
    }
  });

  it("cuts instead of gliding under reduced motion", () => {
    const frames = exitPlay(0, true);
    expect(frames[0].edge).toBe(true);
    expect(frames[0].weight).toBe(0);
    expect(frames[0].x).toBe(resume);
  });
});

describe("island-to-island glide", () => {
  const layout = buildLayout(worldProjects);
  const path = buildTour(layout, (p) => tourStopFor(p), false);
  const track = buildTourTrack(path);

  it("eases in and out: a gentle start, half way at half time, a soft landing", () => {
    expect(glideEase(0)).toBe(0);
    expect(glideEase(1)).toBeCloseTo(1, 12);
    expect(glideEase(0.5)).toBeCloseTo(0.5, 12);
    expect(glideEase(0.1)).toBeLessThan(0.1);
  });

  it("hops to the next stop over an arc above both, then sits on the stop's framing", () => {
    const d = createTourDriver();
    const inp = { playing: false, scroll: track.stops[2], handoff: 0, reduced: false, dt: 1 / 60 };
    stepTourDriver(d, track, inp);
    d.follow.x = track.stops[2];
    d.follow.v = 0;
    startGlide(d, track, track.stops[3], "hop");
    const dur = d.glide!.dur;
    expect(dur).toBeGreaterThanOrEqual(GLIDE_TIME);
    const start = { ...d.glide!.cam0 }, end = { ...d.glide!.cam1 };
    inp.scroll = track.stops[3];
    let t = 0, top = -Infinity;
    while (d.glide && t < 4) {
      stepTourDriver(d, track, inp);
      top = Math.max(top, d.cam.y);
      t += inp.dt;
    }
    expect(t).toBeCloseTo(dur, 1);
    expect(top).toBeGreaterThan(Math.max(start.y, end.y) + 1);
    expect(d.follow.x).toBe(track.stops[3]);
    const cam = { x: 0, y: 0, z: 0 }, look = { x: 0, y: 0, z: 0 };
    sampleTrack(track, track.stops[3], cam, look);
    expect(d.cam).toEqual(cam);
  });

  it("rises over the whole archipelago on a map pick", () => {
    const d = createTourDriver();
    const inp = { playing: false, scroll: track.stops[0], handoff: 0, reduced: false, dt: 1 / 60 };
    stepTourDriver(d, track, inp);
    const view = overviewOf(path.stops);
    startGlide(d, track, track.stops[8], "map", view);
    expect(d.glide!.dur).toBe(MAP_GLIDE_TIME);
    expect(d.glide!.camC.y).toBeGreaterThan(view.center.y + view.spread);
  });

  it("gives way when the page is scrolled elsewhere mid-glide", () => {
    const d = createTourDriver();
    const inp = { playing: false, scroll: track.stops[2], handoff: 0, reduced: false, dt: 1 / 60 };
    stepTourDriver(d, track, inp);
    startGlide(d, track, track.stops[3], "hop");
    inp.scroll = track.stops[5];
    stepTourDriver(d, track, inp);
    expect(d.glide).toBeNull();
  });
});
