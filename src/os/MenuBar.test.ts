import { describe, expect, it } from 'vitest';
import { formatWib } from './MenuBar';

describe('formatWib', () => {
  it('renders Asia/Jakarta time as HH:mm WIB', () => {
    // 2026-09-27T05:00:00Z is 12:00 in UTC+7
    expect(formatWib(new Date('2026-09-27T05:00:00Z'))).toBe('12:00 WIB');
  });

  it('renders the hour after midnight as 00, never 24', () => {
    // 2026-09-26T17:05:00Z is 00:05 on 27 Sep in UTC+7
    expect(formatWib(new Date('2026-09-26T17:05:00Z'))).toBe('00:05 WIB');
  });
});
