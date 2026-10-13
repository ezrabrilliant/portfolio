import { describe, expect, it } from "vitest";
import { hexToRgb } from "@/world/engine/color";
import { mulberry32 } from "@/world/engine/gen/rng";
import { createParticlePool } from "@/world/engine/particles/particles";

const at = { x: 1, y: 5, z: -2 };

function meanY(pool: ReturnType<typeof createParticlePool>) {
  let s = 0;
  for (let i = 0; i < pool.alive; i++) s += pool.positions[i * 3 + 1];
  return s / pool.alive;
}

describe("particle pool", () => {
  it("allocates arrays for its capacity", () => {
    const p = createParticlePool(100);
    expect(p.capacity).toBe(100);
    expect(p.positions.length).toBe(300);
    expect(p.scales.length).toBe(100);
    expect(p.colors.length).toBe(300);
    expect(p.alive).toBe(0);
    expect(createParticlePool().capacity).toBe(800);
  });

  it("bursts the preset count, or an override", () => {
    const p = createParticlePool(100);
    p.burst(at, "dust");
    expect(p.alive).toBe(6);
    p.burst(at, "debris", { count: 3 });
    expect(p.alive).toBe(9);
    expect(p.positions[0]).toBe(1);
    expect(p.positions[1]).toBe(5);
  });

  it("never exceeds capacity", () => {
    const p = createParticlePool(50);
    p.burst(at, "confetti", { count: 1000 });
    expect(p.alive).toBe(50);
  });

  it("pulls debris down under gravity", () => {
    const p = createParticlePool(100, mulberry32(3));
    p.burst(at, "debris");
    for (let i = 0; i < 15; i++) p.step(1 / 60);
    const early = meanY(p);
    for (let i = 0; i < 15; i++) p.step(1 / 60);
    expect(meanY(p)).toBeLessThan(early);
  });

  it("fades particles out and then recycles their slots", () => {
    const p = createParticlePool(10);
    p.burst(at, "sparkle", { count: 1 });
    const s0 = p.scales[0];
    let smallest = s0;
    while (p.alive > 0) {
      p.step(0.01);
      if (p.alive > 0) smallest = Math.min(smallest, p.scales[0]);
    }
    expect(smallest).toBeLessThan(s0 * 0.5);
    expect(p.scales[0]).toBe(0);
    p.burst(at, "dust");
    expect(p.alive).toBe(6);
  });

  it("applies a colour override", () => {
    const p = createParticlePool(10);
    p.burst(at, "confetti", { count: 2, color: "#3D62F8" });
    expect(Array.from(p.colors.slice(0, 3))).toEqual(hexToRgb("#3D62F8").map((v) => Math.fround(v)));
  });

  it("is deterministic for a seed", () => {
    const a = createParticlePool(50, mulberry32(9)), b = createParticlePool(50, mulberry32(9));
    a.burst(at, "leaves"); b.burst(at, "leaves");
    a.step(0.2); b.step(0.2);
    expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
  });
});
