import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockMatchMedia } from '@/test/match-media';
import { Boot, bootLines } from './Boot';

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
    render(<Boot onDone={onDone} />);
    expect(onDone).toHaveBeenCalledTimes(1);
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
});
