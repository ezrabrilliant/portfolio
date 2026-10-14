import { describe, expect, it, vi } from "vitest";
import { CANVAS_WRAP_SELECTOR, closeFromBack } from "./backFocus";

function page(active: "back" | "body") {
  const back = { name: "back" };
  const wrap = { focus: vi.fn() };
  const doc = {
    activeElement: active === "back" ? (back as unknown) : { name: "body" },
    querySelector: vi.fn((sel: string) => (sel === CANVAS_WRAP_SELECTOR ? wrap : null)),
  };
  return { back, wrap, doc };
}

describe("closeFromBack (the HUD's Back button)", () => {
  it("closes the closeup", () => {
    const { back, doc } = page("body");
    const close = vi.fn();
    closeFromBack(back, close, doc);
    expect(close).toHaveBeenCalledOnce();
  });

  it("a Back pressed from the keyboard (it had the focus) hands the focus to the world canvas, not <body>", () => {
    const { back, wrap, doc } = page("back");
    closeFromBack(back, vi.fn(), doc);
    expect(wrap.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("reads the focus before closing (the close unmounts Back)", () => {
    const { back, wrap, doc } = page("back");
    closeFromBack(back, () => (doc.activeElement = { name: "body" }), doc);
    expect(wrap.focus).toHaveBeenCalledOnce();
  });

  it("a clicked Back (never focused: the HUD keeps the focus where it was) leaves the focus alone", () => {
    const { back, wrap, doc } = page("body");
    closeFromBack(back, vi.fn(), doc);
    expect(wrap.focus).not.toHaveBeenCalled();
  });

  it("is safe without a document or a canvas", () => {
    const close = vi.fn();
    closeFromBack({}, close, null);
    expect(close).toHaveBeenCalledOnce();
    const { back, doc } = page("back");
    doc.querySelector.mockReturnValue(null);
    expect(() => closeFromBack(back, vi.fn(), doc)).not.toThrow();
  });
});
