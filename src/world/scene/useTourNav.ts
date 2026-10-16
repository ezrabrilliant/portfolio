import { useEffect } from "react";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { isTypingTarget } from "@/world/input/keyboard";
import { stepTour, swipeDir } from "./tour/tourStep";

/**
 * Tour navigation by island (spec: voxel controls §5): ← / → on a keyboard, a sideways swipe on a phone. Only in the
 * tour and with no closeup open (a map board's closeup owns its arrows). `enabled` is false on the no-WebGL page.
 */
export function useTourNav(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const idle = () => useWorld.getState().mode === "tour" && !runtime.closeup && !useWorld.getState().mapOpen && !useWorld.getState().botOpen;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "ArrowLeft" && e.code !== "ArrowRight") return;
      if (!idle() || isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      stepTour(e.code === "ArrowRight" ? 1 : -1);
    };
    let start: { x: number; y: number } | null = null;
    const onStart = (e: TouchEvent) => {
      start = e.touches.length === 1 && idle() ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    };
    const onEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!start || !t) return;
      const dir = swipeDir(t.clientX - start.x, t.clientY - start.y);
      start = null;
      if (dir && idle()) stepTour(dir);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [enabled]);
}
