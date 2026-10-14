/** Elements that keep their own keys during a closeup: links, buttons, form fields and anything in the HUD. */
export const CONTROL_SELECTOR = "a, button, input, select, textarea, .hud";

type Closest = { closest(selector: string): unknown };
const hasClosest = (t: unknown): t is Closest =>
  typeof t === "object" && t !== null && typeof (t as Partial<Closest>).closest === "function";

/**
 * A key event aimed at an interactive element (Enter on the HUD's focused Back button, arrows or Enter on a link of the
 * SEO mirror that Tab reached): that element's, never the closeup screen's. The window, the document and the page body
 * are not controls.
 */
export function isControlTarget(t: EventTarget | null): boolean {
  return hasClosest(t) && t.closest(CONTROL_SELECTOR) != null;
}

/**
 * Lets go of a HUD button that has the focus (left there by Tab, or by a click in a browser that focuses on click),
 * so a closeup that opens gets its keys: otherwise a map board's arrows and Enter would go to that button, and Enter
 * would press it ("Tour" leaves Play). Tab still reaches the HUD's Back button afterwards. No-op without a document.
 */
export function releaseHudFocus(
  doc: { activeElement: unknown } | null = typeof document === "undefined" ? null : document,
): void {
  const el = doc?.activeElement;
  if (!hasClosest(el) || el.closest(".hud") == null) return;
  const blur = (el as { blur?: () => void }).blur;
  if (typeof blur === "function") blur.call(el);
}
