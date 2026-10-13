import { describe, expect, it } from "vitest";
import { DECLINES_TO_LOW, createPerfPolicy, perfStep } from "./perfPolicy";

const run = (events: Array<"incline" | "decline">) => {
  const p = createPerfPolicy();
  for (const e of events) perfStep(p, e);
  return p;
};

describe("performance policy (drei PerformanceMonitor events → DPR and quality)", () => {
  it("keeps high quality on a healthy 60/120 Hz device: an endless incline stream never drops it", () => {
    // drei reports an incline on every 2.5 s window at a healthy frame rate, even when nothing is left to raise
    const p = run(Array(400).fill("incline"));
    expect(p.quality).toBe("high");
    expect(p.slow).toBe(false);
  });

  it("lowers the pixel ratio on the first decline and restores it on an incline", () => {
    const p = createPerfPolicy();
    perfStep(p, "decline");
    expect(p.slow).toBe(true);
    expect(p.quality).toBe("high");
    perfStep(p, "incline");
    expect(p.slow).toBe(false);
  });

  it(`drops to low quality after ${DECLINES_TO_LOW} declines in a row, and stays there`, () => {
    const p = run(Array(DECLINES_TO_LOW).fill("decline"));
    expect(p.quality).toBe("low");
    expect(p.slow).toBe(true);
    perfStep(p, "incline");
    expect(p.quality).toBe("low"); // no flip back: switching tiers rebuilds geometry and shadows
    expect(p.slow).toBe(false);
  });

  it("never drops on a device that recovers between dips", () => {
    const dips: Array<"incline" | "decline"> = [];
    for (let i = 0; i < 50; i++) dips.push(...Array(DECLINES_TO_LOW - 1).fill("decline"), "incline");
    expect(run(dips).quality).toBe("high");
  });

  it("reports the moment quality drops, once", () => {
    const p = createPerfPolicy();
    const dropped = Array.from({ length: DECLINES_TO_LOW + 3 }, () => perfStep(p, "decline"));
    expect(dropped.filter(Boolean)).toHaveLength(1);
    expect(dropped[DECLINES_TO_LOW - 1]).toBe(true);
  });
});
