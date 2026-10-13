import { useEffect } from "react";
import { useWorld } from "@/world/state/store";
import { loadCanvasFonts } from "./islands/shared/canvasFonts";

/** Longest wait for the canvas screen fonts; past it the screens draw with the fallback stack. */
const SCREEN_FONT_WAIT_MS = 3000;

/**
 * Sets `ready` once the world has mounted (fonts for WorldText resolved inside the Suspense boundary) and the
 * canvas screen fonts have loaded, two frames later so the screens' first draw has reached the GPU.
 */
export function ReadySignal() {
  useEffect(() => {
    let alive = true;
    let a = 0;
    let b = 0;
    let timer = 0;
    const timeout = new Promise<void>((resolve) => {
      timer = window.setTimeout(resolve, SCREEN_FONT_WAIT_MS);
    });
    // loadCanvasFonts is cached and never rejects; the island screens redraw on the same promise
    void Promise.race([loadCanvasFonts(), timeout]).then(() => {
      if (!alive) return;
      a = requestAnimationFrame(() => {
        b = requestAnimationFrame(() => useWorld.getState().setReady(true));
      });
    });
    return () => {
      alive = false;
      window.clearTimeout(timer);
      cancelAnimationFrame(a);
      cancelAnimationFrame(b);
    };
  }, []);
  return null;
}
