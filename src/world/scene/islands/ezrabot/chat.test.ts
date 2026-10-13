import { describe, expect, it } from "vitest";
import { CHAT_SCRIPT, messageTime, visibleWindow } from "./chat";

describe("Ezra Bot chat script", () => {
  it("alternates a member's question (skeleton) with a readable bot answer", () => {
    CHAT_SCRIPT.forEach((m, i) => expect(m.kind).toBe(i % 2 === 0 ? "user" : "bot"));
    for (const m of CHAT_SCRIPT) {
      if (m.kind === "bot") {
        expect(m.text.length).toBeGreaterThan(0);
        expect(m.text.length).toBeLessThanOrEqual(60); // fits one bubble line
        expect(m.text).not.toMatch(/solo|end-to-end|self-hosted|docker/i);
      } else {
        expect(m.bars.length).toBeGreaterThan(0);
      }
    }
  });

  it("shows the last three messages, wrapping around the script", () => {
    expect(visibleWindow(1)).toEqual([5, 0, 1]);
    expect(visibleWindow(4)).toEqual([2, 3, 4]);
    expect(visibleWindow(7)).toEqual([5, 0, 1]);
  });

  it("stamps messages with real 'Today at' times, two minutes apart", () => {
    const now = new Date(2026, 9, 13, 19, 42);
    expect(messageTime(now, 0)).toBe("Today at 19:42");
    expect(messageTime(now, 1)).toBe("Today at 19:40");
  });
});
