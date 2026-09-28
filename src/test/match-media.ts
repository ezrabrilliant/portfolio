type ChangeListener = (e: MediaQueryListEvent) => void;

let current: string[] = [];
/** Every live `change` subscription: [query, listener]. Reset by each mockMatchMedia call. */
const subs = new Set<[string, ChangeListener]>();

const matchesQuery = (query: string) => current.some((m) => query.includes(m));

/**
 * jsdom has no matchMedia. Install a stub; `matching` entries match by substring of the query.
 * `matches` is read live, and `change` listeners are kept so setMatchMedia can simulate a resize.
 */
export function mockMatchMedia(matching: string[] = []): void {
  current = matching;
  subs.clear();
  window.matchMedia = ((query: string) => {
    const find = (l: ChangeListener) => [...subs].find(([q, f]) => q === query && f === l);
    const add = (l: ChangeListener) => { if (!find(l)) subs.add([query, l]); };
    const remove = (l: ChangeListener) => { const s = find(l); if (s) subs.delete(s); };
    return {
      get matches() { return matchesQuery(query); },
      media: query,
      onchange: null,
      addListener: add,
      removeListener: remove,
      addEventListener: (type: string, l: ChangeListener) => { if (type === 'change') add(l); },
      removeEventListener: (type: string, l: ChangeListener) => { if (type === 'change') remove(l); },
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  }) as typeof window.matchMedia;
}

/** Change what matches and fire `change` on every subscribed query whose result flipped. */
export function setMatchMedia(matching: string[]): void {
  const before = new Map([...subs].map(([q]) => [q, matchesQuery(q)]));
  current = matching;
  for (const [query, listener] of [...subs]) {
    const matches = matchesQuery(query);
    if (before.get(query) !== matches) listener({ matches, media: query } as MediaQueryListEvent);
  }
}
