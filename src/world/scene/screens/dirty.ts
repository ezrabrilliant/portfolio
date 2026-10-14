/** Bumped whenever every live screen must redraw (an image finished loading); each LiveScreen compares it per frame. */
let version = 0;

export function markScreensDirty(): void {
  version += 1;
}

export function screensVersion(): number {
  return version;
}
