import { useState } from "react";
import { playSfx } from "@/world/engine/audio/sfx";
import { useWorld } from "@/world/state/store";
import { runtime } from "@/world/state/runtime";
import { closeupPans } from "@/world/engine/camera/closeup";
import { closeCloseup } from "@/world/scene/closeupState";

const HINTS = {
  keys: {
    play: "WASD move · Space jump · Shift run · E interact · Esc tour",
    tour: "Scroll to explore · Play to walk around",
    closeup: "Click the screen to use it · Esc to go back",
    closeupPan: "Drag to pan · Click to use · Esc to go back",
  },
  touch: {
    play: "Stick: walk · Swipe the right side: look · Tour: back",
    tour: "Scroll to explore · Drag the stick to walk around",
    closeup: "Tap the screen to use it · Back to leave",
    closeupPan: "Swipe to pan · Tap to use · Back to leave",
  },
} as const;

export function Hud() {
  const [touch] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  const mode = useWorld((s) => s.mode);
  const setMode = useWorld((s) => s.setMode);
  const muted = useWorld((s) => s.muted);
  const toggleMuted = useWorld((s) => s.toggleMuted);
  const prompt = useWorld((s) => s.prompt);
  const ready = useWorld((s) => s.ready);
  const closeupId = useWorld((s) => s.closeupId);
  // a screen wider than a portrait viewport is panned in its closeup (CloseupCamera fits its height)
  const size = closeupId ? runtime.closeups.get(closeupId)?.size : undefined;
  const pans = size !== undefined && typeof window !== "undefined" && closeupPans(size, window.innerWidth / window.innerHeight);
  const hint = closeupId ? (pans ? "closeupPan" : "closeup") : mode;
  return (
    <div className="hud">
      {/* plain buttons whose visible text is the name (no aria-pressed: the text already flips with the state) */}
      <div className="hud-bar" role="group" aria-label="World controls">
        {/* closeup: back to the world (Esc, a click beside the screen, scrolling or walking also go back) */}
        {closeupId && (
          <button type="button" className="hud-btn" onClick={closeCloseup}>
            <span aria-hidden="true">← </span>Back
          </button>
        )}
        {/* Play waits for the built world (the store ignores it until then) */}
        <button
          type="button"
          className={mode === "play" ? "hud-btn hud-btn--on" : "hud-btn"}
          disabled={!ready}
          onClick={() => setMode(mode === "play" ? "tour" : "play")}
        >
          {mode === "play" ? "Tour" : "Play"}
        </button>
        <button
          type="button"
          className={muted ? "hud-btn" : "hud-btn hud-btn--on"}
          onClick={() => {
            toggleMuted();
            if (muted) playSfx("click");
          }}
        >
          {muted ? "Sound off" : "Sound on"}
        </button>
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
