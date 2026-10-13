import { describe, expect, it } from "vitest";
import { infoBoardRows, wrapWords } from "./text";

describe("wrapWords", () => {
  it("wraps on word boundaries without exceeding the limit", () => {
    expect(wrapWords("I build bots, games and web tools that people use every day.", 21)).toEqual([
      "I build bots, games",
      "and web tools that",
      "people use every day.",
    ]);
  });
  it("keeps a single long word on its own line and ignores extra spaces", () => {
    expect(wrapWords("  gtid.pro   tracker ", 4)).toEqual(["gtid.pro", "tracker"]);
  });
});

describe("infoBoardRows", () => {
  it("keeps a one-line title and the original spacing", () => {
    const r = infoBoardRows("gtid.pro", ["2,600 visitors / day", "16,000+ items"]);
    expect(r.title).toEqual(["gtid.pro"]);
    expect(r.body).toEqual(["2,600 visitors / day", "16,000+ items"]);
    expect(r.titleY).toEqual([0.28]);
    expect(r.bodyY[0]).toBeCloseTo(0.62);
    expect(r.bodyY[1]).toBeCloseTo(0.92);
    expect(r.height).toBeCloseTo(1.22);
  });

  it("wraps a long title and pushes the body down by one title row per extra line", () => {
    const r = infoBoardRows("Surabaya, Indonesia", ["I build bots, games and web tools that people use every day."]);
    expect(r.title).toEqual(["Surabaya,", "Indonesia"]);
    expect(r.body).toEqual(["I build bots, games", "and web tools that", "people use every day."]);
    expect(r.titleY[1] - r.titleY[0]).toBeCloseTo(0.31);
    expect(r.bodyY[0] - r.titleY[1]).toBeCloseTo(0.34); // same title-to-body gap as a one-line title
    expect(r.bodyY[2] - r.bodyY[1]).toBeCloseTo(0.3);
    expect(r.height).toBeCloseTo(0.62 + 0.31 + 3 * 0.3);
  });

  it("puts every row inside the board", () => {
    const r = infoBoardRows("Growtopia Indonesia price tracker", ["51,900+ Discord members", "14,500 requests / day"]);
    expect(r.title.every((t) => t.length <= 14)).toBe(true);
    const last = r.bodyY[r.bodyY.length - 1];
    expect(last).toBeLessThan(r.height);
    expect(r.height - last).toBeCloseTo(0.3);
  });
});
