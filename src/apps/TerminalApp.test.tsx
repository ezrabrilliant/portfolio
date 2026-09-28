import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockMatchMedia } from '@/test/match-media';
import TerminalApp from './TerminalApp';

const log = () => screen.getByRole('log', { name: 'Terminal output' });
const prompt = () => screen.getByRole('textbox', { name: 'Terminal command' });

describe('TerminalApp', () => {
  it('is a dark surface with the prompt focused on open', () => {
    const { container } = render(<TerminalApp />);
    expect(container.firstElementChild).toHaveClass('term', 'dark');
    expect(prompt()).toHaveFocus();
  });

  it('Enter echoes the prompt line and prints the output', async () => {
    render(<TerminalApp />);
    await userEvent.type(prompt(), '  HELP  {Enter}');
    expect(log()).toHaveTextContent('ezra@ezraos:~$ HELP');
    expect(log()).toHaveTextContent('ctrl+` cycles windows');
    expect(prompt()).toHaveValue('');
  });

  it('ArrowUp and ArrowDown walk the command history', async () => {
    render(<TerminalApp />);
    await userEvent.type(prompt(), 'whoami{Enter}contact{Enter}');
    await userEvent.keyboard('{ArrowUp}');
    expect(prompt()).toHaveValue('contact');
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    expect(prompt()).toHaveValue('whoami');
    await userEvent.keyboard('{ArrowDown}');
    expect(prompt()).toHaveValue('contact');
    await userEvent.keyboard('{ArrowDown}');
    expect(prompt()).toHaveValue('');
  });

  it('clear wipes the screen and unknown words point at help', async () => {
    render(<TerminalApp />);
    await userEvent.type(prompt(), 'sudo{Enter}');
    expect(log()).toHaveTextContent('sudo: command not found — try help');
    await userEvent.type(prompt(), 'clear{Enter}');
    expect(log()).toBeEmptyDOMElement();
  });

  it('phone mode does not auto-focus the prompt (no virtual keyboard popping up on open, M3)', async () => {
    mockMatchMedia(['max-width: 767.98px']);
    render(<TerminalApp />);
    expect(prompt()).not.toHaveFocus();
    await userEvent.click(prompt()); // a tap still focuses it
    expect(prompt()).toHaveFocus();
  });
});

