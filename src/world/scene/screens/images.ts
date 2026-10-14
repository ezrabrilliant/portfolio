import { markScreensDirty } from "./dirty";

export interface ScreenImage {
  img: HTMLImageElement;
  ready: boolean;
}

const cache = new Map<string, ScreenImage>();

/**
 * An image for canvas screens, loaded once per url. Draws check `ready` and paint a placeholder until then; the load
 * marks every LiveScreen dirty so they redraw with the picture.
 */
export function loadScreenImage(url: string): ScreenImage {
  const hit = cache.get(url);
  if (hit) return hit;
  const img = new Image();
  const entry: ScreenImage = { img, ready: false };
  img.decoding = "async";
  img.onload = () => {
    entry.ready = true;
    markScreensDirty();
  };
  img.onerror = () => {
    console.warn(`[screens] could not load ${url}; the screen keeps its placeholder`);
  };
  img.src = url;
  cache.set(url, entry);
  return entry;
}
