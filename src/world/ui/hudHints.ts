/**
 * The HUD's hint line (Hud.tsx): keyboard and mouse lines, and the touch lines phones show instead. Monospace 12 px is
 * ~7.2 px a character on phones (SF Mono, Droid Sans Mono), and a 360 px phone leaves 312 px for the text (world.css
 * .hud-hint: 16 px gutters, 8 px padding): a touch line of up to TOUCH_HINT_MAX characters stays on one line there, so
 * a closeup's hint ends inside the CLOSEUP_HUD_PX band the closeup camera leaves free.
 */
export const TOUCH_HINT_MAX = 43;

export const HINTS = {
  keys: {
    play: "WASD move · Space jump · Shift run · E interact · Esc tour",
    tour: "Scroll to explore · Play to walk around",
    closeup: "Click the screen to use it · Esc to go back",
    closeupPan: "Drag to pan · Click to use · Esc to go back",
  },
  touch: {
    play: "Stick: walk · Right side: look · Tour: back",
    tour: "Scroll to explore · Drag the stick to walk",
    closeup: "Tap the screen to use it · Back to leave",
    closeupPan: "Swipe to pan · Tap to use · Back to leave",
  },
} as const;

export type HintKey = keyof typeof HINTS.keys;

/**
 * The key cap shown before the prompt's label (Hud.tsx): Play's E on a keyboard. None on touch, where the prompt reads
 * like the Use button beside the stick (MobileControls), which shows the same label; none in the tour, where a click (or
 * Enter on the item Tab focused) uses it.
 */
export function promptKey(mode: "tour" | "play", touch: boolean): "E" | null {
  return mode === "play" && !touch ? "E" : null;
}
