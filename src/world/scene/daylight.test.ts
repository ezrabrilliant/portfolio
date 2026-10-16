import { describe, expect, it } from "vitest";
import { DAY_CYCLE, daylightK } from "./daylight";

describe("daylight", () => {
  it("starts in the day, reaches golden hour half way, returns", () => {
    expect(daylightK(0)).toBeCloseTo(0, 9);
    expect(daylightK(DAY_CYCLE / 2)).toBeCloseTo(1, 9);
    expect(daylightK(DAY_CYCLE)).toBeCloseTo(0, 9);
  });
});
