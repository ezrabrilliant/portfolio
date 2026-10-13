import { describe, expect, it } from "vitest";
import { CHAT_SCRIPT, messageTime, pushMessage, richTokens, startLog, visibleWindow, wrapToWidth } from "./chat";

describe("Ezra Bot chat script", () => {
  it("alternates a member's question (skeleton) with a short, readable bot answer", () => {
    CHAT_SCRIPT.forEach((m, i) => expect(m.kind).toBe(i % 2 === 0 ? "user" : "bot"));
    for (const m of CHAT_SCRIPT) {
      if (m.kind === "bot") {
        expect(m.text.length).toBeGreaterThan(0);
        // short enough for one big line at the tour distance; drawBubble falls back to two smaller lines if not
        expect(m.text.length).toBeLessThanOrEqual(28);
        expect(m.text).not.toMatch(/solo|end-to-end|self-hosted|docker/i);
      } else {
        expect(m.bars.length).toBeGreaterThan(0);
      }
    }
  });

  it("points every answer at a source: a channel mention or a site", () => {
    for (const m of CHAT_SCRIPT) {
      if (m.kind === "bot") expect(richTokens(m.text).some((t) => t.kind !== "text")).toBe(true);
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

  it("never stamps a message before today's midnight", () => {
    const now = new Date(2026, 9, 13, 0, 1);
    expect(messageTime(now, 0)).toBe("Today at 00:01");
    expect(messageTime(now, 1)).toBe("Today at 00:00");
    expect(messageTime(now, 2)).toBe("Today at 00:00");
  });

  it("stamps each message once, when it is pushed", () => {
    const log = startLog(new Date(2026, 9, 13, 19, 42));
    expect(log).toEqual({ latest: 1, times: ["Today at 19:38", "Today at 19:40", "Today at 19:42"] });
    const next = pushMessage(log, new Date(2026, 9, 13, 19, 50));
    expect(next).toEqual({ latest: 2, times: ["Today at 19:40", "Today at 19:42", "Today at 19:50"] });
  });
});

describe("bubble text", () => {
  it("splits channel mentions and sites out of a reply", () => {
    expect(richTokens("Pinned in #guides, Friday.")).toEqual([
      { kind: "text", text: "Pinned in " },
      { kind: "mention", text: "#guides" },
      { kind: "text", text: ", Friday." },
    ]);
    expect(richTokens("Mods online: see gtid.pro")).toEqual([
      { kind: "text", text: "Mods online: see " },
      { kind: "link", text: "gtid.pro" },
    ]);
  });

  it("wraps a long reply by measured width", () => {
    const measure = (s: string) => s.length * 14.5; // ≈ the 32 px canvas font
    const text = "Event starts Saturday 19:00. Rules are in #announcements.";
    expect(wrapToWidth(text, 688, measure)).toEqual(["Event starts Saturday 19:00. Rules are in", "#announcements."]);
    expect(wrapToWidth("Pinned in #guides, Friday.", 688, measure)).toEqual(["Pinned in #guides, Friday."]);
  });
});
