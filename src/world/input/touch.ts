export function joystickVector(
  origin: { x: number; y: number },
  current: { x: number; y: number },
  radius: number,
  deadzone = 0.12,
): { x: number; y: number; magnitude: number } {
  const dx = current.x - origin.x;
  const dy = origin.y - current.y; // screen up = forward
  const dist = Math.hypot(dx, dy);
  const raw = Math.min(1, dist / radius);
  if (raw <= deadzone || dist === 0) return { x: 0, y: 0, magnitude: 0 };
  const magnitude = Math.min(1, (raw - deadzone) / (1 - deadzone));
  return { x: (dx / dist) * magnitude, y: (dy / dist) * magnitude, magnitude };
}

/**
 * Where a joystick touch anchors: a touch on the visible resting stick grabs that stick (its centre), a touch elsewhere
 * in the stick zone floats the stick to the finger.
 */
export function stickOrigin(rest: { x: number; y: number; r: number }, touch: { x: number; y: number }): { x: number; y: number } {
  return Math.hypot(touch.x - rest.x, touch.y - rest.y) <= rest.r ? { x: rest.x, y: rest.y } : { x: touch.x, y: touch.y };
}

/** The knob under the finger, held on the stick's rim once the finger goes past `radius`. */
export function clampKnob(origin: { x: number; y: number }, finger: { x: number; y: number }, radius: number): { x: number; y: number } {
  const dx = finger.x - origin.x;
  const dy = finger.y - origin.y;
  const d = Math.hypot(dx, dy);
  const k = d > radius ? radius / d : 1;
  return { x: origin.x + dx * k, y: origin.y + dy * k };
}

export const touchInput = { moveForward: 0, moveRight: 0, jump: false, interact: false, active: false };

export function consumeTouch(k: "jump" | "interact"): boolean {
  const v = touchInput[k];
  touchInput[k] = false;
  return v;
}

export function resetTouch(): void {
  touchInput.moveForward = 0;
  touchInput.moveRight = 0;
  touchInput.jump = false;
  touchInput.interact = false;
  touchInput.active = false;
}
