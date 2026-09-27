import { describe, expect, it } from 'vitest';
import { contrastRatio, TOKENS } from './tokens';

describe('WCAG AA contrast (spec §4, computed not asserted)', () => {
  const pairs: [string, string, string][] = [
    ['ink on paper', TOKENS.ink, TOKENS.paper],
    ['ink on amber', TOKENS.ink, TOKENS.amber],
    ['ink on card', TOKENS.ink, TOKENS.card],
    ['paper on ink', TOKENS.paper, TOKENS.ink],
    ['amber on ink', TOKENS.amber, TOKENS.ink],
    ['paper on desk', TOKENS.paper, TOKENS.desk],
    ['amber on desk', TOKENS.amber, TOKENS.desk],
    ['amber on bootbg', TOKENS.amber, TOKENS.bootbg],
    ['muted on paper', TOKENS.muted, TOKENS.paper],
    ['muted on card', TOKENS.muted, TOKENS.card],
  ];
  it.each(pairs)('%s ≥ 4.5:1', (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('spec anchor values are exact', () => {
    expect(TOKENS.desk).toBe('#1E2333');
    expect(TOKENS.paper).toBe('#F4F1E8');
    expect(TOKENS.ink).toBe('#1D1B16');
    expect(TOKENS.amber).toBe('#FFB300');
  });
});
