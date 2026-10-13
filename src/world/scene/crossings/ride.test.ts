import { describe, expect, it } from "vitest";
import { createCharacter } from "@/world/engine/physics/character";
import { solveLaunch } from "@/world/engine/traversal/ballistic";
import { buildRail, railPoint } from "@/world/engine/traversal/rail";
import type { Ride } from "@/world/state/runtime";
import { advanceRide } from "./ride";

describe("advanceRide", () => {
  it("follows a bounce arc and lands exactly on the target", () => {
    const from = { x: 0, y: 3, z: 0 };
    const to = { x: 10, y: 7, z: 2 };
    const { vel, time } = solveLaunch(from, to, 30, 3);
    const ride: Ride = { kind: "arc", t: 0, from, to, vel, time };
    const p = createCharacter({ ...from });
    let done = false;
    let peak = -Infinity;
    for (let i = 0; i < 400 && !done; i++) {
      done = advanceRide(ride, p, 1 / 60);
      peak = Math.max(peak, p.pos.y);
    }
    expect(done).toBe(true);
    expect(p.pos).toEqual(to);
    expect(peak).toBeGreaterThan(to.y + 2);
  });

  it("rides a rail to its exit, and starts at the far end when reversed", () => {
    const rail = buildRail({ x: 0, y: 5, z: 0 }, { x: 20, y: 12, z: -6 }, 3);
    const exit = { x: 22, y: 12, z: -6 };
    const fwd: Ride = { kind: "rail", t: 0, duration: 4, rail, reverse: false, exit, exitHeading: 1 };
    const p = createCharacter({ x: 0, y: 5, z: 0 });
    advanceRide(fwd, p, 0.001);
    expect(p.pos.x).toBeLessThan(1);
    let done = false;
    for (let i = 0; i < 600 && !done; i++) done = advanceRide(fwd, p, 1 / 60);
    expect(done).toBe(true);
    expect(p.pos).toEqual(exit);

    const rev: Ride = { kind: "rail", t: 0, duration: 4, rail, reverse: true, exit: { x: -2, y: 5, z: 0 }, exitHeading: 0 };
    const q = createCharacter({ x: 20, y: 12, z: -6 });
    advanceRide(rev, q, 0.001);
    const end = railPoint(rail, 1);
    expect(Math.hypot(q.pos.x - end.x, q.pos.z - end.z)).toBeLessThan(1);
  });

  it("hops Ezra out of the cart: after the rail the ride continues as a short arc from his seat to the exit", () => {
    const rail = buildRail({ x: 0, y: 5.3, z: 0 }, { x: 20, y: 12.3, z: -6 }, 3);
    const exit = { x: 21, y: 12, z: -7 };
    const ride: Ride = { kind: "rail", t: 0, duration: 4, rail, reverse: false, exit, exitHeading: 1 };
    const p = createCharacter({ x: 0, y: 5.65, z: 0 });
    let t = 0;
    while (t < 4 - 1e-9) {
      advanceRide(ride, p, 1 / 60);
      t += 1 / 60;
    }
    // still seated at the end of the rail, then airborne on the way to the exit
    advanceRide(ride, p, 0.02);
    expect(ride.kind).toBe("arc");
    expect(p.onGround).toBe(false);
    const seat = railPoint(rail, 1);
    expect(Math.hypot(p.pos.x - seat.x, p.pos.z - seat.z)).toBeLessThan(0.2);
    let peak = p.pos.y;
    let done = false;
    let hop = 0.02;
    while (!done && hop < 2) {
      done = advanceRide(ride, p, 1 / 60);
      hop += 1 / 60;
      peak = Math.max(peak, p.pos.y);
    }
    expect(done).toBe(true);
    expect(p.pos).toEqual(exit);
    expect(peak).toBeGreaterThan(seat.y + 0.35); // a visible hop up out of the cart
    expect(hop).toBeLessThan(0.7); // short
  });

  it("reports the arc's vertical speed and leaves the ground during a bounce (so Ezra plays jump, then fall)", () => {
    const from = { x: 0, y: 3, z: 0 };
    const to = { x: 10, y: 7, z: 2 };
    const { vel, time } = solveLaunch(from, to, 30, 3);
    const ride: Ride = { kind: "arc", t: 0, from, to, vel, time };
    const p = createCharacter({ ...from });
    advanceRide(ride, p, 0.05);
    expect(p.onGround).toBe(false);
    expect(p.vel.y).toBeGreaterThan(0);
    advanceRide(ride, p, time - 0.1);
    expect(p.vel.y).toBeLessThan(0);
  });
});
