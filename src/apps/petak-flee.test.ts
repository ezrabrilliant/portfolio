import { describe, expect, it } from 'vitest';
import { CATCHES_TO_OPEN, freeSpot, overlaps, petakTapAction, type Rect } from './petak-flee';

const seeded = (seq: number[]) => { let i = 0; return () => seq[i++ % seq.length]; };

describe('overlaps', () => {
  it('detects intersection and rejects mere adjacency', () => {
    const a: Rect = { l: 0, t: 0, r: 10, b: 10 };
    expect(overlaps(a, { l: 5, t: 5, r: 15, b: 15 })).toBe(true);
    expect(overlaps(a, { l: 10, t: 0, r: 20, b: 10 })).toBe(false); // touching edges do not overlap
  });
});

describe('freeSpot', () => {
  const base = { deskW: 1200, deskH: 700, iconW: 88, iconH: 96, obstacles: [] as Rect[] };

  it('always lands fully inside the desk', () => {
    for (let s = 0; s < 50; s++) {
      const spot = freeSpot({ ...base, random: seeded([s / 50, (s * 7 % 50) / 50]) });
      expect(spot.x).toBeGreaterThanOrEqual(8);
      expect(spot.y).toBeGreaterThanOrEqual(8);
      expect(spot.x + base.iconW).toBeLessThanOrEqual(base.deskW - 8);
      expect(spot.y + base.iconH).toBeLessThanOrEqual(base.deskH - 8);
    }
  });

  it('hops a short dart away from the pointer, not across the screen', () => {
    const spot = freeSpot({ ...base, avoid: { x: 600, y: 350 }, random: Math.random });
    const dist = Math.hypot(spot.x + 44 - 600, spot.y + 48 - 350);
    expect(dist).toBeGreaterThanOrEqual(240);
  });

  it('terminates with an in-bounds spot even when the desk is fully crowded', () => {
    const wall: Rect = { l: 0, t: 0, r: 1200, b: 700 }; // everything is an obstacle
    const spot = freeSpot({ ...base, obstacles: [wall], random: Math.random });
    expect(spot.x).toBeGreaterThanOrEqual(0);
    expect(spot.y).toBeGreaterThanOrEqual(0);
    expect(spot.x + base.iconW).toBeLessThanOrEqual(base.deskW);
    expect(spot.y + base.iconH).toBeLessThanOrEqual(base.deskH);
  });
});

describe('petakTapAction (phone rule, spec §2.4)', () => {
  it('reduced motion: the very first tap opens', () => {
    expect(petakTapAction(1, true)).toBe('open');
  });
  it('otherwise hops until the 3rd tap opens', () => {
    expect(petakTapAction(1, false)).toBe('hop');
    expect(petakTapAction(2, false)).toBe('hop');
    expect(petakTapAction(CATCHES_TO_OPEN, false)).toBe('open');
  });
});
