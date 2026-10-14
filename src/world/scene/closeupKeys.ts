import { isControlTarget } from "./closeupFocus";

/** Enter's codes: the key that opens a focused board (Tab cycling) and presses a map board's "go". */
const ENTER = new Set(["Enter", "NumpadEnter"]);

/**
 * Whether a key pressed during a closeup is offered to the screen (CloseupTarget.key). Never a key aimed at an
 * interactive element (Enter on the HUD's focused Back activates Back; a focused mirror link keeps its Enter and
 * arrows); never Enter's auto-repeat (a held Enter that just opened a map board through Tab cycling would go on to
 * press its "go" and travel; a new press still does); nor the auto-repeat of a key still held from before the open
 * (released at the open, it waits for its key-up; a non-repeat keydown of it is a new press after a lost key-up, as the
 * keyboard counts it). The arrows keep their repeat: holding one steps a map's ring along.
 */
export function offersKeyToScreen(
  e: { target: EventTarget | null; code: string; repeat: boolean },
  keyboard: { isWaiting(code: string): boolean },
): boolean {
  if (isControlTarget(e.target)) return false;
  if (!e.repeat) return true;
  return !ENTER.has(e.code) && !keyboard.isWaiting(e.code);
}

/**
 * What a closeup does with a keydown of Space. "none": not Space, or not Play. "block": Play, aimed at the world: no
 * jump behind the closeup (nothing else sees the key) and no default. "stop": Play, Space on a focused control (the
 * HUD's Back reached by Tab): nothing behind the closeup sees it either (no jump, and the Play guard that keeps Space
 * off a focused HUD button stays out of it), but the control keeps its default, so Space presses Back as Enter does.
 */
export function closeupSpace(code: string, play: boolean, target: EventTarget | null): "none" | "block" | "stop" {
  if (!play || code !== "Space") return "none";
  return isControlTarget(target) ? "stop" : "block";
}
