import { describe, expect, it } from "vitest";
import { mulberry32 } from "@/world/engine/gen/rng";
import { stepRandom } from "./random";

describe("stepRandom", () => {
  it("continues the mulberry32 sequence one draw at a time", () => {
    const r = mulberry32(42);
    const expected = [r(), r(), r()];
    let seed = 42;
    const got: number[] = [];
    for (let i = 0; i < 3; i++) {
      const step = stepRandom(seed);
      got.push(step.value);
      seed = step.seed;
    }
    expect(got).toEqual(expected);
  });

  it("is deterministic and stays in [0, 1)", () => {
    expect(stepRandom(7)).toEqual(stepRandom(7));
    let seed = 1;
    for (let i = 0; i < 200; i++) {
      const step = stepRandom(seed);
      expect(step.value).toBeGreaterThanOrEqual(0);
      expect(step.value).toBeLessThan(1);
      seed = step.seed;
    }
  });
});
