import { useEffect } from "react";
import type { RefObject } from "react";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { closeCloseup } from "./closeupState";
import { cycleFocus } from "./interaction/focus";

/** Tour mode: Tab / Shift+Tab cycle the interactables of the island in view, Enter activates. */
export function useTabCycling(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const clear = () => {
      runtime.focusId = null;
      useWorld.getState().setPrompt(null);
    };
    const onKey = (e: KeyboardEvent) => {
      const s = useWorld.getState();
      if (s.mode !== "tour") return;
      // a closeup has the stage: Tab and Enter don't wander to the islands behind it (Tab moves on to the HUD: Play,
      // Sound, then Back, the bar's last button)
      if (runtime.closeup && e.key !== "Escape") return;
      if (e.key === "Tab") {
        const items = runtime.registry.onIsland(s.activeIsland).filter((i) => (i.enabled ? i.enabled() : true));
        const next = cycleFocus(items.map((i) => i.id), runtime.focusId, e.shiftKey ? -1 : 1);
        if (next === null) {
          clear();
          return; // let focus leave the canvas
        }
        e.preventDefault();
        runtime.focusId = next;
        const item = runtime.registry.get(next);
        if (item) s.setPrompt({ id: item.id, label: item.label });
      } else if (e.key === "Enter" && runtime.focusId) {
        const item = runtime.registry.get(runtime.focusId);
        if (item && (item.enabled ? item.enabled() : true)) item.onActivate();
      } else if (e.key === "Escape") {
        // Esc in the tour backs out of a closeup (useModeTransitions also closes it when the canvas lacks focus)
        closeCloseup();
        clear();
      }
    };
    el.addEventListener("keydown", onKey);
    el.addEventListener("blur", clear);
    return () => {
      el.removeEventListener("keydown", onKey);
      el.removeEventListener("blur", clear);
    };
  }, [ref]);
}
