import { describe, expect, it } from "vitest";
import {
  INITIAL_READ,
  LOADING_SECONDS,
  READ_PAUSE,
  TYPE_RATE,
  actChat,
  advanceChat,
  answering,
  autoChat,
  busyChat,
  clockStamp,
  initChat,
  loading,
  topicTitle,
  visibleLines,
  type ChatState,
} from "./chat";
import { CHAT_STRINGS } from "./strings";

const NOW = new Date(2026, 9, 14, 9, 5, 30); // 09:05:30 local
const [HIT_AND_RUN, THEFT] = CHAT_STRINGS.conversations;

/** Clock time just after the newest line has fully appeared. */
const settled = (s: ChatState) => {
  const last = s.lines[s.lines.length - 1];
  return last.at + last.text.length / TYPE_RATE + 0.01;
};

describe("chat messages", () => {
  it("opens with the first conversation's exchange already on screen, fully typed", () => {
    const s = initChat(NOW);
    expect(topicTitle(s)).toBe("Hit-and-run");
    expect(visibleLines(s, 0).map((v) => [v.line.who, v.text])).toEqual([
      ["user", HIT_AND_RUN.script[0].text],
      ["bot", HIT_AND_RUN.script[1].text],
    ]);
    expect(answering(s, 0)).toBe(false);
  });

  it("a tap shows the next question now and queues the answer after the loading line", () => {
    const s = actChat(initChat(NOW), "advance", undefined, 2);
    expect(topicTitle(s)).toBe("Motorcycle theft");
    expect(s.lines.map((l) => [l.who, l.text])).toEqual([
      ["user", THEFT.script[0].text],
      ["bot", THEFT.script[1].text],
    ]);
    expect(s.lines[0].at).toBe(2);
    expect(s.lines[1].at).toBeCloseTo(2 + LOADING_SECONDS, 9);
  });

  it("shows the progress line for ~1.1 s, then types the answer at ~110 characters a second", () => {
    const s = advanceChat(initChat(NOW), 2);
    expect(loading(s, 2.5)).toBe(true);
    expect(visibleLines(s, 2.5).map((v) => v.line.who)).toEqual(["user"]);
    expect(loading(s, 2 + LOADING_SECONDS + 0.01)).toBe(false);
    const typed = visibleLines(s, 2 + LOADING_SECONDS + 0.5)[1].text;
    expect(typed.length).toBeGreaterThanOrEqual(TYPE_RATE / 2 - 1);
    expect(typed.length).toBeLessThanOrEqual(TYPE_RATE / 2);
    expect(THEFT.script[1].text.startsWith(typed)).toBe(true);
    expect(visibleLines(s, settled(s))[1].text).toBe(THEFT.script[1].text);
  });

  it("ignores taps while the bot is answering", () => {
    const s = advanceChat(initChat(NOW), 2);
    expect(answering(s, 3)).toBe(true);
    expect(advanceChat(s, 3)).toBe(s);
    expect(answering(s, settled(s))).toBe(false);
  });

  it("stamps each bubble 'HH.mm' from the injected clock", () => {
    expect(clockStamp(NOW.getTime(), 0)).toBe("09.05");
    expect(clockStamp(NOW.getTime(), 40)).toBe("09.06");
    const s = advanceChat(initChat(NOW), 29); // question at 09:05:59, answer at 09:06:00.1
    expect(s.lines.map((l) => l.stamp)).toEqual(["09.05", "09.06"]);
  });
});

describe("chat conversations", () => {
  it("the follow-up stays in the same chat; after the last exchange the next conversation starts over", () => {
    let s = advanceChat(initChat(NOW), 0); // theft: first exchange
    s = advanceChat(s, settled(s)); // theft: follow-up in the same chat
    expect(topicTitle(s)).toBe("Motorcycle theft");
    expect(s.lines.map((l) => l.text)).toEqual(THEFT.script.map((l) => l.text));
    s = advanceChat(s, settled(s)); // theft done: hit-and-run starts over
    expect(topicTitle(s)).toBe("Hit-and-run");
    expect(s.lines.map((l) => l.text)).toEqual(HIT_AND_RUN.script.map((l) => l.text));
  });

  it("loops: theft, theft, hit-and-run, theft, theft", () => {
    let s = initChat(NOW);
    const titles: string[] = [];
    for (let i = 0; i < 5; i++) {
      s = advanceChat(s, i === 0 ? 0 : settled(s));
      titles.push(topicTitle(s));
    }
    expect(titles).toEqual(["Motorcycle theft", "Motorcycle theft", "Hit-and-run", "Motorcycle theft", "Motorcycle theft"]);
  });
});

describe("chat demo and redraws", () => {
  it("the idle demo first waits INITIAL_READ, then until each answer has been readable for READ_PAUSE", () => {
    expect(autoChat(initChat(NOW), INITIAL_READ - 0.05)).toBeNull();
    const s1 = autoChat(initChat(NOW), INITIAL_READ);
    if (!s1) throw new Error("no demo step");
    expect(topicTitle(s1)).toBe("Motorcycle theft");
    expect(s1.next).toBeCloseTo(settled(s1) - 0.01 + READ_PAUSE, 9);
    expect(autoChat(s1, s1.next - 0.05)).toBeNull();
    expect(autoChat(s1, s1.next)?.lines).toHaveLength(4);
  });

  it("is busy while loading or typing and idle once the answer is complete", () => {
    const s = advanceChat(initChat(NOW), 0);
    expect(busyChat(s, 0.5)).toBe(true);
    expect(busyChat(s, 2)).toBe(true);
    expect(busyChat(s, settled(s) + 0.1)).toBe(false);
    expect(busyChat(initChat(NOW), 0)).toBe(false);
  });
});
