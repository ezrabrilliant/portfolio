import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Vec3 } from "@/world/engine/types";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { sharedKeyboard } from "@/world/input/keyboard";
import { touchInput } from "@/world/input/touch";
import { clampPan } from "@/world/engine/camera/closeup";
import { closeCloseup, closeupPan, scrolledAway } from "./closeupState";
import { createCloseupWalk, walkedSinceOpen } from "./closeupWalk";

// the master contract names this module; the implementations live in ./closeupState (no three.js, shell-safe)
// eslint-disable-next-line react-refresh/only-export-components
export { closeCloseup, openCloseup } from "./closeupState";

/** A press that moves less than this (CSS px) before release is a click, as in InteractionController. */
const CLICK_SLOP = 6;

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

/**
 * Input while a closeup is open (spec §6): a click on the face goes to the program (a click beside it closes the
 * closeup), a sideways drag pans a screen wider than a portrait viewport (closeupPan; a press that moves less than
 * CLICK_SLOP is still a tap), the cursor shows where the face is, keys the screen uses (CloseupTarget.key) reach
 * nothing else, Space does not jump in Play, opening in Play stops Ezra, and walking that starts after the open (keys or
 * stick, Play; input already held while opening does not count) or scrolling the page more than CLOSEUP_SCROLL_EXIT px
 * (Tour) closes it. Esc is handled by useModeTransitions / useTabCycling, the Back button by the HUD.
 */
export function CloseupController() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const ray = useMemo(
    () => ({
      caster: new THREE.Raycaster(),
      ndc: new THREE.Vector2(),
      origin: { x: 0, y: 0, z: 0 } as Vec3,
      dir: { x: 0, y: 0, z: 0 } as Vec3,
    }),
    [],
  );
  const walk = useMemo(createCloseupWalk, []);

  // pointer: taps on the face, closing beside it, dragging a wide screen sideways, the cursor
  useEffect(() => {
    const el = gl.domElement;
    const press = { x: 0, y: 0, lastX: 0, panning: false, id: null as string | null };
    const activeTarget = () => (runtime.closeup ? (runtime.closeups.get(runtime.closeup.id) ?? null) : null);
    const cast = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ray.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.caster.setFromCamera(ray.ndc, camera);
      const o = ray.caster.ray.origin;
      const d = ray.caster.ray.direction;
      ray.origin.x = o.x;
      ray.origin.y = o.y;
      ray.origin.z = o.z;
      ray.dir.x = d.x;
      ray.dir.y = d.y;
      ray.dir.z = d.z;
    };
    const onDown = (e: PointerEvent) => {
      press.x = e.clientX;
      press.y = e.clientY;
      press.lastX = e.clientX;
      press.panning = false;
      press.id = runtime.closeup?.id ?? null;
    };
    // a sideways drag that began in the closeup pans it when the screen is wider than the viewport (the face follows
    // the finger); past CLICK_SLOP the release is no tap
    const onDrag = (e: PointerEvent) => {
      if (press.id === null || runtime.closeup?.id !== press.id || closeupPan.limit <= 0) return;
      if (!press.panning && Math.abs(e.clientX - press.x) <= CLICK_SLOP) return;
      press.panning = true;
      closeupPan.offset = clampPan(closeupPan.offset - (e.clientX - press.lastX) * closeupPan.perPx, closeupPan.limit);
      press.lastX = e.clientX;
    };
    const onUp = (e: PointerEvent) => {
      const id = press.id;
      press.id = null;
      // only presses that began in this closeup: the click that opened it is not also a tap on the program
      if (id === null || runtime.closeup?.id !== id) return;
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > CLICK_SLOP) return;
      const target = activeTarget();
      if (!target) {
        closeCloseup();
        return;
      }
      cast(e);
      const p = target.hit(ray.origin, ray.dir);
      if (p) target.input(p.x, p.y);
      else closeCloseup(); // a click beside the screen goes back
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const target = activeTarget();
      if (!target) return;
      cast(e);
      el.style.cursor = target.hit(ray.origin, ray.dir) ? "pointer" : "";
    };
    // opening or closing resets the cursor (InteractionController's hover pointer, or ours, must not linger); during a
    // closeup a sideways finger drag reaches the canvas as pointer events (the page still scrolls vertically: Tour exit)
    const unsub = useWorld.subscribe((s, prev) => {
      if (s.closeupId === prev.closeupId) return;
      el.style.cursor = "";
      el.style.touchAction = s.closeupId ? "pan-y" : "";
    });
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointermove", onDrag);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointermove", onDrag);
      unsub();
    };
  }, [camera, gl, ray]);

  // keys, in the capture phase: before the shared keyboard, the mode keys and Tab cycling see them
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!runtime.closeup || e.code === "Escape" || isTypingTarget(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = runtime.closeups.get(runtime.closeup.id);
      if (target?.key?.(e.code)) {
        // the screen used it (a map board's arrows): Ezra must not walk, the tour must not switch to Play
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (useWorld.getState().mode === "play" && e.code === "Space") {
        // no jumping behind the closeup
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  // Tour: scrolling the page away ends the closeup
  useEffect(() => {
    const onScroll = () => {
      if (useWorld.getState().mode === "tour" && scrolledAway(window.scrollY)) closeCloseup();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Play: opening stops Ezra (held keys are let go of and wait for their key-up, as MobileControls drops the stick), and
  // walking that starts after the open (a move key pressed, the stick pushed from rest) ends the closeup; a key or stick
  // already held when it opened (E pressed mid-walk) does neither. Runs before PlayerController reads the keys. A target
  // that unmounted ends it too. closeCloseup is event-like and change-guarded: it fires once, never per frame.
  useFrame(() => {
    const open = runtime.closeup;
    if (open && !runtime.closeups.has(open.id)) {
      closeCloseup();
      return;
    }
    const play = useWorld.getState().mode === "play";
    if (walkedSinceOpen(walk, open, play, sharedKeyboard, touchInput.moveForward, touchInput.moveRight)) closeCloseup();
  });

  return null;
}
