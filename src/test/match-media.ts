/** jsdom has no matchMedia. Install a stub; `matching` entries match by substring of the query. */
export function mockMatchMedia(matching: string[] = []): void {
  window.matchMedia = ((query: string) =>
    ({
      matches: matching.some((m) => query.includes(m)),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList) as typeof window.matchMedia;
}
