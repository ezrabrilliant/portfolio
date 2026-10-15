import { useEffect, useState, useSyncExternalStore } from "react";
import type { MouseEvent } from "react";
import { playSfx } from "@/world/engine/audio/sfx";
import { useWorld } from "@/world/state/store";
import { runtime } from "@/world/state/runtime";
import { closeupPans } from "@/world/engine/camera/closeup";
import { closeCloseup } from "@/world/scene/closeupState";
import { closeFromBack } from "./backFocus";
import { TitleCard } from "./TitleCard";
import { isTypingTarget } from "@/world/input/keyboard";
import { stepTour } from "@/world/scene/tour/tourStep";
import { CLOSEUP_HINT_S, HINTS, PLAY_HINT, hintShown, promptPill, type HintSeen } from "./hudHints";

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

/** What the hints have taught, for the page's life (a reload teaches again). */
const seen: HintSeen = { tour: false, play: false, closeup: false };

/** A folded map. */
function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 4v13.5M15 6.5V20" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** A speaker, with sound waves when on and a slash when muted. */
function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      {on ? (
        <path d="M16 8.5a5 5 0 0 1 0 7M18.6 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}

/**
 * Keeps `seen` up to date and re-renders when a hint retires: the tour's on the first scroll or swipe, Play's after
 * PLAY_HINT of walking (or its longest stay), a closeup's CLOSEUP_HINT_S after the first one opens.
 */
function useHintClock(mode: "tour" | "play", ready: boolean, closeupId: string | null, help: boolean, helpDone: () => void): number {
  const [tick, setTick] = useState(0);
  const retire = (k: keyof HintSeen) => {
    if (seen[k]) return;
    seen[k] = true;
    setTick((t) => t + 1);
  };
  useEffect(() => {
    // counted from the built world on: a ?stop deep link scrolls the page there before it is ready
    if (mode !== "tour" || !ready || seen.tour) return;
    const start = window.scrollY;
    const onScroll = () => {
      if (Math.abs(window.scrollY - start) > 40) retire("tour");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mode, ready]);
  useEffect(() => {
    if (mode !== "play" || (seen.play && !help)) return;
    let walked = 0;
    let up = 0;
    const id = window.setInterval(() => {
      up += 0.25;
      if (runtime.moving) walked += 0.25;
      if (walked >= PLAY_HINT.walked || up >= PLAY_HINT.max) {
        window.clearInterval(id);
        retire("play");
        if (help) helpDone();
      }
    }, 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- helpDone is a state setter wrapper, stable in effect
  }, [mode, help]);
  useEffect(() => {
    if (!closeupId || seen.closeup) return;
    const id = window.setTimeout(() => retire("closeup"), CLOSEUP_HINT_S * 1000);
    return () => window.clearTimeout(id);
  }, [closeupId]);
  return tick;
}

export function Hud() {
  const [touch] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  const mode = useWorld((s) => s.mode);
  const setMode = useWorld((s) => s.setMode);
  const muted = useWorld((s) => s.muted);
  const toggleMuted = useWorld((s) => s.toggleMuted);
  const prompt = useWorld((s) => s.prompt);
  const ready = useWorld((s) => s.ready);
  const closeupId = useWorld((s) => s.closeupId);
  const [help, setHelp] = useState(false);
  const mapOpen = useWorld((s) => s.mapOpen);
  const setMapOpen = useWorld((s) => s.setMapOpen);
  // M opens the island map from anywhere (MapOverlay closes it again, and owns the keys while open)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyM" || e.repeat || e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      const s = useWorld.getState();
      if (!s.ready || s.closeupId || s.mapOpen) return;
      s.setMapOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // a screen wider than a portrait viewport is panned in its closeup (CloseupCamera fits its height). A boolean
  // snapshot of the viewport: the HUD re-renders only when the answer flips (a phone turned during the closeup)
  const size = closeupId ? runtime.closeups.get(closeupId)?.size : undefined;
  const pans = useSyncExternalStore(
    onViewportChange,
    () => size !== undefined && closeupPans(size, window.innerWidth / window.innerHeight),
    () => false,
  );
  useHintClock(mode, ready, closeupId, help, () => setHelp(false));
  // help shows Play's legend until it retires again (or ? is pressed again)
  useEffect(() => {
    if (mode !== "play") setHelp(false);
  }, [mode]);
  const key = closeupId ? (pans ? "closeupPan" : "closeup") : mode;
  const hint = ready && hintShown(key, seen, help && !closeupId) ? HINTS[touch ? "touch" : "keys"][key] : null;
  const pill = promptPill(mode, touch);
  const play = mode === "play";
  const toggleSound = () => {
    toggleMuted();
    if (muted) playSfx("click");
  };
  return (
    <div className="hud">
      <div className="hud-bar" role="group" aria-label="World controls">
        {touch ? (
          // phones: one chip that names where it takes you (Play waits for the built world)
          <button type="button" className={play ? "hud-chip" : "hud-chip hud-chip--go"} disabled={!ready} onClick={() => setMode(play ? "tour" : "play")}>
            {play ? (
              <>
                <span aria-hidden="true">← </span>Tour
              </>
            ) : (
              "Play"
            )}
          </button>
        ) : (
          // desktop: a switch that shows the mode you are in
          <div className="hud-switch" role="group" aria-label="Mode">
            <button type="button" aria-pressed={!play} className={play ? "hud-seg" : "hud-seg hud-seg--on"} onMouseDown={keepFocus} onClick={() => setMode("tour")}>
              Tour
            </button>
            <button type="button" aria-pressed={play} disabled={!ready} className={play ? "hud-seg hud-seg--on" : "hud-seg"} onMouseDown={keepFocus} onClick={() => setMode("play")}>
              Play
            </button>
          </div>
        )}
      </div>
      <div className="hud-tools" role="group" aria-label="Map, sound and help">
        <button type="button" className={mapOpen ? "hud-icon hud-icon--on" : "hud-icon"} aria-label="Island map" aria-pressed={mapOpen} title="Island map (M)" disabled={!ready || !!closeupId} onMouseDown={keepFocus} onClick={() => setMapOpen(!mapOpen)}>
          <MapIcon />
        </button>
        <button type="button" className="hud-icon" aria-label="Sound" aria-pressed={!muted} title={muted ? "Sound off" : "Sound on"} onMouseDown={keepFocus} onClick={toggleSound}>
          <SoundIcon on={!muted} />
        </button>
        {!touch && play && (
          <button
            type="button"
            className={help ? "hud-icon hud-icon--on" : "hud-icon"}
            aria-label="Controls"
            aria-pressed={help}
            title="Controls"
            onMouseDown={keepFocus}
            onClick={() => setHelp((h) => !h)}
          >
            ?
          </button>
        )}
      </div>
      {hint && <p className="hud-hint">{hint}</p>}
      <div className="hud-prompt" aria-live="polite">
        {prompt && !closeupId && pill ? (
          <>
            {pill.key && <kbd>{pill.key}</kbd>} {prompt.label}
          </>
        ) : null}
      </div>
      {/* desktop tour: step island by island (← / → do the same; phones swipe) */}
      {!touch && !play && !closeupId && (
        <div className="hud-steps" role="group" aria-label="Islands">
          <button type="button" className="hud-icon" aria-label="Previous island" title="Previous island (←)" onMouseDown={keepFocus} onClick={() => stepTour(-1)}>
            ‹
          </button>
          <button type="button" className="hud-icon" aria-label="Next island" title="Next island (→)" onMouseDown={keepFocus} onClick={() => stepTour(1)}>
            ›
          </button>
        </div>
      )}
      {/* closeup: back to the world, big and in thumb reach (Esc, a click beside the screen, scrolling or walking also go
          back). CloseupCamera keeps the screen clear of it (CLOSEUP_BACK_PX) */}
      {closeupId && (
        <button type="button" className="hud-back" onMouseDown={keepFocus} onClick={back}>
          <span aria-hidden="true">← </span>Back
        </button>
      )}
      <TitleCard />
      <div id="world-fade" className="world-fade" />
    </div>
  );
}
