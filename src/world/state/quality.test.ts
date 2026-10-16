import { afterEach, describe, expect, it, vi } from "vitest";
import { dprCap, hasWebGL, pickQuality } from "./quality";

const desktop = { width: 1440, height: 900, cores: 8, coarsePointer: false, saveData: false };

describe("pickQuality", () => {
  it("picks high on a normal desktop", () => {
    expect(pickQuality(desktop)).toBe("high");
  });
  it("picks low when data saver is on", () => {
    expect(pickQuality({ ...desktop, saveData: true })).toBe("low");
  });
  it("picks low with 4 or fewer cores", () => {
    expect(pickQuality({ ...desktop, cores: 4 })).toBe("low");
  });
  it("picks low on a small touch screen", () => {
    expect(pickQuality({ width: 412, height: 915, cores: 8, coarsePointer: true, saveData: false })).toBe("low");
  });
  it("keeps high on a large touch screen with many cores", () => {
    expect(pickQuality({ width: 1366, height: 1024, cores: 8, coarsePointer: true, saveData: false })).toBe("high");
  });
});

describe("dprCap", () => {
  it("caps pixel ratio per tier", () => {
    expect(dprCap("high", 3)).toBe(1.75);
    expect(dprCap("high", 1)).toBe(1);
    expect(dprCap("low", 3)).toBe(1.25);
  });
});

describe("hasWebGL", () => {
  afterEach(() => vi.unstubAllGlobals());

  /** A document whose canvases answer getContext with `gl` for the listed kinds. */
  const stubDocument = (kinds: string[], gl: unknown) =>
    vi.stubGlobal("document", { createElement: () => ({ getContext: (k: string) => (kinds.includes(k) ? gl : null) }) });

  it("is true with WebGL 2 or 1, and releases the probe context right away", () => {
    for (const kinds of [["webgl2", "webgl"], ["webgl"]]) {
      const loseContext = vi.fn();
      stubDocument(kinds, { getExtension: (name: string) => (name === "WEBGL_lose_context" ? { loseContext } : null) });
      expect(hasWebGL()).toBe(true);
      expect(loseContext).toHaveBeenCalledTimes(1);
    }
  });

  it("is still true when the lose-context extension is missing", () => {
    stubDocument(["webgl"], { getExtension: () => null });
    expect(hasWebGL()).toBe(true);
  });

  it("is false without a context, or when probing throws", () => {
    stubDocument([], null);
    expect(hasWebGL()).toBe(false);
    vi.stubGlobal("document", { createElement: () => { throw new Error("no canvas"); } });
    expect(hasWebGL()).toBe(false);
  });
});
