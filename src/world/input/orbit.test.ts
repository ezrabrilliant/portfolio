import { describe, expect, it } from "vitest";
import { createOrbitAccumulator } from "./orbit";

describe("orbit accumulator", () => {
  it("accumulates drag and zoom and resets on take", () => {
    const acc = createOrbitAccumulator();
    acc.add(100, -40);
    acc.add(20, 0);
    acc.addZoom(120);
    const a = acc.take();
    expect(a.orbitX).toBeCloseTo(120 * 0.005, 6);
    expect(a.orbitY).toBeCloseTo(-40 * 0.005, 6);
    expect(a.zoom).toBeCloseTo(120 * 0.002, 6);
    expect(acc.take()).toEqual({ orbitX: 0, orbitY: 0, zoom: 0 });
  });
});
