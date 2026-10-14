import { describe, expect, it } from "vitest";
import { fakeCtx } from "../testing/fakeCtx";
import { advanceChat, initChat } from "./chat";
import { chatApp } from "./index";

const NOW = new Date(2026, 9, 14, 9, 5, 30);

describe("chatApp", () => {
  it("is a 240 × 520 phone screen", () => {
    expect(chatApp.logical).toEqual({ w: 240, h: 520 });
  });

  it("makes the whole phone one 'advance' region", () => {
    expect(chatApp.draw(fakeCtx(), initChat(NOW), 0)).toEqual([{ x: 0, y: 0, w: 240, h: 520, action: "advance" }]);
  });

  it("draws while loading, while typing and when settled without throwing", () => {
    const s = advanceChat(initChat(NOW), 0);
    for (const t of [0.5, 1.5, 3, 10]) expect(() => chatApp.draw(fakeCtx(), s, t)).not.toThrow();
  });
});
