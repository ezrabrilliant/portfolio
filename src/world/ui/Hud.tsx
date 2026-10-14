import { useState, useSyncExternalStore } from "react";
import type { MouseEvent } from "react";
import { playSfx } from "@/world/engine/audio/sfx";
import { useWorld } from "@/world/state/store";
import { runtime } from "@/world/state/runtime";
import { closeupPans } from "@/world/engine/camera/closeup";
import { closeCloseup } from "@/world/scene/closeupState";
import { closeFromBack } from "./backFocus";
import { HINTS } from "./hudHints";

/** Re-reads the viewport on resize and rotation (the pan hint follows a phone turned during a closeup). */
function onViewportChange(cb: () => void) {
  window.addEventListener("resize", cb);
  window.addEventListener("orientationchange", cb);
  return () => {
    window.removeEventListener("resize", cb);
    window.removeEventListener("orientationchange", cb);
  };
}

/**
 * A mouse press on a HUD button does not move the focus there (its click still fires; Tab still focuses it): a
 * clicked Play/Tour button kept the focus, and in a closeup a map board's arrows and Enter then went to it (Enter
 * pressed "Tour").
 */
const keepFocus = (e: MouseEvent) => e.preventDefault();

/** Back: closes the closeup; pressed from the keyboard, it hands the focus to the world canvas (backFocus.ts). */
const back = (e: MouseEvent<HTMLButtonElement>) => closeFromBack(e.currentTarget, closeCloseup);

export function Hud() {
  const [touch] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  const mode = useWorld((s) => s.mode);
  const setMode = useWorld((s) => s.setMode);
  const muted = useWorld((s) => s.muted);
  const toggleMuted = useWorld((s) => s.toggleMuted);
  const prompt = useWorld((s) => s.prompt);
  const ready = useWorld((s) => s.ready);
  const closeupId = useWorld((s) => s.closeupId);
  // a screen wider than a portrait viewport is panned in its closeup (CloseupCamera fits its height). A boolean
  // snapshot of the viewport: the HUD re-renders only when the answer flips (a phone turned during the closeup)
  const size = closeupId ? runtime.closeups.get(closeupId)?.size : undefined;
  const pans = useSyncExternalStore(
    onViewportChange,
    () => size !== undefined && closeupPans(size, window.innerWidth / window.innerHeight),
    () => false,
  );
  const hint = closeupId ? (pans ? "closeupPan" : "closeup") : mode;
  return (
    <div className="hud">
      {/* plain buttons whose visible text is the name (no aria-pressed: the text already flips with the state) */}
      <div className="hud-bar" role="group" aria-label="World controls">
        {/* Play waits for the built world (the store ignores it until then) */}
        <button
          type="button"
          className={mode === "play" ? "hud-btn hud-btn--on" : "hud-btn"}
          disabled={!ready}
          onMouseDown={keepFocus}
          onClick={() => setMode(mode === "play" ? "tour" : "play")}
        >
          {mode === "play" ? "Tour" : "Play"}
        </button>
        <button
          type="button"
          className={muted ? "hud-btn" : "hud-btn hud-btn--on"}
          onMouseDown={keepFocus}
          onClick={() => {
            toggleMuted();
            if (muted) playSfx("click");
          }}
        >
          {muted ? "Sound off" : "Sound on"}
        </button>
        {/* closeup: back to the world (Esc, a click beside the screen, scrolling or walking also go back). Last in the
            bar, so Play and Sound keep their places while a closeup is open */}
        {closeupId && (
          <button type="button" className="hud-btn" onMouseDown={keepFocus} onClick={back}>
            <span aria-hidden="true">← </span>Back
          </button>
        )}
      </div>
      <p className="hud-hint">{HINTS[touch ? "touch" : "keys"][hint]}</p>
      <div className="hud-prompt" aria-live="polite">
        {prompt && !closeupId ? (
          <>
            {mode === "play" && <kbd>E</kbd>} {prompt.label}
          </>
        ) : null}
      </div>
      <div id="world-fade" className="world-fade" />
    </div>
  );
}
