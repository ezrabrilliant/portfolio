/**
 * The HUD's hints (Hud.tsx): keyboard and mouse lines, and the touch lines phones show instead. They teach once and get
 * out of the way (hintShown): the tour's line until the first scroll or swipe, Play's legend on the first Play until a
 * few seconds of walking (desktop's ? brings it back), a closeup's line on the first closeup for a few seconds. Each
 * touch line stays on one line on a 360 px phone, and a closeup's on a 320 px one too, so it ends inside the
 * CLOSEUP_HUD_PX band the closeup camera leaves free (hudHints.test checks them against world.css's .hud-hint box).
 */
export const HINTS = {
  keys: {
    play: "WASD move · Space jump · Shift run · Drag to look · Wheel zoom · E or click to use",
    tour: "Scroll or ← → to explore · WASD to walk",
    closeup: "Click the screen to use it · Esc to go back",
    closeupPan: "Drag to pan · Click to use · Esc to go back",
  },
  touch: {
    play: "Thumb: walk · Swipe: look · Pinch: zoom",
    tour: "Scroll or swipe ← → to explore",
    closeup: "Tap the screen to use it · Back to leave",
    closeupPan: "Swipe to pan · Tap to use · Back to leave",
  },
} as const;

export type HintKey = keyof typeof HINTS.keys;

const WITH_E = { key: "E" } as const;
const PLAIN = { key: null } as const;

/**
 * The prompt pill at the bottom of the HUD (Hud.tsx), or null for none. On touch in Play the Use button beside the stick
 * (MobileControls) already shows the prompt's label, so a pill would repeat it right below. Its key cap: Play's E on a
 * keyboard; none in the tour, where a tap or click (or Enter on the item Tab focused) uses it.
 */
export function promptPill(mode: "tour" | "play", touch: boolean): { readonly key: "E" | null } | null {
  if (mode !== "play") return PLAIN;
  return touch ? null : WITH_E;
}

/** What the hints have taught this visit (Hud.tsx keeps one, for the page's life). */
export interface HintSeen {
  tour: boolean;
  play: boolean;
  closeup: boolean;
}

/** Seconds of walking that retire Play's legend, and the longest it stays up without any. */
export const PLAY_HINT = { walked: 2.5, max: 12 } as const;
/** Seconds a closeup's line stays up on the first closeup. */
export const CLOSEUP_HINT_S = 5;

/**
 * Whether the hint for this state is up: the first time each kind is met, until it is marked seen (Hud.tsx marks the
 * tour's on its first scroll or swipe, Play's after PLAY_HINT, a closeup's after CLOSEUP_HINT_S). `help` (desktop's ?)
 * shows Play's legend again whatever has been seen.
 */
export function hintShown(key: HintKey, seen: HintSeen, help: boolean): boolean {
  if (key === "play") return help || !seen.play;
  if (key === "tour") return !seen.tour;
  return !seen.closeup;
}
