import { playSfx } from "@/world/engine/audio/sfx";
import { useWorld } from "@/world/state/store";

export function Hud() {
  const mode = useWorld((s) => s.mode);
  const setMode = useWorld((s) => s.setMode);
  const muted = useWorld((s) => s.muted);
  const toggleMuted = useWorld((s) => s.toggleMuted);
  const prompt = useWorld((s) => s.prompt);
  return (
    <div className="hud">
      {/* plain buttons whose visible text is the name (no aria-pressed: the text already flips with the state) */}
      <div className="hud-bar" role="group" aria-label="World controls">
        <button type="button" className={mode === "play" ? "hud-btn hud-btn--on" : "hud-btn"} onClick={() => setMode(mode === "play" ? "tour" : "play")}>
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
      <p className="hud-hint">
        {mode === "play" ? "WASD move · Space jump · Shift run · E interact · Esc tour" : "Scroll to explore · Play to walk around"}
      </p>
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
