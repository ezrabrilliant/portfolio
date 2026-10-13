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
