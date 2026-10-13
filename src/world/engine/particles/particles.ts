import { hexToRgb } from "@/world/engine/color";
import { mulberry32, type Rng } from "@/world/engine/gen/rng";
import type { Vec3 } from "@/world/engine/types";

export type ParticlePreset = "debris" | "dust" | "confetti" | "leaves" | "sparkle";

export interface ParticlePool {
  readonly capacity: number;
  alive: number;
  positions: Float32Array;
  scales: Float32Array;
  colors: Float32Array;
  burst(at: Vec3, preset: ParticlePreset, opts?: { color?: string; count?: number }): void;
  step(dt: number): void;
}

interface Preset {
  count: number; speed: [number, number]; up: [number, number]; life: [number, number];
  size: [number, number]; gravity: number; drag: number; colors: string[];
}

const PRESETS: Record<ParticlePreset, Preset> = {
  debris: { count: 14, speed: [2.5, 5], up: [3, 6], life: [0.6, 1.0], size: [0.12, 0.22], gravity: 22, drag: 0.6, colors: ["#94714f", "#8a6849"] },
  dust: { count: 6, speed: [0.4, 1.2], up: [0.3, 1.0], life: [0.35, 0.6], size: [0.08, 0.16], gravity: -0.5, drag: 2.5, colors: ["#d8cfbf", "#cfc4b0"] },
  confetti: { count: 40, speed: [3, 6], up: [5, 8], life: [1.2, 2.0], size: [0.08, 0.14], gravity: 9, drag: 1.2, colors: ["#3D62F8", "#FA5D19", "#ffffff", "#8ea769", "#f2c14e"] },
  leaves: { count: 8, speed: [0.5, 1.5], up: [0.2, 0.8], life: [1.4, 2.2], size: [0.1, 0.16], gravity: 2.5, drag: 1.8, colors: ["#6e8e57", "#7a9862", "#82a068"] },
  sparkle: { count: 5, speed: [0.2, 0.6], up: [0.2, 0.6], life: [0.5, 0.9], size: [0.05, 0.09], gravity: -0.3, drag: 1.0, colors: ["#bfe3ff", "#ffffff"] },
};

export function createParticlePool(capacity = 800, rng: Rng = mulberry32(7)): ParticlePool {
  const positions = new Float32Array(capacity * 3);
  const velocities = new Float32Array(capacity * 3);
  const scales = new Float32Array(capacity);
  const colors = new Float32Array(capacity * 3);
  const life = new Float32Array(capacity);
  const maxLife = new Float32Array(capacity);
  const base = new Float32Array(capacity);
  const grav = new Float32Array(capacity);
  const drag = new Float32Array(capacity);
  let cursor = 0;

  const range = (r: [number, number]) => r[0] + (r[1] - r[0]) * rng();

  function move(from: number, to: number) {
    for (let k = 0; k < 3; k++) {
      positions[to * 3 + k] = positions[from * 3 + k];
      velocities[to * 3 + k] = velocities[from * 3 + k];
      colors[to * 3 + k] = colors[from * 3 + k];
    }
    scales[to] = scales[from]; life[to] = life[from]; maxLife[to] = maxLife[from];
    base[to] = base[from]; grav[to] = grav[from]; drag[to] = drag[from];
  }

  const pool: ParticlePool = {
    capacity,
    alive: 0,
    positions,
    scales,
    colors,
    burst(at, preset, opts = {}) {
      const P = PRESETS[preset];
      const n = opts.count ?? P.count;
      const palette = opts.color ? [opts.color] : P.colors;
      for (let k = 0; k < n; k++) {
        let i: number;
        if (pool.alive < capacity) i = pool.alive++;
        else { i = cursor; cursor = (cursor + 1) % capacity; }
        const a = rng() * Math.PI * 2;
        const sp = range(P.speed);
        positions[i * 3] = at.x; positions[i * 3 + 1] = at.y; positions[i * 3 + 2] = at.z;
        velocities[i * 3] = Math.cos(a) * sp;
        velocities[i * 3 + 1] = range(P.up);
        velocities[i * 3 + 2] = Math.sin(a) * sp;
        const L = range(P.life);
        life[i] = L; maxLife[i] = L;
        base[i] = range(P.size); scales[i] = base[i];
        grav[i] = P.gravity; drag[i] = P.drag;
        const [r, g, b] = hexToRgb(palette[Math.floor(rng() * palette.length)]);
        colors[i * 3] = r; colors[i * 3 + 1] = g; colors[i * 3 + 2] = b;
      }
    },
    step(dt) {
      let i = 0;
      while (i < pool.alive) {
        life[i] -= dt;
        if (life[i] <= 0) {
          const last = --pool.alive;
          if (i !== last) move(last, i);
          scales[last] = 0;
          continue;
        }
        const damp = Math.exp(-drag[i] * dt);
        velocities[i * 3 + 1] -= grav[i] * dt;
        velocities[i * 3] *= damp; velocities[i * 3 + 1] *= damp; velocities[i * 3 + 2] *= damp;
        positions[i * 3] += velocities[i * 3] * dt;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;
        scales[i] = base[i] * Math.min(1, life[i] / (maxLife[i] * 0.4));
        i++;
      }
    },
  };
  return pool;
}
