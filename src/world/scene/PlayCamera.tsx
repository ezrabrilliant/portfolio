import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createFollowCam, updateFollowCam } from "@/world/engine/camera/followCam";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { orbitInput } from "@/world/input/orbit";
import { followGate } from "./camera/followGate";
import type { FollowGate } from "./camera/followGate";
import { pullIn } from "./camera/pullIn";

export function PlayCamera() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const cam = useMemo(() => createFollowCam(), []);
  const goal = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const track = useMemo(() => ({ prev: new THREE.Vector3(), active: false }), []);
  const gate = useMemo<FollowGate>(() => ({ heading: 0, follow: false }), []);

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
      // a lost pointerup (released outside the window) must not keep orbiting on hover
      if (!dragging || e.buttons === 0) {
        dragging = false;
        return;
      }
      orbitInput.add(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const stop = () => {
      dragging = false;
    };
    const wheel = (e: WheelEvent) => {
      if (useWorld.getState().mode !== "play") return;
      e.preventDefault();
      orbitInput.addZoom(e.deltaY);
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("blur", stop);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("blur", stop);
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
    const entering = !track.active;
    if (entering) {
      // drop orbit deltas left over from tour (or a drag that outlived Play), and start the follow
      // yaw where the tour camera already is, so entry is a dolly-in instead of a swing round
      orbitInput.take();
      cam.yaw = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);
    }
    // a respawn teleports Ezra while the screen is faded out: cut the camera there instead of
    // sweeping it up from the void (entering Play still blends in from the tour camera)
    const teleported = !entering && Math.hypot(p.x - track.prev.x, p.y - track.prev.y, p.z - track.prev.z) > 4;
    track.prev.set(p.x, p.y, p.z);
    track.active = true;
    // movement is camera-relative, so trailing strafe/backpedal headings would feed back into the
    // input and spin the camera; trail near-forward motion with a weight that fades out by ~26°
    const g = followGate(runtime.heading, cam.yaw, runtime.moving, runtime.ride !== null, gate);
    // updateFollowCam already looks 1.4 above the target, so pass the feet: the look-at then sits
    // inside Ezra's own (always free) AABB, which is what pullIn needs as its starting point
    const { position, lookAt } = updateFollowCam(cam, p, g.heading, g.follow, dt, orbitInput.take());
    goal.set(position.x, position.y, position.z);
    if (teleported || (entering && useWorld.getState().reducedMotion)) camera.position.copy(goal);
    else camera.position.lerp(goal, 1 - Math.exp(-6 * dt));
    // keep the camera's own ray to Ezra clear: snap in front of a block at once, ease back out via the lerp
    if (runtime.built) {
      const safe = pullIn(lookAt, camera.position, runtime.built.grid.isSolid);
      camera.position.set(safe.x, safe.y, safe.z);
    }
    look.set(lookAt.x, lookAt.y, lookAt.z);
    camera.lookAt(look);
    runtime.cameraPos.x = camera.position.x;
    runtime.cameraPos.y = camera.position.y;
    runtime.cameraPos.z = camera.position.z;
  });
  return null;
}
