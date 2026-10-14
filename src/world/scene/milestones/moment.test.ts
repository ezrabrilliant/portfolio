import { describe, expect, it } from "vitest";
import { CAP_RADIUS, TOSS, capPopScale, crossedForward, nearMilestone, tossPose } from "./moment";

describe("graduation moment maths", () => {
  const foot = { x: 10.5, y: 3, z: -4.5 };

  it("counts Ezra as near within 2.5 blocks horizontally of the pillar's foot, at about its level", () => {
    expect(CAP_RADIUS).toBe(2.5);
    expect(nearMilestone({ x: 12.9, y: 3, z: -4.5 }, foot)).toBe(true);
    expect(nearMilestone({ x: 12.2, y: 3.4, z: -5.9 }, foot)).toBe(true);
    expect(nearMilestone({ x: 13.1, y: 3, z: -4.5 }, foot)).toBe(false);
    expect(nearMilestone({ x: 10.5, y: 7, z: -4.5 }, foot)).toBe(false);
    expect(nearMilestone({ x: 10.5, y: -1, z: -4.5 }, foot)).toBe(false);
  });

  it("fires the tour toss only when the progress moves forward across the pillar's progress", () => {
    expect(crossedForward(0.08, 0.1, 0.09)).toBe(true);
    expect(crossedForward(0.09, 0.1, 0.09)).toBe(false); // already past
    expect(crossedForward(0.1, 0.08, 0.09)).toBe(false); // scrolling back
    expect(crossedForward(-1, 0.5, 0.09)).toBe(false); // first frame (e.g. a ?stop deep link past it)
    expect(crossedForward(0.05, 0.09, 0.09)).toBe(true); // landing exactly on it counts
  });

  it("tosses the cap up and back onto the pillar, spinning, in TOSS.duration seconds", () => {
    expect(tossPose(0)).toEqual({ y: 0, spin: 0, tilt: 0, done: false });
    const top = tossPose(TOSS.duration / 2);
    expect(top.y).toBeCloseTo(TOSS.height, 9);
    expect(top.done).toBe(false);
    const end = tossPose(TOSS.duration);
    expect(end.y).toBeCloseTo(0, 9);
    expect(end.spin).toBeCloseTo(TOSS.turns * Math.PI * 2, 9);
    expect(end.tilt).toBeCloseTo(0, 9);
    expect(end.done).toBe(true);
    expect(tossPose(TOSS.duration + 3)).toEqual(end);
  });

  it("pops the cap on: grows from nothing, overshoots a little, settles at full size by 0.3 s", () => {
    expect(capPopScale(0)).toBe(0);
    const samples = Array.from({ length: 30 }, (_, i) => capPopScale((i + 1) * 0.01));
    expect(Math.max(...samples)).toBeGreaterThan(1.05);
    expect(Math.max(...samples)).toBeLessThan(1.2);
    expect(capPopScale(0.3)).toBe(1);
    expect(capPopScale(2)).toBe(1);
  });
});
