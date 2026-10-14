import { describe, expect, it } from "vitest";
import { closeupSpace, offersKeyToScreen } from "./closeupKeys";

/** A stand-in DOM element whose `closest` matches tag names and `.class` selectors up the parent chain. */
interface FakeEl {
  tag: string;
  cls?: string;
  parent?: FakeEl;
  closest(selector: string): FakeEl | null;
}
function el(tag: string, cls?: string, parent?: FakeEl): EventTarget {
  const self: FakeEl = {
    tag,
    cls,
    parent,
    closest(selector: string) {
      const parts = selector.split(",").map((s) => s.trim());
      for (let e: FakeEl | undefined = self; e; e = e.parent) {
        if (parts.some((s) => (s.startsWith(".") ? e!.cls === s.slice(1) : e!.tag === s))) return e;
      }
      return null;
    },
  };
  return self as unknown as EventTarget;
}

const body = el("body");
const canvasWrap = el("div", "world-canvas-wrap");
const back = el("button", "hud-btn", el("div", "hud") as unknown as FakeEl);
const none = { isWaiting: () => false };
const key = (code: string, target: EventTarget | null = body, repeat = false) => ({ code, target, repeat });

describe("offersKeyToScreen (keys a closeup screen may use)", () => {
  it("offers the screen's keys aimed at the page or the canvas", () => {
    expect(offersKeyToScreen(key("ArrowRight"), none)).toBe(true);
    expect(offersKeyToScreen(key("Enter", canvasWrap), none)).toBe(true);
    expect(offersKeyToScreen(key("NumpadEnter", null), none)).toBe(true);
  });

  it("never offers a key aimed at a control (Enter on a focused Back activates Back)", () => {
    expect(offersKeyToScreen(key("Enter", back), none)).toBe(false);
    expect(offersKeyToScreen(key("ArrowLeft", el("a")), none)).toBe(false);
  });

  it("drops Enter's auto-repeat: a held Enter that opened a map board does not also press its \"go\"", () => {
    expect(offersKeyToScreen(key("Enter", canvasWrap, true), none)).toBe(false);
    expect(offersKeyToScreen(key("NumpadEnter", body, true), none)).toBe(false);
    // released and pressed again: a new press travels
    expect(offersKeyToScreen(key("Enter", canvasWrap, false), none)).toBe(true);
  });

  it("keeps the arrows' auto-repeat (holding one steps a map's ring along)", () => {
    expect(offersKeyToScreen(key("ArrowRight", body, true), none)).toBe(true);
  });

  it("drops the auto-repeat of a key still held from before the open, but not a new press of it", () => {
    const waiting = { isWaiting: (code: string) => code === "ArrowUp" };
    expect(offersKeyToScreen(key("ArrowUp", body, true), waiting)).toBe(false);
    expect(offersKeyToScreen(key("ArrowUp", body, false), waiting)).toBe(true);
    expect(offersKeyToScreen(key("ArrowDown", body, true), waiting)).toBe(true);
  });
});

describe("closeupSpace (Space while a closeup is open)", () => {
  it("Play: Space aimed at the world never jumps behind the closeup, nor scrolls", () => {
    expect(closeupSpace("Space", true, body)).toBe("block");
    expect(closeupSpace("Space", true, canvasWrap)).toBe("block");
  });

  it("Play: Space on a focused control (Back) still presses it, and nothing behind the closeup sees it", () => {
    expect(closeupSpace("Space", true, back)).toBe("stop");
  });

  it("leaves other keys, and the tour, alone", () => {
    expect(closeupSpace("Enter", true, body)).toBe("none");
    expect(closeupSpace("Space", false, body)).toBe("none");
    expect(closeupSpace("Space", false, back)).toBe("none");
  });
});
