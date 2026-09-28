import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockMatchMedia } from '@/test/match-media';
import { WindowManagerProvider, useWM } from '@/os/WindowManagerContext';
import BotApp from './BotApp';

function OpenIds() {
  const wm = useWM();
  return <output data-testid="open-ids">{wm.state.windows.map((w) => w.id).join(',')}</output>;
}

const ui = (reduced = true) => {
  mockMatchMedia(reduced ? ['prefers-reduced-motion'] : []);
  return render(
    <StrictMode>
      <WindowManagerProvider><BotApp /><OpenIds /></WindowManagerProvider>
    </StrictMode>,
  );
};

const log = () => screen.getByRole('log', { name: 'Chat with Ezra Bot' });

afterEach(() => vi.useRealTimers());

describe('BotApp', () => {
  it('greets exactly once, instantly under reduced motion, in a polite live log', () => {
    ui();
    expect(log()).toHaveAttribute('aria-live', 'polite');
    expect(within(log()).getAllByText(/halo! aku Ezra Bot/)).toHaveLength(1); // StrictMode double-effect must not double-greet
    expect(log().querySelector('.typing')).toBeNull();
  });

  it('a chip asks the command and the bot answers', async () => {
    ui();
    await userEvent.click(screen.getByRole('button', { name: '/systems' }));
    expect(within(log()).getByText('/systems')).toBeInTheDocument();
    expect(log()).toHaveTextContent('4 sistem masih live');
  });

  it('typed input is sent, cleared, and gibberish gets the friendly fallback', async () => {
    ui();
    const input = screen.getByRole('textbox', { name: 'Message Ezra Bot' });
    await userEvent.type(input, 'sell me a diamond lock{Enter}');
    expect(input).toHaveValue('');
    expect(log()).toHaveTextContent('aku belum paham "sell me a diamond lock"');
  });

  it('blank input sends nothing', async () => {
    ui();
    const before = log().children.length;
    await userEvent.type(screen.getByRole('textbox', { name: 'Message Ezra Bot' }), '   {Enter}');
    expect(log().children.length).toBe(before);
  });

  it('an inline action opens its window', async () => {
    ui();
    await userEvent.click(screen.getByRole('button', { name: '/systems' }));
    await userEvent.click(screen.getByRole('button', { name: 'buka Monitor' }));
    expect(screen.getByTestId('open-ids')).toHaveTextContent('monitor');
  });

  it('hides an action whose app is not installed yet (Kasir) instead of opening a blank window', async () => {
    ui();
    await userEvent.click(screen.getByRole('button', { name: '/contact' }));
    expect(log()).toHaveTextContent('ezrakonterliem@gmail.com');
    expect(screen.queryByRole('button', { name: 'buka Kasir' })).not.toBeInTheDocument();
  });

  it('with motion allowed, shows a typing indicator before each message (and survives StrictMode)', async () => {
    vi.useFakeTimers();
    ui(false);
    await act(async () => {}); // flush the queued microtask that starts typing
    expect(log().querySelector('.typing')).not.toBeNull();
    expect(log()).not.toHaveTextContent('halo! aku Ezra Bot');
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(log().querySelector('.typing')).toBeNull();
    expect(within(log()).getAllByText(/halo! aku Ezra Bot/)).toHaveLength(1);
  });
});
