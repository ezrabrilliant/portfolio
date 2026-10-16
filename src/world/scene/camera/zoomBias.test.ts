import { describe, expect, it } from "vitest";
import { ZOOM_BIAS, zoomBiasTarget } from "./zoomBias";

describe("adaptive zoom", () => {
  it("pulls back while running, closes in after standing by something usable, else stays", () => {
    expect(zoomBiasTarget(true, 5)).toBe(ZOOM_BIAS.run);
    expect(zoomBiasTarget(false, ZOOM_BIAS.nearAfter + 0.1)).toBe(ZOOM_BIAS.near);
    expect(zoomBiasTarget(false, 0.2)).toBe(1);
  });
});
