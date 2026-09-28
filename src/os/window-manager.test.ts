import { describe, expect, it } from 'vitest';
import {
  CASCADE_ORIGIN_X, cascadePosition, clampToDesk, fitOnOpen, focusedId, initialWM, windowMaxHeight, wmReducer,
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
    expect(cascadePosition(0)).toEqual({ x: 124, y: 24 });
    expect(cascadePosition(1)).toEqual({ x: 156, y: 52 });
    expect(cascadePosition(8)).toEqual(cascadePosition(0));
  });

  it('cascade starts right of the one-column icon strip (os.css .icon-col: left 12 + 88 wide)', () => {
    // final review F1: x 48 put the first window over the icon labels ("Mo", "Ma", "Te")
    expect(CASCADE_ORIGIN_X).toBeGreaterThanOrEqual(12 + 88 + 12);
    expect(cascadePosition(0).x).toBe(CASCADE_ORIGIN_X);
  });

  it('cascadePosition takes a measured free-area origin (two icon columns on a short desk)', () => {
    expect(cascadePosition(0, 218)).toEqual({ x: 218, y: 24 });
    expect(cascadePosition(2, 218)).toEqual({ x: 282, y: 80 });
  });

  it('clampToDesk keeps the title bar reachable', () => {
    // Review Focus #4: dragged off-screen must stay recoverable
    expect(clampToDesk(-1000, -50, 400, 1200, 700)).toEqual({ x: -320, y: 0 });
    expect(clampToDesk(5000, 5000, 400, 1200, 700)).toEqual({ x: 1120, y: 670 });
    expect(clampToDesk(100, 100, 400, 1200, 700)).toEqual({ x: 100, y: 100 });
  });

  it('windowMaxHeight caps every window to the desk space below its top edge (8 px above the dock)', () => {
    // final review F2: fixed-height windows (Bot 520, Kasir 560) ran under the dock on a 512 px tall screen
    expect(windowMaxHeight(24)).toBe('max(120px, 100% - 32px)');
    expect(windowMaxHeight(164)).toBe('max(120px, 100% - 172px)');
    expect(windowMaxHeight(0)).toBe('max(120px, 100% - 8px)');
  });

  it('fitOnOpen pulls a window left so it is fully on the desk when there is room', () => {
    // Monitor (680) cascading at x 250 on a 911 px desk: pulled to 911 - 8 - 680 = 223
    expect(fitOnOpen(250, 52, 680, 911, 440)).toEqual({ x: 223, y: 52 });
    // plenty of room: untouched
    expect(fitOnOpen(124, 24, 380, 1440, 828)).toEqual({ x: 124, y: 24 });
    // wider than the desk: pinned to the left edge, never negative
    expect(fitOnOpen(124, 24, 680, 600, 440)).toEqual({ x: 0, y: 24 });
    // too low (short desk): pulled up so the minimum window (120) still ends 8 px above the dock
    expect(fitOnOpen(124, 900, 380, 1440, 440)).toEqual({ x: 124, y: 312 });
    expect(fitOnOpen(124, -40, 380, 1440, 440)).toEqual({ x: 124, y: 0 });
  });
});
