import { describe, expect, it } from "vitest";
import { fakeCtx } from "../testing/fakeCtx";
import { advanceChat, initChat } from "./chat";
import type { ChatState } from "./chat";
import { chatApp } from "./index";

const NOW = new Date(2026, 9, 14, 9, 5, 30);

/** Freezes an object and everything it holds, so any write during a draw throws (modules run in strict mode). */
function deepFreeze<T>(o: T): T {
  if (o !== null && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}

/** fakeCtx that throws when a drawing call gets a non-finite number (NaN or ±Infinity). */
function finiteCtx(): CanvasRenderingContext2D {
  return new Proxy(fakeCtx(), {
    get(target, key) {
      const v: unknown = Reflect.get(target, key);
      if (typeof v !== "function") return v;
      return (...args: unknown[]) => {
        if (args.some((a) => typeof a === "number" && !Number.isFinite(a))) {
          throw new Error(`${String(key)}(${args.join(", ")})`);
        }
        return (v as (...a: unknown[]) => unknown)(...args);
      };
    },
  });
}

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

  it("never changes the state it draws (deep-frozen, mid-typing)", () => {
    const s = deepFreeze(advanceChat(initChat(NOW), 0));
    const before = JSON.stringify(s);
    for (const t of [0.5, 1.2, 1.6, 2.4, 10]) expect(() => chatApp.draw(fakeCtx(), s, t)).not.toThrow();
    expect(JSON.stringify(s)).toBe(before);
  });

  it("lays out a whitespace-only bubble with finite geometry", () => {
    const blank: ChatState = {
      ...initChat(NOW),
      lines: [
        { who: "user", text: "   ", stamp: "09.05", at: 0 },
        { who: "bot", text: "   ", stamp: "09.05", at: 0 },
      ],
    };
    expect(() => chatApp.draw(finiteCtx(), blank, 5)).not.toThrow();
  });
});
