import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockMatchMedia } from '@/test/match-media';
import { WindowManagerProvider } from '@/os/WindowManagerContext';

// vi.mock factories are hoisted above imports — the mock fn must be hoisted with them
const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock('@emailjs/browser', () => ({ default: { send: (...a: unknown[]) => sendMock(...a) } }));

import KasirApp from './KasirApp';

const ui = () => {
  mockMatchMedia(['prefers-reduced-motion']);
  return render(<WindowManagerProvider><KasirApp /></WindowManagerProvider>);
};

beforeEach(() => {
  sendMock.mockReset();
  vi.stubEnv('VITE_EMAILJS_SERVICE_ID', 'svc');
  vi.stubEnv('VITE_EMAILJS_TEMPLATE_ID', 'tpl');
  vi.stubEnv('VITE_EMAILJS_PUBLIC_KEY', 'key');
});

describe('KasirApp', () => {
  it('Order stays disabled until an item is selected', async () => {
    // Review Focus #2: no empty receipt, ever
    ui();
    const order = screen.getByRole('button', { name: 'Order' });
    expect(order).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /Contact card/ }));
    expect(order).toBeEnabled();
  });

  it('ordering prints a receipt with the picked items, and save becomes available', async () => {
    ui();
    await userEvent.click(screen.getByRole('button', { name: /Contact card/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Order' }));
    const receipt = await screen.findByLabelText('Receipt number 1');
    expect(receipt).toHaveTextContent('EZRAOS KASIR');
    expect(receipt).toHaveTextContent('ezrakonterliem@gmail.com');
    expect(screen.getByRole('button', { name: 'save receipt' })).toBeEnabled();
  });

  it('Kirim pesan sends via emailjs and the receipt reads MESSAGE SENT', async () => {
    sendMock.mockResolvedValueOnce({ status: 200 });
    ui();
    await userEvent.click(screen.getByRole('button', { name: /Kirim pesan/ }));
    await userEvent.type(screen.getByLabelText('nama'), 'Budi');
    await userEvent.type(screen.getByLabelText('email'), 'budi@example.com');
    await userEvent.type(screen.getByLabelText('pesan'), 'Halo Ezra');
    await userEvent.click(screen.getByRole('button', { name: 'Order' }));
    const receipt = await screen.findByLabelText('Receipt number 1');
    expect(sendMock).toHaveBeenCalledWith('svc', 'tpl',
      { from_name: 'Budi', from_email: 'budi@example.com', subject: 'EzraOS Kasir', message: 'Halo Ezra' },
      'key');
    expect(receipt).toHaveTextContent('MESSAGE SENT');
  });

  it('prints MESSAGE FAILED when emailjs.send rejects', async () => {
    // Review Focus #1: never a false success
    sendMock.mockRejectedValueOnce(new Error('network'));
    ui();
    await userEvent.click(screen.getByRole('button', { name: /Kirim pesan/ }));
    await userEvent.type(screen.getByLabelText('nama'), 'Budi');
    await userEvent.type(screen.getByLabelText('email'), 'budi@example.com');
    await userEvent.type(screen.getByLabelText('pesan'), 'Halo');
    await userEvent.click(screen.getByRole('button', { name: 'Order' }));
    const receipt = await screen.findByLabelText('Receipt number 1');
    expect(receipt).toHaveTextContent('MESSAGE FAILED');
    expect(receipt).toHaveTextContent('ezrakonterliem@gmail.com');
    expect(receipt).not.toHaveTextContent('MESSAGE SENT');
  });

  it('prints MESSAGE FAILED when the env keys are missing (send never called)', async () => {
    vi.stubEnv('VITE_EMAILJS_SERVICE_ID', '');
    ui();
    await userEvent.click(screen.getByRole('button', { name: /Kirim pesan/ }));
    await userEvent.type(screen.getByLabelText('nama'), 'Budi');
    await userEvent.type(screen.getByLabelText('email'), 'budi@example.com');
    await userEvent.type(screen.getByLabelText('pesan'), 'Halo');
    await userEvent.click(screen.getByRole('button', { name: 'Order' }));
    expect(await screen.findByLabelText('Receipt number 1')).toHaveTextContent('MESSAGE FAILED');
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('Kirim pesan needs its fields before Order enables', async () => {
    ui();
    await userEvent.click(screen.getByRole('button', { name: /Kirim pesan/ }));
    expect(screen.getByRole('button', { name: 'Order' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('nama'), 'Budi');
    await userEvent.type(screen.getByLabelText('email'), 'budi@example.com');
    await userEvent.type(screen.getByLabelText('pesan'), 'Halo');
    expect(screen.getByRole('button', { name: 'Order' })).toBeEnabled();
  });

  it('Enter in the message box adds a newline instead of ordering', async () => {
    ui();
    await userEvent.click(screen.getByRole('button', { name: /Kirim pesan/ }));
    await userEvent.type(screen.getByLabelText('nama'), 'Budi');
    await userEvent.type(screen.getByLabelText('email'), 'budi@example.com');
    await userEvent.type(screen.getByLabelText('pesan'), 'Halo{Enter}Ezra');
    expect(screen.getByLabelText('pesan')).toHaveValue('Halo\nEzra');
    expect(sendMock).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Receipt number 1')).not.toBeInTheDocument();
  });

  it('a double-click on Order sends the message once', async () => {
    let resolve!: (v: unknown) => void;
    sendMock.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    ui();
    await userEvent.click(screen.getByRole('button', { name: /Kirim pesan/ }));
    await userEvent.type(screen.getByLabelText('nama'), 'Budi');
    await userEvent.type(screen.getByLabelText('email'), 'budi@example.com');
    await userEvent.type(screen.getByLabelText('pesan'), 'Halo');
    await userEvent.dblClick(screen.getByRole('button', { name: 'Order' }));
    resolve({ status: 200 });
    expect(await screen.findByLabelText('Receipt number 1')).toHaveTextContent('MESSAGE SENT');
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Receipt number 2')).not.toBeInTheDocument();
  });

  it('every menu item is a keyboard toggle', async () => {
    ui();
    const contact = screen.getByRole('button', { name: /Contact card/ });
    contact.focus();
    await userEvent.keyboard('{Enter}');
    expect(contact).toHaveAttribute('aria-pressed', 'true');
    await userEvent.keyboard(' ');
    expect(contact).toHaveAttribute('aria-pressed', 'false');
  });

  // final review F4: with the message form open, the receipt area was squeezed to ~0 px in a
  // 560 px window — the visitor pressed Order and saw nothing. A printed receipt now takes the window.
  const fillMessage = async () => {
    await userEvent.click(screen.getByRole('button', { name: /Kirim pesan/ }));
    await userEvent.type(screen.getByLabelText('nama'), 'Budi');
    await userEvent.type(screen.getByLabelText('email'), 'budi@example.com');
    await userEvent.type(screen.getByLabelText('pesan'), 'Halo');
  };

  it('after Order the menu and message form give their space to the receipt', async () => {
    sendMock.mockRejectedValueOnce(new Error('network'));
    ui();
    await fillMessage();
    await userEvent.click(screen.getByRole('button', { name: 'Order' }));
    const receipt = await screen.findByLabelText('Receipt number 1');
    expect(receipt).toHaveTextContent('MESSAGE FAILED');
    expect(screen.queryByRole('group', { name: 'Menu' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('nama')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('pesan')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Order' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'new order' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'save receipt' })).toBeEnabled();
  });

  it('the printed receipt takes keyboard focus (the Order button it replaced is gone)', async () => {
    ui();
    await userEvent.click(screen.getByRole('button', { name: /Contact card/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Order' }));
    expect(await screen.findByLabelText('Receipt number 1')).toHaveFocus();
  });

  it('new order returns to the menu with the picks and a failed message kept for a retry', async () => {
    sendMock.mockRejectedValueOnce(new Error('network'));
    ui();
    await fillMessage();
    await userEvent.click(screen.getByRole('button', { name: 'Order' }));
    await screen.findByLabelText('Receipt number 1');
    await userEvent.click(screen.getByRole('button', { name: 'new order' }));
    expect(screen.getByRole('group', { name: 'Menu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kirim pesan/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('pesan')).toHaveValue('Halo');
    expect(screen.queryByLabelText('Receipt number 1')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Contact card/ })).toHaveFocus();
    sendMock.mockResolvedValueOnce({ status: 200 });
    await userEvent.click(screen.getByRole('button', { name: 'Order' }));
    expect(await screen.findByLabelText('Receipt number 2')).toHaveTextContent('MESSAGE SENT');
  });
});

