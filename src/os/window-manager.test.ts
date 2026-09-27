import { describe, expect, it } from 'vitest';
import {
  cascadePosition, clampToDesk, focusedId, initialWM, wmReducer,
  type WMState,
} from './window-manager';

const open = (s: WMState, id: string) =>
  wmReducer(s, { type: 'OPEN', id, ...cascadePosition(s.windows.length) });

describe('wmReducer', () => {
  it('OPEN adds a window at the top of the z-order', () => {
    let s = open(initialWM, 'bot');
    s = open(s, 'monitor');
    expect(s.windows).toHaveLength(2);
    expect(focusedId(s)).toBe('monitor');
  });

  it('OPEN of an already-open id restores and focuses, never duplicates', () => {
    let s = open(open(initialWM, 'bot'), 'monitor');
    s = wmReducer(s, { type: 'MINIMIZE', id: 'bot' });
    s = open(s, 'bot');
    expect(s.windows).toHaveLength(2);
    expect(s.windows.find((w) => w.id === 'bot')!.minimized).toBe(false);
    expect(focusedId(s)).toBe('bot');
  });

  it('FOCUS raises the window above every other', () => {
    let s = open(open(initialWM, 'bot'), 'monitor');
    s = wmReducer(s, { type: 'FOCUS', id: 'bot' });
    expect(focusedId(s)).toBe('bot');
  });

  it('CLOSE removes the window and focus falls to the next-highest z', () => {
    let s = open(open(initialWM, 'bot'), 'monitor');
    s = wmReducer(s, { type: 'CLOSE', id: 'monitor' });
    expect(s.windows.map((w) => w.id)).toEqual(['bot']);
    expect(focusedId(s)).toBe('bot');
  });

  it('MINIMIZE drops the window from focus without removing it', () => {
    let s = open(open(initialWM, 'bot'), 'monitor');
    s = wmReducer(s, { type: 'MINIMIZE', id: 'monitor' });
    expect(s.windows).toHaveLength(2);
    expect(focusedId(s)).toBe('bot');
  });

  it('focusedId is null when everything is minimized or closed', () => {
    let s = open(initialWM, 'bot');
    s = wmReducer(s, { type: 'MINIMIZE', id: 'bot' });
    expect(focusedId(s)).toBeNull();
  });

  it('CYCLE brings the back-most visible window to the front (round-robin)', () => {
    let s = open(open(open(initialWM, 'bot'), 'monitor'), 'kasir');
    s = wmReducer(s, { type: 'CYCLE' });
    expect(focusedId(s)).toBe('bot');
    s = wmReducer(s, { type: 'CYCLE' });
    expect(focusedId(s)).toBe('monitor');
  });

  it('CYCLE skips minimized windows and is a no-op with fewer than 2 visible', () => {
    let s = open(open(initialWM, 'bot'), 'monitor');
    s = wmReducer(s, { type: 'MINIMIZE', id: 'bot' });
    const before = s;
    s = wmReducer(s, { type: 'CYCLE' });
    expect(s).toBe(before);
  });

  it('MOVE stores the new position', () => {
    let s = open(initialWM, 'bot');
    s = wmReducer(s, { type: 'MOVE', id: 'bot', x: 200, y: 120 });
    expect(s.windows[0]).toMatchObject({ x: 200, y: 120 });
  });
});

describe('placement helpers', () => {
  it('cascadePosition steps down-right and wraps after 8', () => {
    expect(cascadePosition(0)).toEqual({ x: 48, y: 24 });
    expect(cascadePosition(1)).toEqual({ x: 80, y: 52 });
    expect(cascadePosition(8)).toEqual(cascadePosition(0));
  });

  it('clampToDesk keeps the title bar reachable', () => {
    // Review Focus #4: dragged off-screen must stay recoverable
    expect(clampToDesk(-1000, -50, 400, 1200, 700)).toEqual({ x: -320, y: 0 });
    expect(clampToDesk(5000, 5000, 400, 1200, 700)).toEqual({ x: 1120, y: 670 });
    expect(clampToDesk(100, 100, 400, 1200, 700)).toEqual({ x: 100, y: 100 });
  });
});
