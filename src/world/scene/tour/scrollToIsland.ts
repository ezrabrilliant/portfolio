import { stopProgress } from "@/world/engine/camera/tourPath";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { progressToScroll, trackHeightPx } from "./tourMath";

export function scrollToIsland(id: string): void {
  const path = runtime.tourPath;
  if (!path) return;
  const i = path.stops.findIndex((s) => s.id === id);
  if (i < 0) return;
  const vh = window.innerHeight;
  const top = progressToScroll(stopProgress(path, i), trackHeightPx(path.stops.length, vh), vh);
  window.scrollTo({ top, behavior: useWorld.getState().reducedMotion ? "auto" : "smooth" });
}
