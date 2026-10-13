import { describe, expect, it } from "vitest";
import { STAND_UP_SECONDS, pickAnim, poseFor } from "./anim";
import type { AnimInput } from "./anim";

const base: AnimInput = { onGround: true, speed: 0, vy: 0, landTimer: 0, seated: false, standUp: 0, riding: false };

describe("pickAnim", () => {
  it("sits while seated, whatever else is true", () => {
    expect(pickAnim({ ...base, seated: true, speed: 5 })).toBe("sit");
  });
  it("rides in the minecart", () => {
    expect(pickAnim({ ...base, riding: true })).toBe("ride");
  });
  it("stands up while the timer runs", () => {
    expect(pickAnim({ ...base, standUp: 0.4 })).toBe("standUp");
  });
  it("jumps going up and falls going down", () => {
    expect(pickAnim({ ...base, onGround: false, vy: 3 })).toBe("jump");
    expect(pickAnim({ ...base, onGround: false, vy: -3 })).toBe("fall");
  });
  it("lands briefly after touching down", () => {
    expect(pickAnim({ ...base, landTimer: 0.1 })).toBe("land");
  });
  it("picks idle, walk, run by speed", () => {
    expect(pickAnim({ ...base, speed: 0.1 })).toBe("idle");
    expect(pickAnim({ ...base, speed: 4.5 })).toBe("walk");
    expect(pickAnim({ ...base, speed: 7.5 })).toBe("run");
  });
});

describe("poseFor", () => {
  const k = { standUp: 0, reduced: false };
  it("swings the run wider than the walk", () => {
    const walk = poseFor("walk", 0, Math.PI / 2, k);
    const run = poseFor("run", 0, Math.PI / 2, k);
    expect(Math.abs(run.legL)).toBeGreaterThan(Math.abs(walk.legL));
    expect(run.lean).toBeGreaterThan(0);
  });
  it("legs move in opposition while walking", () => {
    const p = poseFor("walk", 0, 1, k);
    expect(p.legL).toBeCloseTo(-p.legR, 6);
    expect(Math.sign(p.armL)).toBe(-Math.sign(p.legL));
  });
  it("squashes on landing", () => {
    expect(poseFor("land", 0, 0, k).squash).toBeLessThan(1);
  });
  it("sits low with legs hanging forward", () => {
    const p = poseFor("sit", 0, 0, { standUp: 0, reduced: true });
    expect(p.bodyY).toBeLessThan(-0.4);
    expect(p.legL).toBeCloseTo(-0.35, 6);
  });
  it("reduced motion stops the seated leg swing", () => {
    const r = { standUp: 0, reduced: true };
    expect(poseFor("sit", 0, 0, r).legL).toBe(poseFor("sit", 1.7, 0, r).legL);
  });
  it("ends the stand-up in a standing pose", () => {
    const start = poseFor("standUp", 0, 0, { standUp: STAND_UP_SECONDS, reduced: false });
    const end = poseFor("standUp", 0, 0, { standUp: 0.0001, reduced: false });
    expect(start.bodyY).toBeLessThan(-0.4);
    expect(Math.abs(end.bodyY)).toBeLessThan(0.05);
    expect(Math.abs(end.legL)).toBeLessThan(0.05);
  });
});
