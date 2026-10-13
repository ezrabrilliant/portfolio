import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { buildTourPath } from "@/world/engine/camera/tourPath";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { STAR_ISLANDS } from "./islands";
import { progressToScroll, refreshScrollMeasure, scrollMeasure, scrollToProgress, stopProgresses, tourVia } from "./tour/tourMath";
import { createTourDriver, stepTourDriver, stopAt, trackFor } from "./tour/tourMotion";
import type { DriverInput } from "./tour/tourMotion";

export function TourCamera() {
  const camera = useThree((s) => s.camera);
  const { path, track } = useMemo(() => {
    const stops = runtime.layout.tourOrder.map((id) => STAR_ISLANDS[id].tourStop(runtime.islandById(id)));
    const p = buildTourPath(stops, tourVia(runtime.layout));
    runtime.tourPath = p;
    return { path: p, track: trackFor(p) };
  }, []);
  const st = useMemo(
    () => ({
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

    // ?stop=N deep link (used by screenshots): jump straight to stop N
    const raw = new URLSearchParams(window.location.search).get("stop");
    const n = raw === null ? NaN : Number(raw);
    if (Number.isInteger(n) && n >= 0 && n < path.stops.length) {
      const prog = stopProgresses(path)[n];
      window.scrollTo(0, progressToScroll(prog));
      st.driver.follow.x = prog;
      st.driver.follow.v = 0;
      st.driver.target = prog;
    }
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
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
    if (!stepTourDriver(d, track, inp)) return;
    if (d.rescroll >= 0) window.scrollTo(0, progressToScroll(d.rescroll, m));
    runtime.tourProgress = d.follow.x;

    // first tour frame after Play: the camera still holds the Play pose, glide from there
    if (d.edge) {
      st.fromPos.copy(camera.position);
      st.fromQ.copy(camera.quaternion);
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
