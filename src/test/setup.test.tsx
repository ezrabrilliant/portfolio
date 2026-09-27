import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('test harness', () => {
  it('renders React into jsdom with jest-dom matchers', () => {
    render(<button type="button">ok</button>);
    expect(screen.getByRole('button')).toHaveTextContent('ok');
  });

  it('matchMedia is stubbed and defaults to not matching', () => {
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(false);
  });
});
