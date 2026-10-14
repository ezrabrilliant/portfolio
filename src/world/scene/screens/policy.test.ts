import { describe, expect, it } from "vitest";
import {
  ARRIVAL_READ,
  DEMO_PAUSE,
  MIN_FRAME,
  arrivalPause,
  demoMayRun,
  inView,
  redrawDue,
  type DemoGate,
} from "./policy";

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

describe("inView", () => {
  it("is the screen's island being the active one, or the screen being in closeup", () => {
    expect(inView(gate)).toBe(true);
    expect(inView({ ...gate, activeIsland: "gtid" })).toBe(false);
    expect(inView({ ...gate, activeIsland: "gtid", inCloseup: true })).toBe(true);
    expect(inView({ ...gate, reduced: true, pausedUntil: 99 })).toBe(true);
  });
});

describe("arrivalPause", () => {
  /** LiveScreen's frame loop in small: the in-view edge sets the pause, then the demo gate reads it. */
  function frames(seen: (t: number) => boolean, until: number, pausedUntil = 0) {
    let was = false;
    let paused = pausedUntil;
    const runs: boolean[] = [];
    for (let f = 0; f <= until * 10; f++) {
      const t = f / 10;
      const now = seen(t);
      paused = arrivalPause(was, now, t, paused);
      was = now;
      runs.push(demoMayRun({ ...gate, t, pausedUntil: paused, activeIsland: now ? gate.island : "gtid" }));
    }
    return { paused, runs, at: (t: number) => runs[Math.round(t * 10)] };
  }

  it("holds the demo ARRIVAL_READ seconds after the island comes into view", () => {
    expect(arrivalPause(false, true, 20, 0)).toBe(20 + ARRIVAL_READ);
    const { at } = frames((t) => t >= 2, 10);
    expect(at(2)).toBe(false);
    expect(at(2 + ARRIVAL_READ - 0.1)).toBe(false);
    expect(at(2 + ARRIVAL_READ)).toBe(true);
  });

  it("does not extend the pause again while the island stays in view", () => {
    expect(arrivalPause(true, true, 30, 24)).toBe(24);
    expect(frames(() => true, 20).paused).toBe(ARRIVAL_READ);
  });

  it("leaves the pause alone while out of view and on leaving", () => {
    expect(arrivalPause(false, false, 30, 24)).toBe(24);
    expect(arrivalPause(true, false, 30, 24)).toBe(24);
  });

  it("re-arms when the visitor leaves and comes back", () => {
    const { paused, at } = frames((t) => t < 5 || t >= 9, 16);
    expect(at(5)).toBe(false); // away
    expect(at(9 + ARRIVAL_READ - 0.1)).toBe(false);
    expect(at(9 + ARRIVAL_READ)).toBe(true);
    expect(paused).toBe(9 + ARRIVAL_READ);
  });

  it("keeps a longer pause already running (a tap's DEMO_PAUSE)", () => {
    expect(arrivalPause(false, true, 20, 20 + DEMO_PAUSE)).toBe(20 + DEMO_PAUSE);
    expect(DEMO_PAUSE).toBeGreaterThan(ARRIVAL_READ);
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
