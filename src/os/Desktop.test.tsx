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

/** Two windows open, Probe on top (focused). */
const openAboutThenProbe = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'About EzraOS' }));
  await userEvent.click(screen.getByRole('button', { name: 'launch probe' }));
  expect(screen.getByRole('dialog', { name: 'Probe' })).toHaveClass('active');
  expect(screen.getByRole('dialog', { name: 'About EzraOS' })).not.toHaveClass('active');
};

describe('EzraOS desktop', () => {
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
    const icon = screen.getByRole('button', { name: 'Bot' });
    icon.focus();
    await userEvent.keyboard('{Enter}');
    // bot app arrives in Task 10; today an unknown id is a safe no-op — no crash, no window
    expect(screen.queryByRole('dialog', { name: 'Bot' })).not.toBeInTheDocument();
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
    await userEvent.click(screen.getByRole('button', { name: 'About EzraOS' }));
    await screen.findByRole('dialog', { name: 'About EzraOS' });
    await userEvent.click(screen.getByRole('button', { name: 'Minimize About EzraOS' }));
    expect(screen.getByRole('button', { name: 'About EzraOS window, minimized' })).toHaveFocus();
  });

  it('Ctrl+` cycles focus between open windows', async () => {
    ui();
    await openAboutThenProbe();
    await userEvent.keyboard('{Control>}`{/Control}');
    expect(screen.getByRole('dialog', { name: 'About EzraOS' })).toHaveClass('active');
    expect(screen.getByRole('dialog', { name: 'Probe' })).not.toHaveClass('active');
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
    expect(await screen.findByRole('dialog', { name: 'About EzraOS' })).toHaveClass('active');
    expect(screen.getByRole('dialog', { name: 'Probe' })).not.toHaveClass('active');
  });

  it('with one window, Ctrl+` is a harmless no-op', async () => {
    ui();
    await userEvent.click(screen.getByRole('button', { name: 'About EzraOS' }));
    await userEvent.keyboard('{Control>}`{/Control}');
    expect(screen.getByRole('dialog', { name: 'About EzraOS' })).toHaveClass('active');
  });
});
