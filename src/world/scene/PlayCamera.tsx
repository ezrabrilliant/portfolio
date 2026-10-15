import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { closeupExitCut } from "@/world/engine/camera/closeup";
import { createFollowCam, updateFollowCam } from "@/world/engine/camera/followCam";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { orbitInput } from "@/world/input/orbit";
import { followGate } from "./camera/followGate";
import type { FollowGate } from "./camera/followGate";
import { createBoom, probeDistance, stepBoom } from "./camera/boom";
import { isTeleport, yawBehind } from "./camera/teleport";

/** Seconds over which the entering (tour) look direction eases onto Ezra, instead of snapping on the first frame. */
const LOOK_BLEND = 0.9;
/** Rate (per second) the follow position eases toward its goal: quick enough that zooming and turning feel direct. */
const FOLLOW_EASE = 12;
/** Seconds of the hero stand-up glide round to behind Ezra (smoothstep, so it starts and lands softly). */
const SWING = 2.2;

const smooth = (t: number) => THREE.MathUtils.smoothstep(t, 0, 1);

export function PlayCamera() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const cam = useMemo(() => createFollowCam(), []);
  const goal = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  /** the eased follow position before any pull-in (only the rendered camera is pulled in: see boom.ts) */
  const ideal = useMemo(() => new THREE.Vector3(), []);
  const boom = useMemo(() => createBoom(7), []);
  const track = useMemo(
    () => ({
      prev: new THREE.Vector3(),
      active: false,
      // entry look blend: the tour camera's look point (at Ezra's depth) eases onto Ezra over LOOK_BLEND
      enterPos: new THREE.Vector3(),
      enterDir: new THREE.Vector3(),
      lookFrom: new THREE.Vector3(),
      lookT: LOOK_BLEND,
      // hero stand-up: entry-only yaw glide from the tour side round to behind Ezra's heading
      swinging: false,
      swingFrom: 0,
      swingBy: 0,
      swingT: 0,
      /** whether a closeup was open last frame (reduced motion cuts back from it, see closeupExitCut) */
      closeup: { open: false },
    }),
    [],
  );
  const gate = useMemo<FollowGate>(() => ({ heading: 0, follow: false }), []);

  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const down = (e: PointerEvent) => {
      // in a closeup a press is a tap on the screen (CloseupController), never an orbit drag
      if (useWorld.getState().mode !== "play" || e.pointerType === "touch" || runtime.closeup) return;
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
      if (runtime.closeup) return; // no zooming the follow camera behind a closeup
      orbitInput.addZoom(e.deltaY);
    };
    // the world is an app surface: no browser context menu over it in either mode ("Save image as" on a right-click is
    // what people used to 3D tools hit). In Play any button orbits, and an open menu would also swallow the key-ups of
    // keys held meanwhile (the keyboard keeps held keys when the menu is blocked)
    const menu = (e: MouseEvent) => e.preventDefault();
    el.addEventListener("contextmenu", menu);
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("blur", stop);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("contextmenu", menu);
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
      track.closeup.open = false;
      return;
    }
    const dt = Math.min(rawDt, 1 / 30);
    const reduced = useWorld.getState().reducedMotion;
    const p = runtime.player.pos;
    const orbit = orbitInput.take();
    const entering = !track.active;
    if (entering) {
      // drop orbit deltas left over from tour (or a drag that outlived Play), and start the follow
      // yaw where the tour camera already is, so entry is a dolly-in instead of a swing round
      orbit.orbitX = orbit.orbitY = orbit.zoom = 0;
      cam.yaw = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);
      track.enterPos.copy(camera.position);
      camera.getWorldDirection(track.enterDir);
      track.lookT = reduced ? LOOK_BLEND : 0;
      // standing up at the hero seat he faces the tour camera: glide round to behind him (cut under reduced motion)
      track.swinging = runtime.standUp > 0;
      if (track.swinging) {
        const d = runtime.heading + Math.PI - cam.yaw;
        track.swingFrom = cam.yaw;
        track.swingBy = Math.atan2(Math.sin(d), Math.cos(d));
        track.swingT = reduced ? SWING : 0;
      }
    }
    if (track.swinging) {
      // the player taking over (orbit drag, walking off) ends the glide where it is
      if (orbit.orbitX !== 0 || orbit.orbitY !== 0 || runtime.moving) track.swinging = false;
      else {
        track.swingT = Math.min(SWING, track.swingT + (entering ? 0 : dt));
        cam.yaw = track.swingFrom + track.swingBy * smooth(track.swingT / SWING);
        if (track.swingT >= SWING) track.swinging = false;
      }
    }
    // a respawn or a fast travel teleports Ezra while the screen is faded out: cut the camera there instead of
    // sweeping it up from the void (entering Play still blends in from the tour camera), and behind his new heading
    // instead of at the angle it had where he left (a travel faces him away from the destination's tour camera). The map
    // board's closeup is still gliding out then: CloseupCamera cuts it from the arrival on (closeupBlend.travelCutsCloseup)
    const teleported = !entering && isTeleport(track.prev, p);
    if (teleported) {
      track.lookT = LOOK_BLEND;
      cam.yaw = yawBehind(runtime.heading);
    }
    track.prev.set(p.x, p.y, p.z);
    track.active = true;
    // movement is camera-relative, so trailing strafe/backpedal headings would feed back into the
    // input and spin the camera; trail near-forward motion with a weight that fades out by ~26°
    const g = followGate(runtime.heading, cam.yaw, runtime.moving, runtime.ride !== null, gate);
    // updateFollowCam already looks 1.4 above the target, so pass the feet: the look-at then sits
    // inside Ezra's own (always free) AABB, which is what pullIn needs as its starting point
    const { position, lookAt } = updateFollowCam(cam, p, g.heading, g.follow, dt, orbit);
    goal.set(position.x, position.y, position.z);
    // reduced motion: the frame a closeup ends, cut from its pose to the follow pose instead of easing back (CloseupCamera
    // cuts its own blend to 0 then, and CloseupController's exits run before this)
    const closeupCut = closeupExitCut(track.closeup, runtime.closeup !== null, reduced);
    const cut = teleported || closeupCut || (entering && reduced);
    if (entering) ideal.copy(camera.position);
    if (cut) ideal.copy(goal);
    else ideal.lerp(goal, 1 - Math.exp(-FOLLOW_EASE * dt));
    // keep the camera's view of Ezra clear of the blocks you can see (terrain): the boom from his head toward the eased
    // position shortens and lengthens smoothly (boom.ts). Invisible barriers (a pavilion post's whole block, a house's
    // walls) never pull it in: what stands in the line fades instead (SeeThrough)
    const span = Math.hypot(ideal.x - lookAt.x, ideal.y - lookAt.y, ideal.z - lookAt.z);
    if (entering) boom.length = boom.prevSpan = span;
    const limit = runtime.built ? probeDistance(lookAt, ideal, runtime.built.grid.isVisibleSolid) : span;
    const len = stepBoom(boom, limit, dt, cut, span);
    const k = span > 1e-6 ? Math.min(len, span) / span : 1;
    camera.position.set(lookAt.x + (ideal.x - lookAt.x) * k, lookAt.y + (ideal.y - lookAt.y) * k, lookAt.z + (ideal.z - lookAt.z) * k);
    look.set(lookAt.x, lookAt.y, lookAt.z);
    if (entering) {
      // where the tour camera was looking, at Ezra's depth
      track.lookFrom.copy(track.enterPos).addScaledVector(track.enterDir, track.enterPos.distanceTo(look));
    }
    if (track.lookT < LOOK_BLEND) {
      track.lookT = Math.min(LOOK_BLEND, track.lookT + dt);
      look.lerpVectors(track.lookFrom, look, smooth(track.lookT / LOOK_BLEND));
    }
    camera.lookAt(look);
    runtime.cameraPos.x = camera.position.x;
    runtime.cameraPos.y = camera.position.y;
    runtime.cameraPos.z = camera.position.z;
  });
  return null;
}
