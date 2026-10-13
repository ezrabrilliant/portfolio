import { describe, expect, it } from "vitest";
import { positionAt, solveLaunch } from "@/world/engine/traversal/ballistic";

const G = 30;
const low = { x: 58.5, y: 11, z: -15.2 };
const high = { x: 78.1, y: 15, z: -13.4 };

function dist(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

describe("solveLaunch", () => {
  for (const [name, from, to] of [["up", low, high], ["down", high, low]] as const) {
    it(`lands on the target (${name})`, () => {
      const { vel, time } = solveLaunch(from, to, G, 3);
      expect(time).toBeGreaterThan(0);
      expect(dist(positionAt(from, vel, G, time), to)).toBeLessThan(0.1);
    });

    it(`peaks at the requested apex (${name})`, () => {
      const { vel } = solveLaunch(from, to, G, 3);
      const tPeak = vel.y / G;
      expect(positionAt(from, vel, G, tPeak).y).toBeCloseTo(Math.max(from.y, to.y) + 3, 6);
    });

    it(`lands within 0.1 block when integrated at 120 Hz (${name})`, () => {
      const { vel, time } = solveLaunch(from, to, G, 3);
      const p = { ...from }, v = { ...vel };
      const h = 1 / 120;
      const full = Math.floor(time / h);
      const advance = (dt: number) => {
        p.x += v.x * dt; p.z += v.z * dt;
        p.y += v.y * dt - 0.5 * G * dt * dt;
        v.y -= G * dt;
      };
      for (let i = 0; i < full; i++) advance(h);
      advance(time - full * h);                       // the frame on which the driver snaps to "landed"
      expect(dist(p, to)).toBeLessThan(0.1);
    });
  }

  it("keeps horizontal speed constant", () => {
    const { vel } = solveLaunch(low, high, G, 3);
    const a = positionAt(low, vel, G, 0.1), b = positionAt(low, vel, G, 0.2), c = positionAt(low, vel, G, 0.3);
    expect(b.x - a.x).toBeCloseTo(c.x - b.x, 9);
    expect(b.z - a.z).toBeCloseTo(c.z - b.z, 9);
  });
});
