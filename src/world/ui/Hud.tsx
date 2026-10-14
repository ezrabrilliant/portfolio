import { useState } from "react";
import { playSfx } from "@/world/engine/audio/sfx";
import { useWorld } from "@/world/state/store";

const HINTS = {
  keys: { play: "WASD move · Space jump · Shift run · E interact · Esc tour", tour: "Scroll to explore · Play to walk around" },
  touch: { play: "Stick: walk · Swipe the right side: look · Tour: back", tour: "Scroll to explore · Drag the stick to walk around" },
} as const;

export function Hud() {
  const [touch] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  const mode = useWorld((s) => s.mode);
  const setMode = useWorld((s) => s.setMode);
  const muted = useWorld((s) => s.muted);
  const toggleMuted = useWorld((s) => s.toggleMuted);
  const prompt = useWorld((s) => s.prompt);
  const ready = useWorld((s) => s.ready);
  return (
    <div className="hud">
      {/* plain buttons whose visible text is the name (no aria-pressed: the text already flips with the state) */}
      <div className="hud-bar" role="group" aria-label="World controls">
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
      <p className="hud-hint">{HINTS[touch ? "touch" : "keys"][mode]}</p>
      <div className="hud-prompt" aria-live="polite">
        {prompt ? (
          <>
            {mode === "play" && <kbd>E</kbd>} {prompt.label}
          </>
        ) : null}
      </div>
      <div id="world-fade" className="world-fade" />
    </div>
  );
}
