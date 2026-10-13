import { describe, expect, it } from "vitest";
import { STAND_UP_SECONDS, pickAnim, poseFor } from "./anim";
import type { AnimInput, Pose } from "./anim";

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
  const shinL = (p: Pose) => p.legL + p.kneeL; // shin angle from vertical, negative = forward
  const shinR = (p: Pose) => p.legR + p.kneeR;

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
  it("keeps the body over the feet when standing or moving", () => {
    for (const s of ["idle", "walk", "run", "jump", "fall", "land", "ride"] as const) expect(poseFor(s, 1, 1, k).bodyZ).toBe(0);
  });
  it("squashes on landing", () => {
    expect(poseFor("land", 0, 0, k).squash).toBeLessThan(1);
  });
  it("sits on the rim: hips low, thighs flat, knees bent so the shins hang, hands on the thighs", () => {
    const p = poseFor("sit", 0, 0, { standUp: 0, reduced: true });
    expect(p.bodyY).toBeLessThan(-0.4);
    expect(Math.abs(p.legL + Math.PI / 2)).toBeLessThan(0.1); // thigh about horizontal, pointing forward
    expect(p.legR).toBe(p.legL);
    expect(p.kneeL).toBeGreaterThan(1);
    expect(shinL(p)).toBeLessThanOrEqual(0); // shin hangs at or forward of vertical
    expect(shinL(p)).toBeGreaterThan(-0.45);
    expect(p.bodyZ).toBeGreaterThan(0); // hips shift toward the edge
    expect(p.armL).toBeLessThan(-0.3);
    expect(p.armL).toBeGreaterThan(-0.6);
  });
  it("dangles the shins forward only, never back into the rim", () => {
    for (let t = 0; t < 10; t += 0.05) {
      const p = poseFor("sit", t, 0, k);
      expect(shinL(p)).toBeLessThanOrEqual(0);
      expect(shinR(p)).toBeLessThanOrEqual(0);
    }
  });
  it("turns the head toward the viewer while seated", () => {
    expect(poseFor("sit", 0, 0, { standUp: 0, reduced: true, look: -0.3 }).headYaw).toBeCloseTo(-0.3, 6);
  });
  it("reduced motion stops the seated leg swing and look-around", () => {
    const r = { standUp: 0, reduced: true };
    const a = poseFor("sit", 0, 0, r);
    const b = poseFor("sit", 1.7, 0, r);
    expect(b.kneeL).toBe(a.kneeL);
    expect(b.kneeR).toBe(a.kneeR);
    expect(b.headYaw).toBe(a.headYaw);
  });
  it("reduced motion keeps idle still", () => {
    const r = { standUp: 0, reduced: true };
    expect(poseFor("idle", 1.3, 0, r)).toEqual(poseFor("idle", 4.1, 0, r));
  });
  it("starts the stand-up exactly in the live sit pose (no pop)", () => {
    for (const t of [0, 1.7, 4.2]) {
      for (const reduced of [false, true]) {
        const sit = poseFor("sit", t, 0, { standUp: 0, reduced, look: -0.3 });
        const up = poseFor("standUp", t, 0, { standUp: STAND_UP_SECONDS, reduced, look: -0.3 });
        for (const key of Object.keys(sit) as Array<keyof Pose>) expect(up[key], key).toBeCloseTo(sit[key], 6);
      }
    }
  });
  it("ends the stand-up in a standing pose", () => {
    const start = poseFor("standUp", 0, 0, { standUp: STAND_UP_SECONDS, reduced: false });
    const end = poseFor("standUp", 0, 0, { standUp: 0.0001, reduced: false });
    expect(start.bodyY).toBeLessThan(-0.4);
    expect(Math.abs(end.bodyY)).toBeLessThan(0.05);
    expect(Math.abs(end.bodyZ)).toBeLessThan(0.01);
    expect(Math.abs(end.legL)).toBeLessThan(0.05);
    expect(Math.abs(end.kneeL)).toBeLessThan(0.05);
  });
});
