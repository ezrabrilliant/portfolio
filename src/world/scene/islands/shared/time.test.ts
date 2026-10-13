import { describe, expect, it } from "vitest";
import { todayAt } from "./time";

describe("todayAt", () => {
  it("formats a Discord-style time with two-digit hours and minutes", () => {
    expect(todayAt(new Date(2026, 9, 13, 9, 5))).toBe("Today at 09:05");
    expect(todayAt(new Date(2026, 9, 13, 19, 42))).toBe("Today at 19:42");
  });
});
