import { MOVE_CODES } from "@/world/input/keyboard";

/** Every move key once: bit i of a key mask is MOVE_KEYS[i]. */
const MOVE_KEYS: readonly string[] = [...MOVE_CODES.forward, ...MOVE_CODES.back, ...MOVE_CODES.left, ...MOVE_CODES.right];

/**
 * Movement input already held when a closeup opened (E pressed mid-walk, the phone's Use with the stick pushed). That
 * input must not close the closeup: only movement that starts after the open does (spec §6, "walking exits").
 */
export interface CloseupWalk {
  /** The open closeup this snapshot belongs to: runtime.closeup, compared by identity (each openCloseup makes a new one). */
  open: object | null;
  /** Move keys held at the open and not released since (bit i = MOVE_KEYS[i]). */
  heldKeys: number;
  /** The stick was pushed at the open and has not come back to rest since. */
  heldStick: boolean;
}

export function createCloseupWalk(): CloseupWalk {
  return { open: null, heldKeys: 0, heldStick: false };
}

function moveKeyMask(keys: ReadonlySet<string>): number {
  let mask = 0;
  for (let i = 0; i < MOVE_KEYS.length; i++) if (keys.has(MOVE_KEYS[i])) mask |= 1 << i;
  return mask;
}

/**
 * Called every frame with the open closeup (or null): true when movement started after it opened, i.e. a move key went
 * down after the open, or the stick (non-zero once past its dead zone) was pushed after coming to rest. Input held at the
 * open counts again only once released. The first call for a new `open` takes the snapshot. Only Play walks (`play`): in
 * the tour a move key switches modes, which closes the closeup elsewhere. Allocation-free.
 */
export function walkedSinceOpen(
  w: CloseupWalk,
  open: object | null,
  play: boolean,
  keys: ReadonlySet<string>,
  stickForward: number,
  stickRight: number,
): boolean {
  if (open === null && w.open === null) return false;
  const mask = moveKeyMask(keys);
  const stick = stickForward !== 0 || stickRight !== 0;
  if (open !== w.open) {
    w.open = open;
    w.heldKeys = mask;
    w.heldStick = stick;
    return false;
  }
  // released keys, and a stick back at rest, count as fresh input again
  w.heldKeys &= mask;
  if (!stick) w.heldStick = false;
  return play && ((mask & ~w.heldKeys) !== 0 || (stick && !w.heldStick));
}
