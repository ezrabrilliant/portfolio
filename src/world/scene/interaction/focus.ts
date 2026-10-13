export function cycleFocus(ids: readonly string[], current: string | null, dir: 1 | -1): string | null {
  if (ids.length === 0) return null;
  const i = current === null ? -1 : ids.indexOf(current);
  if (i === -1) return dir === 1 ? ids[0] : ids[ids.length - 1];
  const next = i + dir;
  return next < 0 || next >= ids.length ? null : ids[next];
}

/** True when a focused item is no longer a valid focus target (disabled, or gone from the registry). */
export function isFocusStale(focused: boolean, enabled: boolean): boolean {
  return focused && !enabled;
}
