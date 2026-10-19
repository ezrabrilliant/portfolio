import { playSfx } from "@/world/engine/audio/sfx";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { progressToScroll, stopProgresses } from "./tourMath";
import { TITLE_DELAY, announceIsland } from "@/world/ui/islandAnnounce";

/** Reduced motion: the cut to the island hides behind a quick fade of the HUD's fade layer (no camera motion). */
function fadeCut(): void {
  const el = document.getElementById("world-fade");
  if (!el) return;
  el.style.transition = "none";
  el.style.opacity = "1";
  requestAnimationFrame(() => {
    el.style.transition = "opacity 0.35s ease";
    el.style.opacity = "0";
  });
}

/**
 * The tour to island `id`: the page jumps to its stop at once and the tour camera flies there (TourCamera, tourMotion
 * startGlide): a hop over the clouds, or for a map pick a rise over the archipelago and a dive. Reduced motion: a cut
 * behind a short fade. The island's name shows as it arrives (TitleCard).
 */
export function scrollToIsland(id: string, kind: "hop" | "map" = "hop"): void {
  const path = runtime.tourPath;
  if (!path) return;
  const i = path.stops.findIndex((s) => s.id === id);
  if (i < 0) return;
  const to = stopProgresses(path)[i];
  if (useWorld.getState().activeIsland !== id) playSfx("travel");
  if (useWorld.getState().reducedMotion) fadeCut();
  else runtime.tourGlide = { to, kind };
  announceIsland(id, useWorld.getState().reducedMotion ? TITLE_DELAY.travel : TITLE_DELAY[kind]);
  window.scrollTo({ top: progressToScroll(to), behavior: "auto" });
}
