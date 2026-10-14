import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";

/** Tour: scrolling the page more than this many px since a closeup opened closes it (spec §6 exits). */
export const CLOSEUP_SCROLL_EXIT = 24;

let openedAtScroll = 0;
const pageScroll = () => (typeof window === "undefined" ? 0 : window.scrollY);

/**
 * Sideways pan of a closeup wider than a portrait viewport (closeupPans): CloseupCamera keeps `limit` (world units either
 * way) and `perPx` (world units per CSS px of drag) current, CloseupController drags `offset`. Each closeup opens centred.
 */
export const closeupPan = { offset: 0, limit: 0, perPx: 0 };

/**
 * Opens the closeup on a registered target (a LiveScreen id): runtime.closeup for frame code and the store's
 * closeupId for the HUD and the touch controls, written together. A plain module without three.js, so the page
 * shell (HUD, mode keys, Tab cycling) can import it; CloseupController.tsx re-exports it for the master contract.
 */
export function openCloseup(id: string): void {
  if (!runtime.closeups.has(id) || runtime.closeup?.id === id) return;
  runtime.closeup = { id };
  closeupPan.offset = 0;
  openedAtScroll = pageScroll();
  // the hover (outline, cursor) belongs to the world behind the closeup
  runtime.hoverId = null;
  const s = useWorld.getState();
  s.setHovered(null);
  s.setCloseup(id);
}

/** Closes the open closeup (the camera glides back to the tour path or the follow camera). No-op when none is open. */
export function closeCloseup(): void {
  if (!runtime.closeup) return;
  runtime.closeup = null;
  useWorld.getState().setCloseup(null);
}

/** Tour exit rule: a closeup is open and the page has scrolled more than CLOSEUP_SCROLL_EXIT px since it opened. */
export function scrolledAway(scrollY: number): boolean {
  return runtime.closeup !== null && Math.abs(scrollY - openedAtScroll) > CLOSEUP_SCROLL_EXIT;
}
