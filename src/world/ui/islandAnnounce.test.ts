import { describe, expect, it } from "vitest";
import { TITLE_CARD, announceIsland, subscribeTitleCard, titleCardNow, titleCardShown } from "./islandAnnounce";

describe("island title card", () => {
  it("records the announced island and tells its listeners", () => {
    let heard = 0;
    const off = subscribeTitleCard(() => heard++);
    announceIsland("gtid", 0.5, 1000);
    expect(titleCardNow()).toEqual({ id: "gtid", at: 1000, delay: 0.5 });
    expect(heard).toBe(1);
    off();
  });

  it("shows after the delay, for its time", () => {
    expect(titleCardShown(0, 100)).toBe(false);
    expect(titleCardShown(0, (TITLE_CARD.delay + 0.1) * 1000)).toBe(true);
    expect(titleCardShown(0, (TITLE_CARD.delay + TITLE_CARD.show + 0.1) * 1000)).toBe(false);
  });
});
