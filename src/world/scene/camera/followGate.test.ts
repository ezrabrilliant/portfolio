import { describe, expect, it } from "vitest";
import { createFollowCam, updateFollowCam } from "@/world/engine/camera/followCam";
import { cameraRelative } from "@/world/input/keyboard";
import { followGate } from "./followGate";
import type { FollowGate } from "./followGate";

const DT = 1 / 60;
const TAU = Math.PI * 2;
const DEG = 180 / Math.PI;
const noOrbit = { orbitX: 0, orbitY: 0, zoom: 0 };
const target = { x: 0, y: 0, z: 0 };

// same heading damping as PlayerController
function dampAngle(a: number, b: number, lambda: number, dt: number): number {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * (1 - Math.exp(-lambda * dt));
}

type Gate = (heading: number, camYaw: number, out: FollowGate) => FollowGate;
const gated: Gate = (heading, camYaw, out) => followGate(heading, camYaw, true, false, out);
const ungated: Gate = (heading, _camYaw, out) => {
  out.heading = heading;
  out.follow = true;
  return out;
};

/**
 * Frame loop of PlayerController + PlayCamera at 60 fps with a held, camera-relative stick
 * (forward, right). Ezra starts facing away from the camera. Returns the follow-cam yaw per frame.
 */
function holdStick(forward: number, right: number, seconds: number, gate: Gate = gated): number[] {
  const cam = createFollowCam();
  let heading = cam.yaw + Math.PI;
  const out: FollowGate = { heading: 0, follow: false };
  const yaws = [cam.yaw];
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    const move = cameraRelative(forward, right, { x: -Math.sin(cam.yaw), z: -Math.cos(cam.yaw) });
    if (Math.hypot(move.x, move.z) > 0.05) heading = dampAngle(heading, Math.atan2(move.x, move.z), 12, DT);
    const g = gate(heading, cam.yaw, out);
    updateFollowCam(cam, target, g.heading, g.follow, DT, noOrbit);
    yaws.push(cam.yaw);
  }
  return yaws;
}

const turnDeg = (yaws: number[]) => (yaws[yaws.length - 1] - yaws[0]) * DEG;

/** Steady camera turn rate (deg/s) over the last 2 s of a 3 s hold at `angleDeg` off straight ahead. */
function steadyRate(angleDeg: number): number {
  const a = angleDeg / DEG;
  const yaws = holdStick(Math.cos(a), Math.sin(a), 3);
  const from = Math.round(1 / DT);
  return ((yaws[yaws.length - 1] - yaws[from]) * DEG) / 2;
}

describe("followGate", () => {
  it("follows fully on rides and not at all when standing still", () => {
    const out: FollowGate = { heading: 0, follow: false };
    expect(followGate(1.2, 0, false, true, out)).toEqual({ heading: 1.2, follow: true });
    expect(followGate(1.2, 0, false, false, out).follow).toBe(false);
  });

  it("passes the heading through when moving straight away from the camera", () => {
    const out: FollowGate = { heading: 0, follow: false };
    const g = followGate(0.3 + Math.PI, 0.3, true, false, out);
    expect(g.follow).toBe(true);
    expect(g.heading).toBeCloseTo(0.3 + Math.PI, 12);
  });

  it("without a gate the camera-relative loop spins (control for the cases below)", () => {
    expect(Math.abs(turnDeg(holdStick(-1, 0, 3, ungated)))).toBeGreaterThan(300);
    expect(Math.abs(turnDeg(holdStick(0, 1, 3, ungated)))).toBeGreaterThan(300);
  });

  it.each([
    ["W", 1, 0],
    ["S", -1, 0],
    ["A", 0, -1],
    ["D", 0, 1],
    ["W+A", Math.SQRT1_2, -Math.SQRT1_2],
    ["S+D", -Math.SQRT1_2, Math.SQRT1_2],
  ])("holding %s for 3 s barely turns the camera", (_name, forward, right) => {
    expect(Math.abs(turnDeg(holdStick(forward, right, 3)))).toBeLessThan(8);
  });

  it("an analog stick steers with a turn rate that fades out continuously (no cliff at the gate edge)", () => {
    const rate = new Map<number, number>();
    for (let a = 0; a <= 40; a += 0.5) rate.set(a, Math.abs(steadyRate(a)));
    for (let a = 0.5; a <= 40; a += 0.5) expect(Math.abs(rate.get(a)! - rate.get(a - 0.5)!)).toBeLessThan(3);
    expect(rate.get(20)!).toBeGreaterThan(10);  // 20° off still steers…
    expect(rate.get(24)!).toBeLessThan(8);      // …fading out across 20–26°…
    expect(rate.get(26)!).toBeLessThan(0.5);    // …and from 26° the camera holds still
    expect(rate.get(35)!).toBeLessThan(0.5);
    expect(Math.max(...rate.values())).toBeLessThan(30); // the peak stays a gentle curve
  });
});
