import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockMatchMedia } from '@/test/match-media';
import { WindowManagerProvider, useWM } from './WindowManagerContext';
import { EzraOS } from './EzraOS';

// Only `about` ships in this task. A second, test-only app lets the cycle tests prove focus actually moves.
vi.mock('./app-registry', async (importOriginal) => {
  const orig = await importOriginal<typeof import('./app-registry')>();
  return {
    ...orig,
    getAppDef: (id: string) =>
      id === 'probe' ? { title: 'Probe', width: 300, render: () => <p>probe body</p> } : orig.getAppDef(id),
  };
});

function ProbeLauncher() {
  const wm = useWM();
  return <button type="button" onClick={(e) => wm.open('probe', e.currentTarget)}>launch probe</button>;
}

const ui = () => {
  mockMatchMedia(['prefers-reduced-motion']);
  return render(<WindowManagerProvider><EzraOS /><ProbeLauncher /></WindowManagerProvider>);
};

/** Three windows open, stacked back to front: Bot (auto-opened after boot), About, Probe (focused). */
const openAboutThenProbe = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'About EzraOS' }));
  await userEvent.click(screen.getByRole('button', { name: 'launch probe' }));
  expect(screen.getByRole('dialog', { name: 'Probe' })).toHaveClass('active');
  expect(screen.getByRole('dialog', { name: 'About EzraOS' })).not.toHaveClass('active');
  expect(screen.getByRole('dialog', { name: 'Bot' })).not.toHaveClass('active');
};

/** Start from an empty desk: close the Bot window the desktop opens after boot. */
const closeBot = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Close Bot' }));
  expect(screen.queryByRole('dialog', { name: 'Bot' })).not.toBeInTheDocument();
};

const activeDialogs = () =>
  screen.getAllByRole('dialog').filter((d) => d.classList.contains('active')).map((d) => d.getAttribute('data-id'));

describe('EzraOS desktop', () => {
  it('after boot the Bot window is already open and focused (no empty desk)', () => {
    ui();
    const bot = screen.getByRole('dialog', { name: 'Bot' });
    expect(bot).toHaveClass('active');
    expect(bot.contains(document.activeElement)).toBe(true);
    expect(screen.getByRole('button', { name: 'Bot window' })).toBeInTheDocument(); // dock entry
  });

  it('Bot auto-opens once: once closed it stays closed across later re-renders', async () => {
    ui();
    await closeBot();
    await userEvent.click(screen.getByRole('button', { name: 'About EzraOS' })); // re-renders Desktop
    expect(await screen.findByRole('dialog', { name: 'About EzraOS' })).toHaveClass('active');
    expect(screen.queryByRole('dialog', { name: 'Bot' })).not.toBeInTheDocument();
  });

  it('menu bar opens the About window and the dock lists it', async () => {
    ui();
    await userEvent.click(screen.getByRole('button', { name: 'About EzraOS' }));
    expect(await screen.findByRole('dialog', { name: 'About EzraOS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'About EzraOS window' })).toBeInTheDocument(); // dock entry
  });

  it('About window carries bio, ship log and the cycle shortcut', async () => {
    ui();
    await userEvent.click(screen.getByRole('button', { name: 'About EzraOS' }));
    const dialog = await screen.findByRole('dialog', { name: 'About EzraOS' });
    // the frame renders at once; the body is a lazy chunk behind <Suspense fallback={null}>
    await waitFor(() => expect(dialog).toHaveTextContent('Ezra Brilliant'));
    expect(dialog).toHaveTextContent('2,700+ paid orders');
    expect(dialog).toHaveTextContent('EzraOS replaces the scrolling portfolio');
    expect(dialog).toHaveTextContent('ctrl+`');
  });

  it('desktop icons open apps with Enter (keyboard path)', async () => {
    ui();
    await closeBot(); // Bot auto-opens after boot; close it so Enter has something to prove
    const icon = screen.getByRole('button', { name: 'Bot' });
    icon.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: 'Bot' })).toHaveClass('active');
  });

  it('dock button minimizes a focused window and restores a minimized one', async () => {
    ui();
    await userEvent.click(screen.getByRole('button', { name: 'About EzraOS' }));
    const dockBtn = await screen.findByRole('button', { name: 'About EzraOS window' });
    await userEvent.click(dockBtn); // focused → minimize
    expect(screen.getByRole('dialog', { name: 'About EzraOS', hidden: true })).not.toBeVisible();
    await userEvent.click(dockBtn); // minimized → restore
    expect(screen.getByRole('dialog', { name: 'About EzraOS' })).toBeVisible();
  });

  it('minimizing the last visible window moves focus to its dock entry', async () => {
    ui();
    await closeBot(); // make About the only window
    await userEvent.click(screen.getByRole('button', { name: 'About EzraOS' }));
    await screen.findByRole('dialog', { name: 'About EzraOS' });
    await userEvent.click(screen.getByRole('button', { name: 'Minimize About EzraOS' }));
    expect(screen.getByRole('button', { name: 'About EzraOS window, minimized' })).toHaveFocus();
  });

  it('Ctrl+` cycles focus between open windows', async () => {
    ui();
    await openAboutThenProbe();
    // each press raises the back-most window: Bot, then About, then Probe again
    await userEvent.keyboard('{Control>}`{/Control}');
    expect(activeDialogs()).toEqual(['bot']);
    await userEvent.keyboard('{Control>}`{/Control}');
    expect(activeDialogs()).toEqual(['about']);
    await userEvent.keyboard('{Control>}`{/Control}');
    expect(activeDialogs()).toEqual(['probe']);
  });

  it('Ctrl+` is claimed by the OS (default prevented)', () => {
    ui();
    // fireEvent returns false when a listener called preventDefault
    expect(fireEvent.keyDown(window, { key: '`', code: 'Backquote', ctrlKey: true })).toBe(false);
  });

  it('Ctrl+` also works where backtick is a dead key (US-International)', async () => {
    ui();
    await openAboutThenProbe();
    expect(fireEvent.keyDown(window, { key: 'Dead', code: 'Backquote', ctrlKey: true })).toBe(false);
    expect(await screen.findByRole('dialog', { name: 'Bot' })).toHaveClass('active');
    expect(screen.getByRole('dialog', { name: 'Probe' })).not.toHaveClass('active');
  });

  it('with one window, Ctrl+` is a harmless no-op', async () => {
    ui(); // only the auto-opened Bot window
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    await userEvent.keyboard('{Control>}`{/Control}');
    expect(screen.getByRole('dialog', { name: 'Bot' })).toHaveClass('active');
  });

  it('windows cascade from the right edge of the icon column as laid out (two columns on a short desk)', () => {
    // final review F1: at 911x512 the six icons wrap into two columns (right edge 194 px)
    const real = HTMLElement.prototype.getBoundingClientRect;
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('icon-col')) return { left: 12, right: 194, top: 12, bottom: 428, width: 182, height: 416, x: 12, y: 12, toJSON() {} } as DOMRect;
      return real.call(this);
    });
    try {
      ui();
      expect(screen.getByRole('dialog', { name: 'Bot' }).style.left).toBe('218px'); // 194 + 24 gutter
    } finally {
      spy.mockRestore();
    }
  });

  it('with no measurable icon column (jsdom default) the cascade still clears one icon column', () => {
    ui();
    expect(screen.getByRole('dialog', { name: 'Bot' }).style.left).toBe('124px');
  });

  it('closing the auto-opened Bot (no opener) with no other window focuses its desktop icon (M5)', async () => {
    ui();
    await closeBot();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Bot' })).toHaveFocus());
  });
});

