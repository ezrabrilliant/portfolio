import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { mockMatchMedia, setMatchMedia } from '@/test/match-media';
import { usePhoneMode } from './usePhoneMode';

describe('usePhoneMode', () => {
  it('is false on a desktop viewport with a mouse', () => {
    mockMatchMedia([]);
    expect(renderHook(() => usePhoneMode()).result.current).toBe(false);
  });

  it('is true below the 768px breakpoint', () => {
    mockMatchMedia(['max-width: 767.98px']);
    expect(renderHook(() => usePhoneMode()).result.current).toBe(true);
  });

  it('is true on touch-only devices regardless of width', () => {
    mockMatchMedia(['pointer: coarse']);
    expect(renderHook(() => usePhoneMode()).result.current).toBe(true);
  });

  it('live-updates when a media query changes (rotate / resize)', () => {
    mockMatchMedia([]);
    const { result, unmount } = renderHook(() => usePhoneMode());
    expect(result.current).toBe(false);
    act(() => setMatchMedia(['max-width: 767.98px']));
    expect(result.current).toBe(true);
    act(() => setMatchMedia([]));
    expect(result.current).toBe(false);
    unmount();
  });
});
