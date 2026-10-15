import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { TourPath } from "@/world/engine/camera/tourPath";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { ISLANDS } from "./islands";
import { buildTour, isPortrait } from "./tour/tourBuild";
import { progressToScroll, refreshScrollMeasure, scrollMeasure, scrollToProgress, stopProgresses } from "./tour/tourMath";
import { createTourDriver, stepTourDriver, stopAt, trackFor, startGlide } from "./tour/tourMotion";
import type { DriverInput, TourTrack } from "./tour/tourMotion";

export function TourCamera() {
  const camera = useThree((s) => s.camera);
  // portrait screens get their own framing (islands centred and pulled back); rotating flips the aspect class
  // (with a band around square, so a window dragged across it doesn't rebuild back and forth)
  const aspectClass = useRef<boolean | undefined>(undefined);
  const portrait = useThree((s) => isPortrait(s.size.width, s.size.height, aspectClass.current));
  // remember the committed class (not in the render body): the selector reads it on the next resize
  useLayoutEffect(() => {
    aspectClass.current = portrait;
  }, [portrait]);
  const tours = useMemo(() => new Map<boolean, { path: TourPath; track: TourTrack }>(), []);
  const { path, track } = useMemo(() => {
    let tour = tours.get(portrait);
    if (!tour) {
      const p = buildTour(runtime.layout, (pl) => ISLANDS[pl.id].tourStop(pl), portrait);
      tour = { path: p, track: trackFor(p) };
      tours.set(portrait, tour);
    }
    runtime.tourPath = tour.path;
    return tour;
  }, [tours, portrait]);
  const st = useMemo(
    () => ({
      /** the path the effects last saw: null before the first, then the one to re-seed from on a flip */
      path: null as TourPath | null,
      driver: createTourDriver(),
      input: { playing: false, scroll: 0, handoff: 0, reduced: false, dt: 0 } as DriverInput,
      chapter: -1,
      innerH: -1,
      fromPos: new THREE.Vector3(),
      fromQ: new THREE.Quaternion(),
      /** a real viewport change: re-measure and keep the tour at the same progress */
      onViewport() {
        this.innerH = window.innerHeight;
        if (!refreshScrollMeasure()) return;
        if (useWorld.getState().mode !== "tour" || this.driver.follow.x < 0) return;
        window.scrollTo(0, progressToScroll(this.driver.target));
      },
    }),
    [],
  );

  useEffect(() => {
    st.innerH = window.innerHeight;
    refreshScrollMeasure();
    const onResize = () => st.onViewport();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [st]);

  // a layout effect: the ?stop seed must land before the first frame (a passive effect can run after it on a slow
  // device, and the ?play deep link then enters Play on the island that first frame picked)
  useLayoutEffect(() => {
    const prev = st.path;
    st.path = path;
    if (prev === path) return;
    const d = st.driver;
    const seed = (prog: number) => {
      window.scrollTo(0, progressToScroll(prog));
      d.follow.x = prog;
      d.follow.v = 0;
      d.target = prog;
    };
    if (!prev) {
      // ?stop=N deep link (used by screenshots): jump straight to stop N
      const raw = new URLSearchParams(window.location.search).get("stop");
      const n = raw === null ? NaN : Number(raw);
      if (Number.isInteger(n) && n >= 0 && n < path.stops.length) seed(stopProgresses(path)[n]);
      return;
    }
    // the aspect class flipped (rotation, resize): stay on the island in view, now with the other framing.
    // Stops keep their scroll progress across framings; in Play, leaving it resumes on the new path anyway
    refreshScrollMeasure();
    if (useWorld.getState().mode !== "tour" || d.follow.x < 0 || st.chapter < 0) return;
    seed(stopProgresses(path)[st.chapter]);
  }, [path, st]);

  useFrame((_, rawDt) => {
    const world = useWorld.getState();
    const playing = world.mode !== "tour";
    if (!playing && window.innerHeight !== st.innerH) st.onViewport();
    const m = scrollMeasure();
    const d = st.driver;
    const inp = st.input;
    inp.playing = playing;
    inp.scroll = playing ? 0 : scrollToProgress(window.scrollY, m);
    inp.handoff = runtime.tourProgress;
    inp.reduced = world.reducedMotion;
    inp.dt = Math.min(rawDt, 1 / 30);
    if (runtime.tourGlideTo >= 0 && !playing) {
      startGlide(d, runtime.tourGlideTo);
      runtime.tourGlideTo = -1;
    }
    if (!stepTourDriver(d, track, inp)) return;
    if (d.rescroll >= 0) window.scrollTo(0, progressToScroll(d.rescroll, m));
    runtime.tourProgress = d.follow.x;

    // first tour frame after Play: the camera still holds the Play pose, glide from there
    if (d.edge) {
      st.fromPos.copy(camera.position);
      st.fromQ.copy(camera.quaternion);
      // Play set the active island from where Ezra stood: re-sync it with the chapter the tour resumes on
      st.chapter = -1;
    }
    camera.position.set(d.cam.x, d.cam.y, d.cam.z);
    camera.lookAt(d.look.x, d.look.y, d.look.z);
    if (d.weight > 0) {
      camera.position.lerp(st.fromPos, d.weight);
      camera.quaternion.slerp(st.fromQ, d.weight);
    }
    runtime.tourBlend = d.blend;
    runtime.cameraPos.x = camera.position.x;
    runtime.cameraPos.y = camera.position.y;
    runtime.cameraPos.z = camera.position.z;

    const ch = stopAt(track, d.follow.x);
    if (ch !== st.chapter) {
      st.chapter = ch;
      world.setActiveIsland(path.stops[ch].id);
    }
  });
  return null;
}
