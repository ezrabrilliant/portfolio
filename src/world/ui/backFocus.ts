/** The world canvas's focusable wrapper (WorldApp): Tab cycling and the closeup keys start from it. */
export const CANVAS_WRAP_SELECTOR = ".world-canvas-wrap";

type Doc = { activeElement: unknown; querySelector(selector: string): unknown };
type Focusable = { focus(options?: FocusOptions): void };
const canFocus = (el: unknown): el is Focusable =>
  typeof el === "object" && el !== null && typeof (el as Partial<Focusable>).focus === "function";

/**
 * The HUD's Back button: closes the closeup, and a Back pressed from the keyboard (it had the focus: Tab, then Enter or
 * Space) hands the focus to the world canvas. Back unmounts with the closeup, which would drop the focus to <body> and
 * start the next Tab over from the top of the page. A mouse press never focuses the HUD's buttons (Hud.tsx keepFocus),
 * so a clicked Back leaves the focus where it was. The focus is read before closing.
 */
export function closeFromBack(
  button: unknown,
  close: () => void,
  doc: Doc | null = typeof document === "undefined" ? null : document,
): void {
  const hadFocus = doc !== null && doc.activeElement === button;
  close();
  if (!hadFocus) return;
  const wrap = doc.querySelector(CANVAS_WRAP_SELECTOR);
  if (canFocus(wrap)) wrap.focus({ preventScroll: true });
}
