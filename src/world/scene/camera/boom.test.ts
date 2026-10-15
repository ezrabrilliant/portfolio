import { describe, expect, it } from "vitest";
import { BOOM, createBoom, probeDistance, stepBoom } from "./boom";

const wall = (x: number, y: number, z: number) => z === 4 && y >= 0 && y < 10 && x >= -5 && x < 5;

describe("probeDistance", () => {
  it("is the full length when nothing blocks", () => {
    expect(probeDistance({ x: 0.5, y: 2.5, z: 0.5 }, { x: 0.5, y: 2.5, z: 8.5 }, () => false)).toBeCloseTo(8, 6);
  });

  it("stops before a wall like pullIn", () => {
    expect(probeDistance({ x: 0.5, y: 2.5, z: 0.6 }, { x: 0.5, y: 2.5, z: 9.5 }, wall)).toBeCloseTo(3.15, 2);
  });

  it("sees a block edge the centre ray just misses", () => {
    // a one-block post whose edge sits 0.1 beside the centre ray
    const post = (x: number, y: number, z: number) => x === 1 && z === 4 && y >= 0 && y < 5;
    const d = probeDistance({ x: 0.9, y: 2.5, z: 0.5 }, { x: 0.9, y: 2.5, z: 9.5 }, post);
    expect(d).toBeLessThan(4);
  });

  it("ignores an outer ray that starts inside a block (Ezra against a wall)", () => {
    const side = (x: number, y: number) => x === 1 && y >= 0 && y < 9;
    expect(probeDistance({ x: 0.85, y: 2.5, z: 0.5 }, { x: 0.85, y: 2.5, z: 8.5 }, side)).toBeCloseTo(8, 6);
  });
});

describe("stepBoom", () => {
  it("pulls in eased, never more than the slack past the limit", () => {
    const b = createBoom(7);
    const first = stepBoom(b, 3, 1 / 60);
    expect(first).toBeLessThanOrEqual(3 + BOOM.slack + 1e-9);
    stepBoom(b, 3, 1 / 60);
    for (let i = 0; i < 30; i++) stepBoom(b, 3, 1 / 60);
    expect(b.length).toBeCloseTo(3, 2);
  });

  it("eases small pull-ins over several frames instead of snapping", () => {
    const b = createBoom(7);
    expect(stepBoom(b, 6.9, 1 / 60)).toBeGreaterThan(6.92);
  });

  it("lets out only after the limit has stayed longer for the hold time", () => {
    const b = createBoom(3);
    for (let i = 0; i < 12; i++) stepBoom(b, 7, 1 / 60); // 0.2 s
    expect(b.length).toBe(3);
    for (let i = 0; i < 6; i++) stepBoom(b, 7, 1 / 60);
    expect(b.length).toBeGreaterThan(3);
    expect(b.length).toBeLessThan(3 + 6 * BOOM.outMax / 60);
  });

  it("does not pump when the limit flickers between two lengths", () => {
    const b = createBoom(5);
    const seen: number[] = [];
    for (let i = 0; i < 240; i++) seen.push(stepBoom(b, i % 6 < 3 ? 3 : 5, 1 / 60));
    const tail = seen.slice(60);
    expect(Math.max(...tail) - Math.min(...tail)).toBeLessThan(BOOM.slack + 0.01);
  });

  it("cuts straight to the limit", () => {
    const b = createBoom(7);
    expect(stepBoom(b, 2, 1 / 60, true)).toBe(2);
  });
});
