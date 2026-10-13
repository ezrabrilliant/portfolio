import type { ParticlePool, ParticlePreset } from "@/world/engine/particles/particles";

type BurstOpts = NonNullable<Parameters<ParticlePool["burst"]>[2]>;

/** The engine presets' default burst sizes (fewerParticles.test.ts pins these to the engine). */
export const PRESET_COUNTS: Record<ParticlePreset, number> = { debris: 14, dust: 6, confetti: 40, leaves: 8, sparkle: 5 };

/** Under prefers-reduced-motion a burst keeps a third of its particles, at least one so the feedback stays. */
export function reducedCount(n: number): number {
  return n <= 0 ? 0 : Math.max(1, Math.round(n / 3));
}

const wrapped = new WeakSet<ParticlePool>();

/**
 * Makes every burst on `pool` emit `reducedCount` particles. The pool object, its contract and its callers stay the
 * same (the renderer reads `alive`/`positions` from this very object), so callers need no reduced-motion checks.
 * Every other burst option passes through untouched. Wrapping the same pool twice is a no-op.
 */
export function withFewerParticles(pool: ParticlePool): ParticlePool {
  if (wrapped.has(pool)) return pool;
  wrapped.add(pool);
  const burst = pool.burst;
  pool.burst = (at, preset, o?: BurstOpts) => {
    burst(at, preset, { ...o, count: reducedCount(o?.count ?? PRESET_COUNTS[preset]) });
  };
  return pool;
}
