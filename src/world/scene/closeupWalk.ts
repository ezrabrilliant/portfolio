import { MOVE_CODES } from "@/world/input/keyboard";
import type { Keyboard } from "@/world/input/keyboard";

/** Every move key once. */
const MOVE_KEYS: readonly string[] = [...MOVE_CODES.forward, ...MOVE_CODES.back, ...MOVE_CODES.left, ...MOVE_CODES.right];

/**
 * Movement input already held when a closeup opened (E pressed mid-walk, the phone's Use with the stick pushed). That
 * input must neither walk Ezra nor close the closeup: only movement that starts after the open does (spec §6: Ezra stays
 * where he is while a closeup is open, and walking exits it).
 */
export interface CloseupWalk {
  /** The open closeup this snapshot belongs to: runtime.closeup, compared by identity (each openCloseup makes a new one). */
  open: object | null;
  /** The stick was pushed at the open and has not come back to rest since. */
  heldStick: boolean;
}

export function createCloseupWalk(): CloseupWalk {
  return { open: null, heldStick: false };
}

function anyMoveKey(keys: ReadonlySet<string>): boolean {
  for (let i = 0; i < MOVE_KEYS.length; i++) if (keys.has(MOVE_KEYS[i])) return true;
  return false;
}

/**
 * Called every frame with the open closeup (or null), before PlayerController reads the keys: true when movement started
 * after it opened, i.e. a move key went down after the open, or the stick (non-zero once past its dead zone) was pushed
 * after coming to rest. The first call for a new `open` takes the snapshot and, in Play, stops Ezra as the phone does
 * (MobileControls drops the stick): `keyboard.release()` lets go of the held keys, which then come back only as a new
 * press after their key-up (auto-repeat is ignored), so any move key held after that is a fresh press. Only Play walks
 * (`play`): in the tour a move key switches modes, which closes the closeup elsewhere. Allocation-free per frame.
 */
export function walkedSinceOpen(
  w: CloseupWalk,
  open: object | null,
  play: boolean,
  keyboard: Pick<Keyboard, "keys" | "release">,
  stickForward: number,
  stickRight: number,
): boolean {
  if (open === null && w.open === null) return false;
  const stick = stickForward !== 0 || stickRight !== 0;
  if (open !== w.open) {
    w.open = open;
    w.heldStick = stick;
    if (open !== null && play) keyboard.release();
    return false;
  }
  if (!stick) w.heldStick = false; // a stick back at rest counts as fresh input again
  return play && (anyMoveKey(keyboard.keys) || (stick && !w.heldStick));
}
