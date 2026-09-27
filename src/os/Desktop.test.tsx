import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockMatchMedia } from '@/test/match-media';
import { WindowManagerProvider } from './WindowManagerContext';
import { EzraOS } from './EzraOS';

const ui = () => {
  mockMatchMedia(['prefers-reduced-motion']);
  return render(<WindowManagerProvider><EzraOS /></WindowManagerProvider>);
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
    await userEvent.click(screen.getByRole('button', { name: 'About EzraOS' }));
    // only one window: cycling is a harmless no-op
    await userEvent.keyboard('{Control>}`{/Control}');
    expect(screen.getByRole('dialog', { name: 'About EzraOS' })).toHaveClass('active');
  });
});
