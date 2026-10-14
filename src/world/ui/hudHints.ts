/**
 * The HUD's hint line (Hud.tsx): keyboard and mouse lines, and the touch lines phones show instead. Each touch line stays
 * on one line on a 360 px phone, and a closeup's on a 320 px one too, so it ends inside the CLOSEUP_HUD_PX band the
 * closeup camera leaves free (hudHints.test checks them against world.css's .hud-hint box).
 */
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
