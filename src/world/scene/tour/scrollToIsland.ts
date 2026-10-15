import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { progressToScroll, stopProgresses } from "./tourMath";

export function scrollToIsland(id: string): void {
  const path = runtime.tourPath;
  if (!path) return;
  const i = path.stops.findIndex((s) => s.id === id);
  if (i < 0) return;
  // the page jumps there at once and the tour camera glides (TourCamera: one ease, GLIDE_TIME), instead of a smooth
  // page scroll with the camera's own follow lag on top of it
  const to = stopProgresses(path)[i];
  if (!useWorld.getState().reducedMotion) runtime.tourGlideTo = to;
  window.scrollTo({ top: progressToScroll(to), behavior: "auto" });
}
