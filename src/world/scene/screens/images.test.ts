import { describe, expect, it, vi } from "vitest";
import { screensVersion } from "./dirty";
import { loadScreenImage } from "./images";

/** node has no Image: a stand-in that records what loadScreenImage sets. */
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = "";
  decoding = "";
}
vi.stubGlobal("Image", FakeImage);

describe("loadScreenImage", () => {
  it("starts loading the url once and returns the same entry for every caller", () => {
    const a = loadScreenImage("/world/test/a.webp");
    expect(loadScreenImage("/world/test/a.webp")).toBe(a);
    expect(a.img.src).toBe("/world/test/a.webp");
    expect(a.ready).toBe(false);
  });

  it("becomes ready on load and marks every live screen dirty", () => {
    const b = loadScreenImage("/world/test/b.webp");
    const before = screensVersion();
    (b.img as unknown as FakeImage).onload?.();
    expect(b.ready).toBe(true);
    expect(screensVersion()).toBe(before + 1);
  });
});
