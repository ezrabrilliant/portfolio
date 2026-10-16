import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { playSfx } from "@/world/engine/audio/sfx";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { sharedKeyboard } from "@/world/input/keyboard";
import { consumeTouch } from "@/world/input/touch";
import { inReach } from "@/world/engine/interaction/registry";
import { GLINT, glintPoint, glinting } from "./interaction/glints";

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
      if (e.pointerType !== "mouse" || runtime.closeup) return;
      // Play: only what is in reach shows the hand (a click uses it); never while a drag turns the camera
      const play = useWorld.getState().mode === "play";
      if (play && e.buttons !== 0) return;
      const found = pick(e);
      const id = found && (!play || inReach(found, runtime.player.pos)) ? found.id : null;
      if (id === runtime.hoverId) return;
      runtime.hoverId = id;
      el.style.cursor = id ? "pointer" : "";
      useWorld.getState().setHovered(id);
      if (id && !play) playSfx("hover");
    };
    const onDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
      downInCloseup = runtime.closeup !== null;
    };
    const onUp = (e: PointerEvent) => {
      // checked both ways, so the result never depends on which pointerup listener runs first
      if (downInCloseup || runtime.closeup) return;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      const s = useWorld.getState();
      if (s.mode === "tour") {
        pick(e)?.onActivate();
        return;
      }
      // Play: a primary click (a mouse; phones have the action button) on something within Ezra's reach uses it, as E
      // does; a drag turns the camera instead (PlayCamera), and a click on anything farther does nothing
      if (e.pointerType !== "mouse" || e.button !== 0 || runtime.travel || runtime.ride || s.mapOpen) return;
      const hit = pick(e);
      if (hit && inReach(hit, runtime.player.pos)) hit.onActivate();
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

  // glints on what can be used (glints.ts): in Play the nearest few, more often once in reach; in the tour the hovered one
  const glint = useMemo(
    () => ({ t: 0, rnd: [0, 0, 0] as [number, number, number], touch: typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches }),
    [],
  );
  useFrame((_, dt) => {
    const s = useWorld.getState();
    if (runtime.closeup || s.mapOpen || s.botOpen) return;
    glint.t += dt;
    const shed = (it: Parameters<typeof glintPoint>[0], every: number) => {
      if (Math.random() > dt / every) return;
      glint.rnd[0] = Math.random();
      glint.rnd[1] = Math.random();
      glint.rnd[2] = Math.random();
      runtime.particles.burst(glintPoint(it, glint.rnd), "glint", { count: 1 });
    };
    if (s.mode === "play") {
      if (runtime.travel) return;
      for (const g of glinting(runtime.registry.all(), runtime.player.pos)) shed(g.item, g.item.id === runtime.focusId ? GLINT.inReachEvery : GLINT.every);
    } else if (runtime.hoverId) {
      const it = runtime.registry.get(runtime.hoverId);
      if (it) shed(it, GLINT.inReachEvery);
    } else if (glint.touch) {
      // phones have no hover: what can be tapped on the island in view glints now and then
      for (const it of runtime.registry.onIsland(s.activeIsland)) shed(it, GLINT.touchTourEvery);
    }
  });

  // play: nearest interactable in front of Ezra gets the E prompt
  useFrame(() => {
    const s = useWorld.getState();
    if (s.mode !== "play") return;
    if (runtime.hoverId) runtime.hoverId = null;
    if (runtime.closeup || runtime.travel) {
      // the closeup has the input: no E prompt or interaction behind it (Ezra stays where he is); a fast travel neither
      // (an E between the puffs would reopen the departure board, or open the destination's screen mid-arrival)
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
