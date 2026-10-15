import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { patchSceneSeeThrough, seeThroughUniforms } from "./seeThroughShader";

/** Height of Ezra's chest above his feet: the capsule's far end. */
const CHEST = 1.1;
/** Seconds between scene walks for newly mounted materials (patching is idempotent and cheap). */
const SCAN_EVERY = 1;

/**
 * Keeps the see-through capsule (seeThroughShader.ts) on the Play camera → Ezra line. Mount after the cameras, so it reads
 * this frame's camera position. Off in the tour and while a closeup is open.
 */
export function SeeThrough() {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const scan = useRef(SCAN_EVERY);
  useFrame((_, dt) => {
    scan.current += dt;
    if (scan.current >= SCAN_EVERY) {
      scan.current = 0;
      patchSceneSeeThrough(scene);
    }
    const on = useWorld.getState().mode === "play" && !runtime.closeup && !runtime.travel;
    seeThroughUniforms.uSeeOn.value = on ? 1 : 0;
    if (!on) return;
    const p = runtime.player.pos;
    seeThroughUniforms.uSeeFrom.value.copy(camera.position);
    seeThroughUniforms.uSeeTo.value.set(p.x, p.y + CHEST, p.z);
  });
  return null;
}
