import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { patchSceneSeeThrough, seeThroughUniforms } from "./seeThroughShader";

/** Height of Ezra's chest above his feet: the capsule's far end. */
const CHEST = 1.1;
/**
 * New materials are patched before they are first drawn, so nothing compiles twice (a recompile is a hitch): the scene
 * is walked every frame while the world is settling in (fonts, screens and text mount over the first seconds), then
 * every SCAN_EVERY seconds. Patching is idempotent and the walk is cheap.
 */
const SCAN_EVERY = 0.5;
const SETTLE_S = 12;

/**
 * Keeps the see-through capsule (seeThroughShader.ts) on the Play camera → Ezra line. Mount after the cameras, so it reads
 * this frame's camera position. Off in the tour and while a closeup is open.
 */
export function SeeThrough() {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const scan = useRef(SCAN_EVERY);
  useFrame(({ clock }, dt) => {
    scan.current += dt;
    if (scan.current >= SCAN_EVERY || clock.elapsedTime < SETTLE_S) {
      scan.current = 0;
      patchSceneSeeThrough(scene);
    }
    const on = useWorld.getState().mode === "play" && !runtime.closeup && !runtime.travel;
    seeThroughUniforms.uSeeOn.value = on ? 1 : 0;
    if (!on) return;
    const p = runtime.player.pos;
    seeThroughUniforms.uSeeFrom.value.copy(camera.position);
    seeThroughUniforms.uSeeTo.value.set(p.x, p.y + CHEST, p.z);
    seeThroughUniforms.uSeeBody.value.set(p.x, p.y, p.z);
  });
  return null;
}
