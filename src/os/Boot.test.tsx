import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockMatchMedia } from '@/test/match-media';
import { getProjectCount } from '@/config/os-content';
import { Boot, SKIP_GRACE_MS, bootLines } from './Boot';

describe('bootLines', () => {
  it('derives the /projects count from config, never hard-coded', () => {
    expect(bootLines(12)[1]).toBe('mounting /projects ........ 12 found');
    expect(bootLines(13)[1]).toBe('mounting /projects ........ 13 found');
  });

  it('starts his real systems with real numbers', () => {
    const all = bootLines(12).join('\n');
    expect(all).toContain('1,000+ members connected');
    expect(all).toContain('~14.5k req/day');
    expect(all).toContain('3.1M visits recorded');
    expect(all).toContain("2,700+ orders settled");
    expect(all.endsWith('ready.')).toBe(true);
  });
});

describe('Boot', () => {
  it('under reduced motion, finishes immediately without rendering the log', () => {
    mockMatchMedia(['prefers-reduced-motion']);
    const onDone = vi.fn();
    const { container } = render(<Boot onDone={onDone} />);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('press any key to skip')).toBeNull();
    expect(container.querySelector('#boot')).toBeNull();
  });

  it('any keypress skips the boot and calls onDone exactly once', async () => {
    const onDone = vi.fn();
    render(<Boot onDone={onDone} />);
    expect(screen.getByText('press any key to skip')).toBeInTheDocument();
    await userEvent.keyboard('x');
    await userEvent.keyboard('y');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('a click skips the boot', async () => {
    const onDone = vi.fn();
    render(<Boot onDone={onDone} />);
    await userEvent.click(document.body);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('is a dark status surface for assistive tech', () => {
    render(<Boot onDone={() => {}} />);
    const root = screen.getByRole('status', { name: /EzraOS is starting/ });
    expect(root).toHaveClass('dark');
  });

  it('the skip click is swallowed: it never reaches an onClick underneath, later clicks do', async () => {
    const under = vi.fn();
    const onDone = vi.fn();
    function Harness() {
      const [booted, setBooted] = useState(false);
      return (
        <>
          <button type="button" onClick={under}>About EzraOS</button>
          {!booted && <Boot onDone={() => { onDone(); setBooted(true); }} />}
        </>
      );
    }
    render(<Harness />);
    const btn = screen.getByRole('button', { name: 'About EzraOS' });
    await userEvent.click(btn); // full pointerdown → mousedown → pointerup → mouseup → click
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(under).not.toHaveBeenCalled();
    await act(() => new Promise((r) => setTimeout(r, SKIP_GRACE_MS + 50))); // past the post-skip grace window
    await userEvent.click(btn); // boot is gone: the desktop works normally again
    expect(under).toHaveBeenCalledTimes(1);
  });

  it('a double-click that skips the boot opens nothing underneath (final review F6)', async () => {
    // the 1st click skips; the 2nd click + dblclick used to land on the desktop and open Monitor
    const click = vi.fn();
    const dbl = vi.fn();
    const down = vi.fn();
    function Harness() {
      const [booted, setBooted] = useState(false);
      return (
        <>
          <button type="button" onClick={click} onDoubleClick={dbl} onPointerDown={down}>Monitor</button>
          {!booted && <Boot onDone={() => setBooted(true)} />}
        </>
      );
    }
    render(<Harness />);
    const icon = screen.getByRole('button', { name: 'Monitor' });
    await userEvent.dblClick(icon);
    expect(screen.queryByRole('status')).toBeNull(); // boot skipped
    expect(click).not.toHaveBeenCalled();
    expect(dbl).not.toHaveBeenCalled();
    expect(down).toHaveBeenCalledTimes(1); // only the 1st press, before the skip; the 2nd was swallowed
    await act(() => new Promise((r) => setTimeout(r, SKIP_GRACE_MS + 50)));
    await userEvent.dblClick(icon); // after the grace window the desktop answers normally
    expect(dbl).toHaveBeenCalledTimes(1);
  });

  it('phone mode says "tap to skip" (M1)', () => {
    mockMatchMedia(['max-width: 767.98px']);
    render(<Boot onDone={() => {}} />);
    expect(screen.getByText('tap to skip')).toBeInTheDocument();
    expect(screen.queryByText('press any key to skip')).toBeNull();
    expect(screen.getByRole('status', { name: 'EzraOS is starting. Tap to skip.' })).toBeInTheDocument();
  });

  it('desktop keeps "press any key to skip"', () => {
    render(<Boot onDone={() => {}} />);
    expect(screen.getByText('press any key to skip')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'EzraOS is starting. Press any key or click to skip.' })).toBeInTheDocument();
  });

  it('the skip key is consumed: a window keydown listener (like Desktop) never sees it', async () => {
    const seen = vi.fn();
    window.addEventListener('keydown', seen);
    try {
      const onDone = vi.fn();
      render(<Boot onDone={onDone} />);
      await userEvent.keyboard('{Escape}');
      expect(onDone).toHaveBeenCalledTimes(1);
      expect(seen).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('keydown', seen);
    }
  });

  it('browser shortcuts pass through: Ctrl+R, Cmd+R, F5, F12 and bare modifiers neither skip nor preventDefault', () => {
    const onDone = vi.fn();
    render(<Boot onDone={onDone} />);
    const passes: KeyboardEventInit[] = [
      { key: 'r', ctrlKey: true },
      { key: 'r', metaKey: true },
      { key: 'F5' },
      { key: 'F12' },
      { key: 'Shift', shiftKey: true },
      { key: 'Control', ctrlKey: true },
      { key: 'Alt', altKey: true },
      { key: 'Meta', metaKey: true },
    ];
    for (const init of passes) {
      const notPrevented = fireEvent.keyDown(window, init);
      expect(notPrevented, JSON.stringify(init)).toBe(true);
    }
    expect(onDone).not.toHaveBeenCalled();
  });

  it('a parent re-render with a new onDone does not restart the timeline or duplicate log lines', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { container, rerender } = render(<Boot onDone={first} />);
    await act(() => new Promise((r) => setTimeout(r, 700))); // lines at 0, 0.3, 0.6 s are out
    rerender(<Boot onDone={second} />);
    await waitFor(() => expect(second).toHaveBeenCalledTimes(1), { timeout: 4000 });
    const log = container.querySelector('#boot > [aria-hidden="true"]')!;
    expect([...log.children].map((c) => c.textContent)).toEqual(bootLines(getProjectCount()));
    expect(first).not.toHaveBeenCalled();
  }, 8000);
});
