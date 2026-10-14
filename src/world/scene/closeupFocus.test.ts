import { describe, expect, it, vi } from "vitest";
import { CONTROL_SELECTOR, isControlTarget, releaseHudFocus } from "./closeupFocus";

/** A stand-in DOM element: `closest` matches tag names and `.class` selectors up the parent chain, as the DOM does. */
interface FakeEl {
  tag: string;
  cls?: string;
  parent?: FakeEl;
  closest(selector: string): FakeEl | null;
  blur: () => void;
}
function el(tag: string, cls?: string, parent?: FakeEl): FakeEl {
  const self: FakeEl = {
    tag,
    cls,
    parent,
    blur: vi.fn(),
    closest(selector: string) {
      const parts = selector.split(",").map((s) => s.trim());
      for (let e: FakeEl | undefined = self; e; e = e.parent) {
        if (parts.some((s) => (s.startsWith(".") ? e!.cls === s.slice(1) : e!.tag === s))) return e;
      }
      return null;
    },
  };
  return self;
}

const body = el("body");
const hud = el("div", "hud", body);
const hudButton = el("button", "hud-btn", el("div", "hud-bar", hud));
const mirror = el("nav", "seo-mirror", body);
const as = (e: FakeEl) => e as unknown as EventTarget;

describe("isControlTarget (keys that a closeup screen is never offered)", () => {
  it("covers links, buttons, form fields and the HUD", () => {
    const parts = CONTROL_SELECTOR.split(",").map((s) => s.trim());
    expect(parts).toEqual(["a", "button", "input", "select", "textarea", ".hud"]);
  });

  it("is true for a focused HUD button, a link of the SEO mirror, a field, and anything inside the HUD", () => {
    expect(isControlTarget(as(hudButton))).toBe(true);
    expect(isControlTarget(as(el("a", undefined, mirror)))).toBe(true);
    expect(isControlTarget(as(el("input", undefined, body)))).toBe(true);
    expect(isControlTarget(as(el("span", undefined, hudButton)))).toBe(true);
    expect(isControlTarget(as(el("p", "hud-hint", hud)))).toBe(true);
  });

  it("is false for the page body, the canvas, the window or no target: the screen gets those keys", () => {
    expect(isControlTarget(as(body))).toBe(false);
    expect(isControlTarget(as(el("canvas", undefined, el("div", "world", body))))).toBe(false);
    expect(isControlTarget({} as EventTarget)).toBe(false);
    expect(isControlTarget(null)).toBe(false);
  });
});

describe("releaseHudFocus (a closeup opening takes its keys back from the HUD)", () => {
  it("blurs a focused HUD button", () => {
    const b = el("button", "hud-btn", hud);
    releaseHudFocus({ activeElement: b });
    expect(b.blur).toHaveBeenCalledOnce();
  });

  it("leaves focus elsewhere alone: the body, a mirror link, nothing, no document", () => {
    const link = el("a", undefined, mirror);
    const page = el("body");
    releaseHudFocus({ activeElement: link });
    releaseHudFocus({ activeElement: page });
    releaseHudFocus({ activeElement: null });
    releaseHudFocus(null);
    expect(link.blur).not.toHaveBeenCalled();
    expect(page.blur).not.toHaveBeenCalled();
  });
});
