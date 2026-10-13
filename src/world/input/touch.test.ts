import { beforeEach, describe, expect, it } from "vitest";
import { consumeTouch, joystickVector, resetTouch, touchInput } from "./touch";

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
