import { afterEach, describe, expect, it, vi } from "vitest";
import { createParticlePool } from "@/world/engine/particles/particles";
import type { ParticlePreset } from "@/world/engine/particles/particles";
import { PRESET_COUNTS, reducedCount, withFewerParticles } from "./fewerParticles";

const AT = { x: 0, y: 0, z: 0 };

describe("withFewerParticles (prefers-reduced-motion)", () => {
  it("knows the engine's default burst size of every preset", () => {
    for (const preset of Object.keys(PRESET_COUNTS) as ParticlePreset[]) {
      const pool = createParticlePool(1000);
      pool.burst(AT, preset);
      expect(pool.alive, preset).toBe(PRESET_COUNTS[preset]);
    }
  });

  it("keeps a third of each burst, never less than one particle", () => {
    expect(reducedCount(40)).toBe(13);
    expect(reducedCount(14)).toBe(5);
    expect(reducedCount(6)).toBe(2);
    expect(reducedCount(3)).toBe(1);
    expect(reducedCount(1)).toBe(1);
    expect(reducedCount(0)).toBe(0);
  });

  it("scales default and explicit counts on the same pool object", () => {
    const pool = createParticlePool(240);
    const fewer = withFewerParticles(pool);
    expect(fewer).toBe(pool); // the renderer and every caller keep using runtime.particles as before
    fewer.burst(AT, "confetti");
    expect(pool.alive).toBe(13);
    fewer.burst(AT, "dust", { count: 14 });
    expect(pool.alive).toBe(13 + 5);
    fewer.burst(AT, "dust", { count: 3 });
    expect(pool.alive).toBe(13 + 5 + 1);
  });

  it("still passes the colour through", () => {
    const pool = withFewerParticles(createParticlePool(10));
    pool.burst(AT, "sparkle", { color: "#ff0000" });
    expect(pool.alive).toBe(2);
    expect(pool.colors[0]).toBeCloseTo(1, 5);
    expect(pool.colors[1]).toBeCloseTo(0, 5);
    expect(pool.colors[2]).toBeCloseTo(0, 5);
  });
});

describe("runtime.particles", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function runtimeWith(reduce: boolean) {
    vi.resetModules();
    vi.stubGlobal("window", { matchMedia: () => ({ matches: reduce }) });
    return (await import("./runtime")).runtime;
  }

  it("is the full pool with full bursts normally", async () => {
    const runtime = await runtimeWith(false);
    expect(runtime.particles.capacity).toBe(800);
    runtime.particles.burst(AT, "debris");
    expect(runtime.particles.alive).toBe(14);
  });

  it("is a smaller pool with third-size bursts under reduced motion", async () => {
    const runtime = await runtimeWith(true);
    expect(runtime.particles.capacity).toBe(240);
    runtime.particles.burst(AT, "debris");
    expect(runtime.particles.alive).toBe(5);
  });
});
