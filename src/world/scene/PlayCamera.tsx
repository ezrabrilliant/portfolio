import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createFollowCam, updateFollowCam } from "@/world/engine/camera/followCam";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { orbitInput } from "@/world/input/orbit";
import { pullIn } from "./camera/pullIn";

export function PlayCamera() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const cam = useMemo(() => createFollowCam(), []);
  const goal = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const track = useMemo(() => ({ prev: new THREE.Vector3(), active: false }), []);

  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const down = (e: PointerEvent) => {
      if (useWorld.getState().mode !== "play" || e.pointerType === "touch") return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      orbitInput.add(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const up = () => {
      dragging = false;
    };
    const wheel = (e: WheelEvent) => {
      if (useWorld.getState().mode !== "play") return;
      e.preventDefault();
      orbitInput.addZoom(e.deltaY);
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl]);

  useFrame((_, rawDt) => {
    if (useWorld.getState().mode !== "play") {
      track.active = false;
      return;
    }
    const dt = Math.min(rawDt, 1 / 30);
    const p = runtime.player.pos;
    // a respawn teleports Ezra while the screen is faded out: cut the camera there instead of
    // sweeping it up from the void (entering Play still blends in from the tour camera)
    const teleported = track.active && Math.hypot(p.x - track.prev.x, p.y - track.prev.y, p.z - track.prev.z) > 4;
    track.prev.set(p.x, p.y, p.z);
    track.active = true;
    // updateFollowCam already looks 1.4 above the target, so pass the feet: the look-at then sits
    // inside Ezra's own (always free) AABB, which is what pullIn needs as its starting point
    const { position, lookAt } = updateFollowCam(cam, p, runtime.heading, runtime.moving, dt, orbitInput.take());
    const safe = runtime.built ? pullIn(lookAt, position, runtime.built.grid.isSolid) : position;
    goal.set(safe.x, safe.y, safe.z);
    if (teleported) camera.position.copy(goal);
    else camera.position.lerp(goal, 1 - Math.exp(-6 * dt));
    look.set(lookAt.x, lookAt.y, lookAt.z);
    camera.lookAt(look);
    runtime.cameraPos.x = camera.position.x;
    runtime.cameraPos.y = camera.position.y;
    runtime.cameraPos.z = camera.position.z;
  });
  return null;
}
