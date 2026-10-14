import { describe, expect, it } from "vitest";
import { DEMO_PAUSE, MIN_FRAME, demoMayRun, redrawDue, type DemoGate } from "./policy";

const gate: DemoGate = {
  reduced: false,
  t: 20,
  pausedUntil: 0,
  inCloseup: false,
  activeIsland: "pos-monosuko",
  island: "pos-monosuko",
};

describe("demoMayRun", () => {
  it("plays while the screen's island is the one in view", () => {
    expect(demoMayRun(gate)).toBe(true);
  });

  it("stops on other islands unless the screen is in closeup", () => {
    expect(demoMayRun({ ...gate, activeIsland: "gtid" })).toBe(false);
    expect(demoMayRun({ ...gate, activeIsland: "gtid", inCloseup: true })).toBe(true);
  });

  it("pauses for DEMO_PAUSE seconds after a tap", () => {
    const tap = 20;
    expect(demoMayRun({ ...gate, t: tap + DEMO_PAUSE - 0.1, pausedUntil: tap + DEMO_PAUSE })).toBe(false);
    expect(demoMayRun({ ...gate, t: tap + DEMO_PAUSE, pausedUntil: tap + DEMO_PAUSE })).toBe(true);
  });

  it("never plays under reduced motion", () => {
    expect(demoMayRun({ ...gate, reduced: true })).toBe(false);
    expect(demoMayRun({ ...gate, reduced: true, inCloseup: true })).toBe(false);
  });
});

describe("redrawDue", () => {
  it("redraws a changed screen once MIN_FRAME has passed", () => {
    expect(redrawDue(1, 1 - MIN_FRAME, true, false)).toBe(true);
    expect(redrawDue(1, 1 - MIN_FRAME / 2, true, false)).toBe(false);
  });

  it("keeps an animating screen at 15 fps or less", () => {
    let draws = 0;
    let last = -Infinity;
    for (let f = 0; f <= 60; f++) {
      const t = f / 60; // one second of 60 fps frames
      if (redrawDue(t, last, false, true)) {
        draws++;
        last = t;
      }
    }
    expect(draws).toBeLessThanOrEqual(16);
    expect(draws).toBeGreaterThanOrEqual(14);
  });

  it("does nothing when nothing changed and nothing animates", () => {
    expect(redrawDue(10, 0, false, false)).toBe(false);
  });
});
