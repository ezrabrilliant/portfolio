export const MOVE_CODES = {
  forward: ["KeyW", "ArrowUp"],
  back: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
} as const;

const ALL_MOVE = new Set<string>([...MOVE_CODES.forward, ...MOVE_CODES.back, ...MOVE_CODES.left, ...MOVE_CODES.right]);

export function isMoveCode(code: string): boolean {
  return ALL_MOVE.has(code);
}

const any = (keys: ReadonlySet<string>, codes: readonly string[]) => codes.some((c) => keys.has(c));

export function axisFromKeys(keys: ReadonlySet<string>): { forward: number; right: number } {
  const forward = (any(keys, MOVE_CODES.forward) ? 1 : 0) - (any(keys, MOVE_CODES.back) ? 1 : 0);
  const right = (any(keys, MOVE_CODES.right) ? 1 : 0) - (any(keys, MOVE_CODES.left) ? 1 : 0);
  const len = Math.hypot(forward, right);
  return len > 1 ? { forward: forward / len, right: right / len } : { forward, right };
}

/** Converts camera-space intent into a world-space XZ direction (length ≤ 1). Right = forward × up. */
export function cameraRelative(forward: number, right: number, camF: { x: number; z: number }): { x: number; z: number } {
  const l = Math.hypot(camF.x, camF.z);
  if (l < 1e-6) return { x: 0, z: 0 };
  const fx = camF.x / l;
  const fz = camF.z / l;
  const rx = -fz;
  const rz = fx;
  let x = fx * forward + rx * right;
  let z = fz * forward + rz * right;
  const len = Math.hypot(x, z);
  if (len > 1) {
    x /= len;
    z /= len;
  }
  return { x, z };
}

export interface Keyboard {
  readonly keys: ReadonlySet<string>;
  consume(code: string): boolean;
  /**
   * Lets go of every held key now (a closeup opening in Play: Ezra stops). A key still physically down counts again only
   * as a new press after its key-up: its auto-repeat keydowns are ignored until then.
   */
  release(): void;
  dispose(): void;
}

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as { tagName?: string; isContentEditable?: boolean } | null;
  if (!el || typeof el.tagName !== "string") return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable === true;
}

type VisibilityTarget = EventTarget & { visibilityState?: string };

/**
 * Held keys and one-shot presses. A key-up the page never sees would leave a key held and Ezra walking on his own, so
 * everything is released whenever key-ups can be lost: window blur, a context menu opening (Chrome sends no blur, and
 * the menu swallows the key-up), and the page being hidden.
 */
export function createKeyboard(target: EventTarget, doc: VisibilityTarget | null = typeof document !== "undefined" ? document : null): Keyboard {
  const keys = new Set<string>();
  const pressed = new Set<string>();
  /** keys let go of by release() while still down: their auto-repeat is ignored until a key-up or a new press */
  const waiting = new Set<string>();
  const down = (e: Event) => {
    const k = e as Event & { code?: string; repeat?: boolean };
    if (!k.code || isTypingTarget(e.target)) return;
    if (waiting.has(k.code)) {
      if (k.repeat) return;
      waiting.delete(k.code);
    }
    keys.add(k.code);
    if (!k.repeat) pressed.add(k.code);
  };
  const up = (e: Event) => {
    const k = e as Event & { code?: string };
    if (!k.code) return;
    keys.delete(k.code);
    waiting.delete(k.code);
  };
  const release = () => {
    keys.clear();
    pressed.clear();
  };
  const visibility = () => {
    if (doc?.visibilityState === "hidden") release();
  };
  // a blocked menu (Play's right-drag orbit) opens nothing, so its key-ups still arrive and held keys stay held
  const menu = (e: Event) => {
    if (!e.defaultPrevented) release();
  };
  target.addEventListener("keydown", down);
  target.addEventListener("keyup", up);
  target.addEventListener("blur", release);
  target.addEventListener("contextmenu", menu);
  doc?.addEventListener("visibilitychange", visibility);
  return {
    keys,
    consume(code: string) {
      const had = pressed.has(code);
      pressed.delete(code);
      return had;
    },
    release() {
      for (const code of keys) waiting.add(code);
      keys.clear();
      pressed.clear();
    },
    dispose() {
      target.removeEventListener("keydown", down);
      target.removeEventListener("keyup", up);
      target.removeEventListener("blur", release);
      target.removeEventListener("contextmenu", menu);
      doc?.removeEventListener("visibilitychange", visibility);
    },
  };
}

export const sharedKeyboard: Keyboard = createKeyboard(typeof window !== "undefined" ? window : new EventTarget());
