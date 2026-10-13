import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { progressToScroll, stopProgresses } from "./tourMath";

export function scrollToIsland(id: string): void {
  const path = runtime.tourPath;
  if (!path) return;
  const i = path.stops.findIndex((s) => s.id === id);
  if (i < 0) return;
  const top = progressToScroll(stopProgresses(path)[i]);
  window.scrollTo({ top, behavior: useWorld.getState().reducedMotion ? "auto" : "smooth" });
}
