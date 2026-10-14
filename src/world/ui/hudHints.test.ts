import { describe, expect, it } from "vitest";
import { CLOSEUP_HUD_PX } from "@/world/engine/camera/closeup";
import { HINTS, TOUCH_HINT_MAX } from "./hudHints";

describe("HUD hints", () => {
  it("every touch line fits one line on a 360 px phone", () => {
    for (const line of Object.values(HINTS.touch)) expect(line.length, line).toBeLessThanOrEqual(TOUCH_HINT_MAX);
  });

  it("TOUCH_HINT_MAX characters of 12 px monospace (~7.2 px each) fit the 312 px a 360 px phone leaves", () => {
    expect(TOUCH_HINT_MAX * 7.2).toBeLessThanOrEqual(360 - 2 * 16 - 2 * 8);
  });

  it("one hint line ends inside the band a closeup leaves free (bar top 16 + 46, 12 px × 1.4 + 2 × 4 px padding)", () => {
    expect(16 + 46 + 12 * 1.4 + 2 * 4).toBeLessThanOrEqual(CLOSEUP_HUD_PX);
  });

  it("has a line for every state on both kinds of device", () => {
    expect(Object.keys(HINTS.touch).sort()).toEqual(Object.keys(HINTS.keys).sort());
  });
});
