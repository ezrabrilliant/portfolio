import { useEffect } from "react";
import { playSfx } from "@/world/engine/audio/sfx";
import { characterCollides } from "@/world/engine/physics/character";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { isMoveCode, sharedKeyboard } from "@/world/input/keyboard";
import { consumeTouch } from "@/world/input/touch";
import { STAND_UP_SECONDS } from "./ezra/anim";
import { islandTop } from "./islands/types";
import { dropStart, enterKind, landingColumn, watchPoint } from "./modes";
import { progressToScroll } from "./tour/tourMath";
import { nearestTrackProgress, trackFor } from "./tour/tourMotion";

function enterPlay() {
  document.documentElement.classList.add("world-playing");
  const world = useWorld.getState();
  runtime.hoverId = null;
  world.setHovered(null);
  // presses made in the tour (Space / E / touch buttons) must not fire as a jump or interaction on the first Play frame
  sharedKeyboard.consume("Space");
  sharedKeyboard.consume("KeyE");
  consumeTouch("jump");
  consumeTouch("interact");
  const p = runtime.player;
  p.vel.x = p.vel.y = p.vel.z = 0;
  p.jumpTimer = 0;
  const seat = runtime.seat;
  const solid = runtime.built?.grid.isSolid;
  if (enterKind(world.activeIsland, runtime.seated) === "standUp" && seat && solid && !characterCollides(solid, seat.pos.x, seat.pos.y, seat.pos.z)) {
    // stand up where he sat; the stand-up animation unlocks him. He is on the ground already, so the first
    // unlocked step must not report a landing (squash, dust, sound)
    runtime.seated = false;
    runtime.standUp = STAND_UP_SECONDS;
    Object.assign(p.pos, seat.pos);
    Object.assign(p.lastSafe, seat.pos);
    runtime.heading = seat.heading;
    p.onGround = true;
    p.sinceGround = 0;
    p.locked = true;
  } else {
    // drop from the sky onto open ground of the island in view, at the tour's look target, back to the camera;
    // reduced motion: no fall, he is simply there (cuts instead of flights)
    runtime.seated = false;
    runtime.standUp = 0;
    const island = runtime.islandById(world.activeIsland);
    const aim = runtime.tourPath?.stops.find((s) => s.id === island.id)?.target ?? islandTop(island);
    const column = solid ? landingColumn(solid, island, aim) : undefined;
    Object.assign(p.pos, dropStart(island, column));
    p.lastSafe.x = p.pos.x;
    p.lastSafe.y = island.origin.y + 1;
    p.lastSafe.z = p.pos.z;
    runtime.heading = Math.atan2(p.pos.x - runtime.cameraPos.x, p.pos.z - runtime.cameraPos.z);
    if (world.reducedMotion) {
      p.pos.y = p.lastSafe.y;
      p.onGround = true;
      p.sinceGround = 0;
    } else {
      p.onGround = false;
      p.sinceGround = 1; // past coyote time: no jump in mid-air
    }
    p.locked = false;
  }
  playSfx("click");
}

function exitPlay() {
  document.documentElement.classList.remove("world-playing");
  const player = runtime.player;
  // the tour runs no physics: Ezra stays where he was left, but one left mid-air (a drop, a jump, a bounce
  // arc or cart ride, a fall) would hang there, so he goes back to his last footing
  if (runtime.ride || !player.onGround) {
    Object.assign(player.pos, player.lastSafe);
    player.vel.x = player.vel.y = player.vel.z = 0;
    player.onGround = true;
  }
  runtime.ride = null;
  player.locked = false;
  runtime.focusId = null;
  useWorld.getState().setPrompt(null);
  const path = runtime.tourPath;
  if (!path) return;
  // hand-off to TourCamera (B7 contract): resume on B7's re-timed track at the point framing Ezra (his chest,
  // where tour stops aim), and glide there
  const p = player.pos;
  const prog = nearestTrackProgress(trackFor(path), watchPoint(path.stops, { x: p.x, y: p.y + 1.5, z: p.z }));
  runtime.tourProgress = prog;
  runtime.tourBlend = 1;
  window.scrollTo({ top: progressToScroll(prog), behavior: "auto" });
}

/** Tour ↔ Play switching. `enabled` is false on the no-WebGL fallback page, which must keep scrolling normally. */
export function useModeTransitions(enabled: boolean) {
  // a store listener runs inside setMode itself, so Ezra is placed in the same tick as the switch, whoever
  // switches (HUD, keys, phone button, ?play): the next frame's cameras then blend instead of cutting
  useEffect(() => {
    if (!enabled) return;
    return useWorld.subscribe((s, prev) => {
      if (s.mode === prev.mode) return;
      if (s.mode === "play") enterPlay();
      else exitPlay();
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return; // browser shortcuts (Ctrl+D, Alt+←) are not moves
      const s = useWorld.getState();
      if (s.mode === "tour" && isMoveCode(e.code)) s.setMode("play");
      else if (s.mode === "play" && e.code === "Escape") s.setMode("tour");
      // Space is jump in Play: it must not also press a focused HUD button (the "Tour" button right after clicking Play)
      else if (s.mode === "play" && e.code === "Space" && t?.tagName === "BUTTON" && t.closest(".hud")) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    // ?play deep link (screenshots / sharing): wait until the world is built and the tour camera
    // has picked the active island (it does so on its first frame), then enter Play there.
    // runtime.built / tourPath are set while rendering, which can precede the commit by a while (the
    // world suspends on its fonts), so wait for the tour camera's first frame: it writes cameraPos
    let raf = 0;
    if (new URLSearchParams(window.location.search).has("play")) {
      let frames = 0;
      const tick = () => {
        const c = runtime.cameraPos;
        const toured = c.x !== 0 || c.y !== 0 || c.z !== 0;
        if (runtime.built && toured && ++frames > 2) useWorld.getState().setMode("play");
        else raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);
}
