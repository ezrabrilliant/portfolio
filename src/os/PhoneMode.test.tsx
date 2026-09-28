import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockMatchMedia, setMatchMedia } from '@/test/match-media';
import { WindowManagerProvider } from './WindowManagerContext';
import { EzraOS } from './EzraOS';

const PHONE = 'max-width: 767.98px';

const ui = (matching: string[]) => {
  mockMatchMedia(matching);
  return render(<WindowManagerProvider><EzraOS /></WindowManagerProvider>);
};
const dock = () => document.getElementById('dock');
const petak = () => screen.getByRole('button', { name: 'Petak Umpet' });
const petakWin = () => screen.queryByRole('dialog', { name: 'Petak Umpet' });
/** A touch tap: a real click (detail 1), not the keyboard path (detail 0). */
const tap = (el: HTMLElement) => fireEvent.click(el, { detail: 1 });

describe('phone-OS mode', () => {
  it('marks the body, hides the dock, and still greets with the Bot full-screen', () => {
    ui([PHONE, 'prefers-reduced-motion']);
    expect(document.body).toHaveClass('phone');
    expect(dock()).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Bot' })).toHaveClass('active');
    expect(document.getElementById('icons')).toHaveClass('dark');
  });

  it('desktop keeps the dock and no phone class', () => {
    ui(['prefers-reduced-motion']);
    expect(document.body).not.toHaveClass('phone');
    expect(dock()).not.toBeNull();
  });

  it('switches live when the viewport crosses the breakpoint', () => {
    ui(['prefers-reduced-motion']);
    act(() => setMatchMedia([PHONE, 'prefers-reduced-motion']));
    expect(document.body).toHaveClass('phone');
    expect(dock()).toBeNull();
    act(() => setMatchMedia(['prefers-reduced-motion']));
    expect(document.body).not.toHaveClass('phone');
    expect(dock()).not.toBeNull();
  });

  it('back closes the auto-opened Bot and returns focus to its home-screen icon', async () => {
    ui([PHONE, 'prefers-reduced-motion']);
    await userEvent.click(screen.getByRole('button', { name: 'Back, close Bot' }));
    expect(screen.queryByRole('dialog', { name: 'Bot' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Bot' })).toHaveFocus());
  });

  it('a single tap on a home icon opens the app; back returns focus to that icon', async () => {
    ui([PHONE, 'prefers-reduced-motion']);
    await userEvent.click(screen.getByRole('button', { name: 'Back, close Bot' }));
    const icon = screen.getByRole('button', { name: 'Terminal' });
    await userEvent.click(icon); // one click, detail 1 — desktop would only select
    const win = screen.getByRole('dialog', { name: /Terminal/ });
    expect(win).toHaveClass('active');
    await userEvent.click(screen.getByRole('button', { name: /^Back, close .*Terminal/ }));
    expect(screen.queryByRole('dialog', { name: /Terminal/ })).not.toBeInTheDocument();
    await waitFor(() => expect(icon).toHaveFocus());
  });

  it('Esc still closes a full-screen window and focus lands on the home icon', async () => {
    ui([PHONE, 'prefers-reduced-motion']);
    const bot = screen.getByRole('dialog', { name: 'Bot' });
    fireEvent.keyDown(bot, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Bot' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Bot' })).toHaveFocus());
  });

  it('title bar does not start a drag', () => {
    ui([PHONE, 'prefers-reduced-motion']);
    const win = screen.getByRole('dialog', { name: 'Bot' });
    const tb = win.querySelector('.tb') as HTMLElement;
    // jsdom has no layout: give the frame a desk and the bar pointer capture so a drag *could* start
    Object.defineProperty(win, 'offsetParent', { value: document.getElementById('wins'), configurable: true });
    Object.assign(tb, { setPointerCapture: () => {} });
    fireEvent.pointerDown(tb, { button: 0, pointerId: 1, clientX: 50, clientY: 10 });
    expect(tb).not.toHaveClass('dragging');
  });

  it('Petak hops to another grid slot on the 1st and 2nd tap and opens on the 3rd', async () => {
    ui([PHONE]);
    expect(document.getElementById('counter')).toBeNull(); // no flee counter on phone
    const slot0 = petak().style.order;
    tap(petak());
    const slot1 = petak().style.order;
    expect(slot1).not.toBe(slot0);
    expect(petakWin()).not.toBeInTheDocument();
    tap(petak());
    expect(petak().style.order).not.toBe(slot1);
    expect(petakWin()).not.toBeInTheDocument();
    tap(petak());
    expect(await screen.findByRole('dialog', { name: 'Petak Umpet' })).toHaveClass('active');
  });

  it('Petak lands only between icons, never on top of one (odd grid orders)', () => {
    ui([PHONE]);
    for (let i = 0; i < 2; i++) {
      tap(petak());
      expect(Number(petak().style.order) % 2).toBe(1);
    }
    for (const b of document.querySelectorAll<HTMLElement>('#icons .icon:not(.petak)')) {
      expect(Number(b.style.order) % 2).toBe(0);
    }
  });

  it('reduced motion: the first Petak tap opens', async () => {
    ui([PHONE, 'prefers-reduced-motion']);
    tap(petak());
    expect(await screen.findByRole('dialog', { name: 'Petak Umpet' })).toBeInTheDocument();
  });

  it('keyboard Enter on Petak opens directly (the hop game is tap-only)', async () => {
    ui([PHONE]);
    petak().focus();
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('dialog', { name: 'Petak Umpet' })).toBeInTheDocument();
  });

  it('status bar: phone drops "all systems live" so the clock and "Surabaya, ID" fit at 360px', () => {
    ui([PHONE, 'prefers-reduced-motion']);
    const bar = document.getElementById('menubar')!;
    expect(bar).not.toHaveTextContent('all systems live');
    expect(bar).toHaveTextContent('Surabaya, ID');
    expect(screen.getByLabelText('Local time in Surabaya')).toBeInTheDocument();
  });

  it('status bar: desktop still shows "all systems live"', () => {
    ui(['prefers-reduced-motion']);
    expect(document.getElementById('menubar')).toHaveTextContent('all systems live');
  });

  it('flipping to phone restores minimized windows (no dock = no other restore path)', async () => {
    ui(['prefers-reduced-motion']);
    await userEvent.click(screen.getByRole('button', { name: 'Minimize Bot' }));
    expect(screen.getByRole('dialog', { name: 'Bot', hidden: true })).not.toBeVisible();
    act(() => setMatchMedia([PHONE, 'prefers-reduced-motion']));
    expect(dock()).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Bot' })).toBeVisible();
  });

  it('Petak replays the hop game after open → back', async () => {
    ui([PHONE]);
    tap(petak()); tap(petak()); tap(petak());
    await screen.findByRole('dialog', { name: 'Petak Umpet' });
    await userEvent.click(screen.getByRole('button', { name: 'Back, close Petak Umpet' }));
    expect(petakWin()).not.toBeInTheDocument();
    const slot = petak().style.order;
    tap(petak()); // counter restarted: this is tap 1 again, so it hops instead of opening
    expect(petakWin()).not.toBeInTheDocument();
    expect(petak().style.order).not.toBe(slot);
  });
});
