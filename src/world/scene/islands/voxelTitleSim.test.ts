import { describe, expect, it } from "vitest";
import { mulberry32 } from "@/world/engine/gen/rng";
import { GTID, HERO } from "./layouts";
import { layoutLines } from "./voxelFont";
import { SQUASH, createTitleSim, scatterTitle, squashTitle, stepTitle } from "./voxelTitleSim";

const TITLES = [HERO.title, GTID.title];
const SEEDS = [1, 2, 3, 4];

function punched(title: { lines: readonly string[]; cell: number }, seed: number) {
  const sim = createTitleSim(layoutLines(title.lines).cells, title.cell);
  scatterTitle(sim, mulberry32(seed));
  return sim;
}

/** Steps a punched title at `dt` until it is back at rest, calling `look` after every step. */
function run(sim: ReturnType<typeof createTitleSim>, dt: number, floor: number, look: (frame: number) => void) {
  let frame = 0;
  while (sim.phase !== "rest" && frame < 2000) {
    stepTitle(sim, dt, floor);
    look(frame++);
  }
  return frame;
}

describe("voxel title punch", () => {
  it("sends every block up and out of the front (+z), the side kept clear of props", () => {
    const sim = punched(HERO.title, 1);
    expect(sim.phase).toBe("scatter");
    for (let i = 0; i < sim.count; i++) {
      expect(sim.vel[i * 3 + 1]).toBeGreaterThan(0);
      expect(sim.vel[i * 3 + 2]).toBeGreaterThan(0);
    }
  });

  for (const title of TITLES) {
    for (const seed of SEEDS) {
      it(`${title.lines.join(" ")} (seed ${seed}) at 60 fps: lands, never hangs in the air, and is whole again by 2.2 s`, () => {
        const sim = punched(title, seed);
        const floor = title.cell / 2;
        const dt = 1 / 60;
        const n = sim.count;
        const prev = new Float32Array(n * 3);
        const speed = new Float32Array(n);
        const wasAirborne = new Uint8Array(n);
        const launched = new Uint8Array(n);
        let hangs = 0;
        let airLaunches = 0;
        let belowFloor = 0;
        for (let i = 0; i < n; i++) prev.set([sim.restX[i], sim.restY[i], 0], i * 3);

        const frames = run(sim, dt, floor, () => {
          for (let i = 0; i < n; i++) {
            const j = i * 3;
            const x = sim.restX[i] + sim.off[j];
            const y = sim.restY[i] + sim.off[j + 1];
            const z = sim.off[j + 2];
            const v = Math.hypot(x - prev[j], y - prev[j + 1], z - prev[j + 2]) / dt;
            const home = sim.launch[i] === Infinity || sim.phase === "rest";
            const airborne = !home && y - floor > 1e-3;
            if (y < floor - 1e-5) belowFloor++;
            // a block in the air never stops dead: no stall, no sudden drop to a crawl
            if (airborne && wasAirborne[i] && (v < 1e-3 || (speed[i] > 0.5 && v < 0.25 * speed[i]))) hangs++;
            if (!launched[i] && sim.launch[i] >= 0) {
              launched[i] = 1;
              if (!sim.grounded[i]) airLaunches++;
            }
            prev.set([x, y, z], j);
            speed[i] = v;
            wasAirborne[i] = airborne ? 1 : 0;
          }
        });

        expect(belowFloor).toBe(0);
        expect(hangs).toBe(0);
        expect(airLaunches).toBe(0); // every block lands before it flies home
        expect(sim.phase).toBe("rest");
        expect(frames * dt).toBeLessThanOrEqual(2.2);
        expect(sim.off.every((v) => v === 0)).toBe(true);
        expect(sim.ang.every((v) => v === 0)).toBe(true);
      });
    }
  }

  it("stays above the grass and comes home on long frames too (dt clamped to 0.1 s)", () => {
    const sim = punched(GTID.title, 7);
    const floor = GTID.title.cell / 2;
    let low = Infinity;
    run(sim, 0.1, floor, () => {
      for (let i = 0; i < sim.count; i++) low = Math.min(low, sim.restY[i] + sim.off[i * 3 + 1]);
    });
    expect(sim.phase).toBe("rest");
    expect(low).toBeGreaterThanOrEqual(floor - 1e-5);
  });

  it("reduced motion: squashes once without moving a block, then rests at full height", () => {
    const sim = createTitleSim(layoutLines(HERO.title.lines).cells, HERO.title.cell);
    squashTitle(sim);
    let lowest = 1;
    run(sim, 1 / 60, HERO.title.cell / 2, () => {
      lowest = Math.min(lowest, sim.scaleY);
      expect(sim.off.every((v) => v === 0)).toBe(true);
    });
    expect(lowest).toBeLessThan(0.85);
    expect(sim.phase).toBe("rest");
    expect(sim.scaleY).toBe(1);
    expect(sim.t).toBeGreaterThanOrEqual(SQUASH);
  });
});
