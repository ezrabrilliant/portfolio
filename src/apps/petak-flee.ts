export interface Rect { l: number; t: number; r: number; b: number }

export const FLEE_RADIUS = 90;
export const FLEE_COOLDOWN_MS = 900;
export const CATCHES_TO_OPEN = 3;

export function overlaps(a: Rect, b: Rect): boolean {
  return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
}

export interface FreeSpotOpts {
  deskW: number; deskH: number; iconW: number; iconH: number;
  obstacles: Rect[];
  avoid?: { x: number; y: number };
  random?: () => number;
}

/**
 * Pick a landing spot: inside the desk with an 8px margin, a short dart away from
 * the pointer (240–520px) rather than a cross-screen teleport, avoiding obstacles.
 * Constraint relaxation over 120 tries guarantees termination (mockup-validated).
 */
export function freeSpot(o: FreeSpotOpts): { x: number; y: number } {
  const rnd = o.random ?? Math.random;
  let spot = {
    x: Math.max(8, o.deskW - o.iconW - 40),
    y: Math.max(8, o.deskH - o.iconH - 30),
  };
  for (let i = 0; i < 120; i++) {
    const x = 8 + rnd() * Math.max(1, o.deskW - o.iconW - 16);
    const y = 8 + rnd() * Math.max(1, o.deskH - o.iconH - 16);
    if (o.avoid) {
      const dist = Math.hypot(x + o.iconW / 2 - o.avoid.x, y + o.iconH / 2 - o.avoid.y);
      if (dist < 240 || (i < 70 && dist > 520)) continue;
    }
    spot = { x: Math.round(x), y: Math.round(y) };
    const box: Rect = { l: x, t: y, r: x + o.iconW, b: y + o.iconH };
    if (i < 90 && o.obstacles.some((ob) => overlaps(box, ob))) continue;
    return spot;
  }
  return spot;
}

/** Phone-mode tap rule (spec §2.4): no hover on touch, so it hops per tap; 3rd tap opens. */
export function petakTapAction(tapCount: number, reducedMotion: boolean): 'open' | 'hop' {
  if (reducedMotion) return 'open';
  return tapCount >= CATCHES_TO_OPEN ? 'open' : 'hop';
}
