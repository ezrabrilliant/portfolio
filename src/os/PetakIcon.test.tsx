import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockMatchMedia } from '@/test/match-media';
import { WindowManagerProvider } from './WindowManagerContext';
import { EzraOS } from './EzraOS';

const ui = (reducedMotion: boolean) => {
  mockMatchMedia(reducedMotion ? ['prefers-reduced-motion'] : []);
  return render(<WindowManagerProvider><EzraOS /></WindowManagerProvider>);
};
const icon = () => screen.getByRole('button', { name: 'Petak Umpet' });
const counter = () => document.getElementById('counter')!;
const petakWin = () => screen.queryByRole('dialog', { name: 'Petak Umpet' });

describe('Petak Umpet icon', () => {
  it('counter is a polite live region, hidden until the chase starts', () => {
    ui(false);
    expect(counter()).toHaveAttribute('aria-live', 'polite');
    expect(counter()).toHaveAttribute('hidden');
  });

  it('mouse: the 3rd catch opens the window, the counter tracks each catch', async () => {
    ui(false);
    await userEvent.click(icon());
    expect(counter()).not.toHaveAttribute('hidden');
    expect(counter()).toHaveTextContent('tangkap dia: 1/3');
    expect(petakWin()).not.toBeInTheDocument();
    await userEvent.click(icon());
    expect(counter()).toHaveTextContent('tangkap dia: 2/3');
    expect(petakWin()).not.toBeInTheDocument();
    await userEvent.click(icon());
    const win = await screen.findByRole('dialog', { name: 'Petak Umpet' });
    expect(win).toHaveClass('active');
    expect(counter()).toHaveAttribute('hidden');
    await waitFor(() => expect(win).toHaveTextContent('Kamu memang jago cari yang ngumpet.'));
    expect(win).toHaveTextContent('3.1M visits, 2.6K peak concurrent players');
  });

  it('a pointer coming close makes it flee and shows the counter at 0/3', () => {
    ui(false);
    // jsdom has no layout: the icon rect is 0x0 at the origin, so (10,10) is inside the 90px radius
    fireEvent.pointerMove(document, { clientX: 10, clientY: 10, pointerType: 'mouse' });
    expect(counter()).not.toHaveAttribute('hidden');
    expect(counter()).toHaveTextContent('tangkap dia: 0/3');
  });

  it('keyboard Enter opens directly (the chase is pointer-only)', async () => {
    ui(false);
    icon().focus();
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('dialog', { name: 'Petak Umpet' })).toHaveClass('active');
    expect(counter()).toHaveAttribute('hidden');
  });

  it('touch: a tap opens directly', async () => {
    ui(false);
    const user = userEvent.setup();
    await user.pointer({ keys: '[TouchA]', target: icon() });
    expect(await screen.findByRole('dialog', { name: 'Petak Umpet' })).toBeInTheDocument();
  });

  it('reduced motion: never flees, a single click opens', async () => {
    ui(true);
    fireEvent.pointerMove(document, { clientX: 10, clientY: 10, pointerType: 'mouse' });
    expect(counter()).toHaveAttribute('hidden');
    await userEvent.click(icon());
    expect(await screen.findByRole('dialog', { name: 'Petak Umpet' })).toBeInTheDocument();
  });
});
