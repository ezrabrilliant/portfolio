import { describe, expect, it } from "vitest";
import { wrapWords } from "./text";

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
