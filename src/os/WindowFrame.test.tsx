import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockMatchMedia } from '@/test/match-media';
import { WindowManagerProvider, useWM } from './WindowManagerContext';
import { WindowFrame } from './WindowFrame';
import { focusedId } from './window-manager';

/** Harness: renders every open window as a WindowFrame with a button body. */
function Harness() {
  const wm = useWM();
  return (
    <div id="desk" style={{ width: 1200, height: 700 }}>
      <button type="button" onClick={(e) => wm.open('bot', e.currentTarget)}>launch bot</button>
      <button type="button" onClick={(e) => wm.open('kasir', e.currentTarget)}>launch kasir</button>
      <div id="wins">
        {wm.state.windows.map((w) => (
          <WindowFrame key={w.id} id={w.id} title={w.id} width={380}
            x={w.x} y={w.y} z={w.z} minimized={w.minimized}
            focused={focusedId(wm.state) === w.id}>
            <button type="button">inside {w.id}</button>
          </WindowFrame>
        ))}
      </div>
    </div>
  );
}
const ui = () => render(<WindowManagerProvider><Harness /></WindowManagerProvider>);

describe('WindowFrame', () => {
  it('opens as a dialog with title, minimize and close controls', async () => {
    mockMatchMedia(['prefers-reduced-motion']);
    ui();
    await userEvent.click(screen.getByRole('button', { name: 'launch bot' }));
    const win = screen.getByRole('dialog', { name: 'bot' });
    expect(win).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Minimize bot' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close bot' })).toBeInTheDocument();
  });

  it('Escape closes the focused window', async () => {
    mockMatchMedia(['prefers-reduced-motion']);
    ui();
    await userEvent.click(screen.getByRole('button', { name: 'launch bot' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'bot' })).not.toBeInTheDocument();
  });

  it('closing returns focus to the launching element', async () => {
    mockMatchMedia(['prefers-reduced-motion']);
    ui();
    const launcher = screen.getByRole('button', { name: 'launch bot' });
    await userEvent.click(launcher);
    await userEvent.click(screen.getByRole('button', { name: 'Close bot' }));
    // focus-return rides a requestAnimationFrame (the unmount steals focus first)
    await waitFor(() => expect(launcher).toHaveFocus());
  });

  it('minimized window keeps its DOM but is hidden', async () => {
    mockMatchMedia(['prefers-reduced-motion']);
    ui();
    await userEvent.click(screen.getByRole('button', { name: 'launch bot' }));
    await userEvent.click(screen.getByRole('button', { name: 'Minimize bot' }));
    expect(screen.getByRole('dialog', { name: 'bot', hidden: true })).not.toBeVisible();
  });

  it('the focused window carries the active title bar class', async () => {
    mockMatchMedia(['prefers-reduced-motion']);
    ui();
    await userEvent.click(screen.getByRole('button', { name: 'launch bot' }));
    await userEvent.click(screen.getByRole('button', { name: 'launch kasir' }));
    expect(screen.getByRole('dialog', { name: 'kasir' })).toHaveClass('active');
    expect(screen.getByRole('dialog', { name: 'bot' })).not.toHaveClass('active');
  });
});
