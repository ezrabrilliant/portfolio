import { beforeEach, describe, expect, it } from "vitest";
import { clampKnob, consumeTouch, joystickVector, resetTouch, stickOrigin, touchInput } from "./touch";

describe("stickOrigin", () => {
  const rest = { x: 80, y: 760, r: 56 };
  it("a touch on the visible resting stick grabs that stick (anchored at its centre)", () => {
    expect(stickOrigin(rest, { x: 100, y: 740 })).toEqual({ x: 80, y: 760 });
    expect(stickOrigin(rest, { x: 80 + 56, y: 760 })).toEqual({ x: 80, y: 760 });
  });
  it("a touch elsewhere in the zone floats the stick to the finger", () => {
    expect(stickOrigin(rest, { x: 200, y: 600 })).toEqual({ x: 200, y: 600 });
  });
});

describe("clampKnob", () => {
  it("follows the finger inside the radius", () => {
    expect(clampKnob({ x: 100, y: 100 }, { x: 120, y: 90 }, 56)).toEqual({ x: 120, y: 90 });
  });
  it("stops at the rim when the finger goes further", () => {
    const k = clampKnob({ x: 0, y: 0 }, { x: 300, y: 400 }, 50);
    expect(k.x).toBeCloseTo(30, 9);
    expect(k.y).toBeCloseTo(40, 9);
  });
});

describe("joystickVector", () => {
  it("is zero inside the deadzone", () => {
    expect(joystickVector({ x: 100, y: 100 }, { x: 103, y: 102 }, 56)).toEqual({ x: 0, y: 0, magnitude: 0 });
  });
  it("points forward when dragged up (screen y decreases)", () => {
    const v = joystickVector({ x: 100, y: 100 }, { x: 100, y: 44 }, 56);
    expect(v.y).toBeCloseTo(1, 6);
    expect(v.x).toBeCloseTo(0, 6);
    expect(v.magnitude).toBeCloseTo(1, 6);
  });
  it("clamps beyond the radius", () => {
    const v = joystickVector({ x: 0, y: 0 }, { x: 500, y: 0 }, 56);
    expect(v.magnitude).toBe(1);
    expect(v.x).toBeCloseTo(1, 6);
  });
  it("rescales magnitude after the deadzone", () => {
    const v = joystickVector({ x: 0, y: 0 }, { x: 28, y: 0 }, 56, 0.1);
    expect(v.magnitude).toBeCloseTo((0.5 - 0.1) / 0.9, 6);
  });
});

describe("touch buttons", () => {
  beforeEach(() => resetTouch());
  it("consumes one-shot presses", () => {
    touchInput.jump = true;
    expect(consumeTouch("jump")).toBe(true);
    expect(consumeTouch("jump")).toBe(false);
  });
  it("resetTouch zeroes the stick", () => {
    touchInput.moveForward = 0.7;
    touchInput.active = true;
    resetTouch();
    expect(touchInput.moveForward).toBe(0);
    expect(touchInput.active).toBe(false);
  });
});
