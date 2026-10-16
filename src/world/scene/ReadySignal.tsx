import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useWorld } from "@/world/state/store";
import { loadCanvasFonts } from "./islands/shared/canvasFonts";
import { patchSceneSeeThrough } from "./seeThroughShader";

/** Longest wait for the canvas screen fonts; past it the screens draw with the fallback stack. */
const SCREEN_FONT_WAIT_MS = 3000;
/** Longest wait for the shaders to compile behind the loader; past it the world shows and compiles as it goes. */
const SHADER_WAIT_MS = 4000;

/**
 * Sets `ready` once the world has mounted (fonts for WorldText resolved inside the Suspense boundary) and the canvas
 * screen fonts have loaded, then compiles every shader the scene uses while the loader still covers it (each material
 * patched first, so none compiles twice), two frames later so the screens' first draw has reached the GPU. Compiling
 * in plain view was the stutter of the first seconds on phones.
 */
export function ReadySignal() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let alive = true;
    let a = 0;
    let b = 0;
    const timers: number[] = [];
    const wait = (ms: number) => new Promise<void>((resolve) => timers.push(window.setTimeout(resolve, ms)));
    // loadCanvasFonts is cached and never rejects; the island screens redraw on the same promise
    void Promise.race([loadCanvasFonts(), wait(SCREEN_FONT_WAIT_MS)])
      .then(() => {
        if (!alive) return;
        patchSceneSeeThrough(scene);
        // compileAsync uses KHR_parallel_shader_compile where the GPU has it, so the loader keeps animating meanwhile
        return Promise.race([gl.compileAsync(scene, camera).catch(() => undefined), wait(SHADER_WAIT_MS)]);
      })
      .then(() => {
        if (!alive) return;
        a = requestAnimationFrame(() => {
          b = requestAnimationFrame(() => useWorld.getState().setReady(true));
        });
      });
    return () => {
      alive = false;
      for (const t of timers) window.clearTimeout(t);
      cancelAnimationFrame(a);
      cancelAnimationFrame(b);
    };
  }, [gl, scene, camera]);
  return null;
}
