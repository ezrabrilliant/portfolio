import { describe, expect, it } from "vitest";
import { dprCap, pickQuality } from "./quality";

const desktop = { width: 1440, height: 900, cores: 8, coarsePointer: false, saveData: false };

describe("pickQuality", () => {
  it("picks high on a normal desktop", () => {
    expect(pickQuality(desktop)).toBe("high");
  });
  it("picks low when data saver is on", () => {
    expect(pickQuality({ ...desktop, saveData: true })).toBe("low");
  });
  it("picks low with 4 or fewer cores", () => {
    expect(pickQuality({ ...desktop, cores: 4 })).toBe("low");
  });
  it("picks low on a small touch screen", () => {
    expect(pickQuality({ width: 412, height: 915, cores: 8, coarsePointer: true, saveData: false })).toBe("low");
  });
  it("keeps high on a large touch screen with many cores", () => {
    expect(pickQuality({ width: 1366, height: 1024, cores: 8, coarsePointer: true, saveData: false })).toBe("high");
  });
});

describe("dprCap", () => {
  it("caps pixel ratio per tier", () => {
    expect(dprCap("high")).toBe(1.75);
    expect(dprCap("low")).toBe(1.25);
  });
});
