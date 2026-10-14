import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { playSfx } from "@/world/engine/audio/sfx";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { sharedKeyboard } from "@/world/input/keyboard";
import { consumeTouch } from "@/world/input/touch";

export function InteractionController() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const ray = useMemo(() => ({ caster: new THREE.Raycaster(), ndc: new THREE.Vector2() }), []);

  // tour: hover + click through the registry's hitboxes (never the block instances)
  useEffect(() => {
    const el = gl.domElement;
    let downX = 0;
    let downY = 0;
    /** the press began inside a closeup: its release belongs to CloseupController (a tap, or the click that closes it) */
    let downInCloseup = false;
    const pick = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ray.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.caster.setFromCamera(ray.ndc, camera);
      const o = ray.caster.ray.origin;
      const d = ray.caster.ray.direction;
      return runtime.registry.raycast({ x: o.x, y: o.y, z: o.z }, { x: d.x, y: d.y, z: d.z });
    };
    const onMove = (e: PointerEvent) => {
      // a closeup owns the pointer (CloseupController): no hover on the world behind it
      if (e.pointerType !== "mouse" || useWorld.getState().mode !== "tour" || runtime.closeup) return;
      const id = pick(e)?.id ?? null;
      if (id === runtime.hoverId) return;
      runtime.hoverId = id;
      el.style.cursor = id ? "pointer" : "";
      useWorld.getState().setHovered(id);
      if (id) playSfx("hover");
    };
    const onDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
      downInCloseup = runtime.closeup !== null;
    };
    const onUp = (e: PointerEvent) => {
      // checked both ways, so the result never depends on which pointerup listener runs first
      if (downInCloseup || runtime.closeup) return;
      if (useWorld.getState().mode !== "tour") return;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      pick(e)?.onActivate();
    };
    const onLeave = () => {
      runtime.hoverId = null;
      el.style.cursor = "";
      useWorld.getState().setHovered(null);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [camera, gl, ray]);

  // play: nearest interactable in front of Ezra gets the E prompt
  useFrame(() => {
    const s = useWorld.getState();
    if (s.mode !== "play") return;
    if (runtime.hoverId) runtime.hoverId = null;
    if (runtime.closeup) {
      // the closeup has the input: no E prompt or interaction behind it (Ezra stays where he is)
      sharedKeyboard.consume("KeyE");
      consumeTouch("interact");
      if (runtime.focusId !== null) {
        runtime.focusId = null;
        s.setPrompt(null); // change-guarded, event-like
      }
      return;
    }
    const p = runtime.player.pos;
    const near = runtime.ride
      ? null
      : runtime.registry.nearest({ x: p.x, y: p.y + 0.9, z: p.z }, { x: Math.sin(runtime.heading), y: 0, z: Math.cos(runtime.heading) });
    const id = near?.id ?? null;
    if (id !== runtime.focusId) {
      runtime.focusId = id;
      s.setPrompt(near ? { id: near.id, label: near.label } : null); // change-guarded, event-like
    }
    const pressed = sharedKeyboard.consume("KeyE") || consumeTouch("interact");
    if (pressed && near) near.onActivate();
  });
  return null;
}
