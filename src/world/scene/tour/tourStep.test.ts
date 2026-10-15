import { describe, expect, it } from "vitest";
import { stepStopIndex, swipeDir } from "./tourStep";

describe("tour steps", () => {
  it("steps one stop, held at both ends", () => {
    expect(stepStopIndex(3, 1, 9)).toBe(4);
    expect(stepStopIndex(3, -1, 9)).toBe(2);
    expect(stepStopIndex(8, 1, 9)).toBe(8);
    expect(stepStopIndex(0, -1, 9)).toBe(0);
  });

  it("reads a sideways swipe as a carousel: left brings the next island", () => {
    expect(swipeDir(-80, 10)).toBe(1);
    expect(swipeDir(80, -10)).toBe(-1);
  });

  it("ignores short swipes and page scrolls", () => {
    expect(swipeDir(-30, 0)).toBe(0);
    expect(swipeDir(-80, 70)).toBe(0);
  });
});
