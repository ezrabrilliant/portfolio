import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { buildTourPath, stopProgress } from "@/world/engine/camera/tourPath";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { STAR_ISLANDS } from "./islands";
import { progressToScroll, scrollToProgress, tourVia, trackHeightPx } from "./tour/tourMath";
import { followProgress, sampleTrack, stopAt, trackFor } from "./tour/tourMotion";

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
      follow: { x: -1, v: 0 },
      chapter: -1,
      blending: false,
      cam: { x: 0, y: 0, z: 0 },
      look: { x: 0, y: 0, z: 0 },
      from: new THREE.Vector3(),
      fromQ: new THREE.Quaternion(),
    }),
    [],
  );

  // ?stop=N deep link (used by screenshots): jump straight to stop N
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("stop");
    if (raw === null) return;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n >= path.stops.length) return;
    const vh = window.innerHeight;
    const prog = stopProgress(path, n);
    window.scrollTo(0, progressToScroll(prog, trackHeightPx(path.stops.length, vh), vh));
    st.follow.x = prog;
    st.follow.v = 0;
  }, [path, st]);

  useFrame((_, rawDt) => {
    const world = useWorld.getState();
    if (world.mode !== "tour") {
      st.blending = false;
      return;
    }
    const dt = Math.min(rawDt, 1 / 30);
    const vh = window.innerHeight;
    const target = scrollToProgress(window.scrollY, trackHeightPx(path.stops.length, vh), vh);
    const f = st.follow;
    if (f.x < 0) f.x = target;
    if (world.reducedMotion) {
      // camera cuts: always sit exactly on the nearest stop
      f.x = track.stops[stopAt(track, target)];
      f.v = 0;
    } else followProgress(f, target, dt);
    runtime.tourProgress = f.x;

    // the play camera's pose, captured on the first frame of a glide back onto the path
    if (runtime.tourBlend > 0 && !st.blending) {
      st.blending = true;
      st.fromQ.copy(camera.quaternion);
    }
    sampleTrack(track, f.x, st.cam, st.look);
    camera.position.set(st.cam.x, st.cam.y, st.cam.z);
    camera.lookAt(st.look.x, st.look.y, st.look.z);
    if (runtime.tourBlend > 0) {
      // glide (position and orientation) from where the play camera was back onto the path
      runtime.tourBlend = world.reducedMotion ? 0 : Math.max(0, runtime.tourBlend - dt / 0.8);
      const w = runtime.tourBlend * runtime.tourBlend;
      st.from.set(runtime.cameraPos.x, runtime.cameraPos.y, runtime.cameraPos.z);
      camera.position.lerp(st.from, w);
      camera.quaternion.slerp(st.fromQ, w);
    }
    if (runtime.tourBlend === 0) {
      st.blending = false;
      runtime.cameraPos.x = camera.position.x;
      runtime.cameraPos.y = camera.position.y;
      runtime.cameraPos.z = camera.position.z;
    }

    const ch = stopAt(track, f.x);
    if (ch !== st.chapter) {
      st.chapter = ch;
      world.setActiveIsland(path.stops[ch].id);
    }
  });
  return null;
}
