/**
 * A 2D-context stand-in for draw tests (Vitest runs in node: no canvas). Methods do nothing, properties keep what is
 * set, and text measures 5 units per character, so layout code runs and draws return their hit regions.
 */
export function fakeCtx(): CanvasRenderingContext2D {
  const state: Record<string | symbol, unknown> = {
    font: "10px sans-serif",
    textAlign: "left",
    textBaseline: "alphabetic",
    globalAlpha: 1,
    lineWidth: 1,
  };
  const noop = () => undefined;
  const measureText = (s: string) => ({ width: s.length * 5 });
  return new Proxy(state, {
    get: (target, key) => (key === "measureText" ? measureText : key in target ? target[key] : noop),
    set: (target, key, value) => {
      target[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

/** `Image` stand-in for node: it never loads, so screens draw their placeholders. vi.stubGlobal("Image", FakeImage). */
export class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = "";
  decoding = "";
}
