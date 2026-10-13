import { describe, expect, it } from "vitest";
import { cycleFocus } from "./focus";

describe("cycleFocus", () => {
  const ids = ["a", "b", "c"];
  it("starts at the first item going forward and the last going back", () => {
    expect(cycleFocus(ids, null, 1)).toBe("a");
    expect(cycleFocus(ids, null, -1)).toBe("c");
  });
  it("moves through the list", () => {
    expect(cycleFocus(ids, "a", 1)).toBe("b");
    expect(cycleFocus(ids, "c", -1)).toBe("b");
  });
  it("returns null past either end so Tab can leave the canvas", () => {
    expect(cycleFocus(ids, "c", 1)).toBeNull();
    expect(cycleFocus(ids, "a", -1)).toBeNull();
  });
  it("restarts when the current id is not in the list", () => {
    expect(cycleFocus(ids, "zzz", 1)).toBe("a");
  });
  it("returns null for an empty list", () => {
    expect(cycleFocus([], null, 1)).toBeNull();
  });
});
