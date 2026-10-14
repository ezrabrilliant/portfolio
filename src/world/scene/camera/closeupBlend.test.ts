import { describe, expect, it } from "vitest";
import { CLOSEUP_GLIDE, closeupWeight } from "@/world/engine/camera/closeup";
import { stepTravel } from "../travel";
import { EZRA_HIDE_WEIGHT, closeupHidesEzra, stepBlendClock, travelCutsCloseup } from "./closeupBlend";
import type { BlendClock } from "./closeupBlend";

const DT = 1 / 60;
const board = new Set(["map-web-plaza"]);
const open = { id: "map-web-plaza" };
const clock = (): BlendClock => ({ k: 0, id: null });

describe("stepBlendClock (CloseupCamera's blend)", () => {
  it("glides in over CLOSEUP_GLIDE and back out from the last target after the close", () => {
    const c = clock();
    let w = 0;
    for (let i = 0; i < Math.round(CLOSEUP_GLIDE / DT); i++) w = stepBlendClock(c, open, board, null, DT, false);
    expect(w).toBeCloseTo(1, 9);
    expect(c.id).toBe("map-web-plaza");
    // closed: it keeps framing the board while the weight eases back down
    w = stepBlendClock(c, null, board, null, DT, false);
    expect(c.id).toBe("map-web-plaza");
    expect(w).toBeGreaterThan(0.99);
    for (let i = 0; i < Math.round(CLOSEUP_GLIDE / DT) + 1; i++) w = stepBlendClock(c, null, board, null, DT, false);
    expect(w).toBe(0);
    expect(c).toEqual({ k: 0, id: null });
  });

  it("returns the eased weight of its clock", () => {
    const c = clock();
    const w = stepBlendClock(c, open, board, null, CLOSEUP_GLIDE / 2, false);
    expect(c.k).toBeCloseTo(0.5, 9);
    expect(w).toBeCloseTo(closeupWeight(0.5), 9);
  });

  it("cuts to 0 when the target unmounts mid-glide", () => {
    const c = { k: 0.6, id: "map-web-plaza" };
    expect(stepBlendClock(c, null, new Set<string>(), null, DT, false)).toBe(0);
    expect(c).toEqual({ k: 0, id: null });
  });

  it("a Play fast travel: the glide out runs during the puff away, and the arrival cuts it to 0 (no swing back to the departure board)", () => {
    // the map board is fully open, Enter travels: startTravel closes the closeup and starts runtime.travel
    const c = { k: 1, id: "map-web-plaza" };
    const tr = { phase: "out" as "out" | "in", t: 0 };
    const weights: { event: string | null; phase: string; w: number }[] = [];
    for (let i = 0; i < 60; i++) {
      const event = stepTravel(tr, DT); // PlayerController runs before CloseupCamera in the same frame
      weights.push({ event, phase: tr.phase, w: stepBlendClock(c, null, board, event === "done" ? null : tr, DT, false) });
      if (event === "done") break;
    }
    const arrive = weights.findIndex((s) => s.event === "arrive");
    expect(arrive).toBeGreaterThan(0);
    // still gliding out on the departure island, the frame before the move
    expect(weights[arrive - 1].w).toBeGreaterThan(0.5);
    // the arrival frame and every frame after it: the follow camera at the destination, unblended
    for (const s of weights.slice(arrive)) expect(s.w).toBe(0);
    expect(c).toEqual({ k: 0, id: null });
    // and after the travel ends nothing glides back in
    expect(stepBlendClock(c, null, board, null, DT, false)).toBe(0);
  });

  it("reduced motion: the close already cuts, and the arrival keeps it cut", () => {
    const c = { k: 1, id: "map-web-plaza" };
    expect(stepBlendClock(c, null, board, { phase: "out" }, DT, true)).toBe(0);
    expect(stepBlendClock(c, null, board, { phase: "in" }, DT, true)).toBe(0);
    expect(c).toEqual({ k: 0, id: null });
  });

  it("a closeup open during the arrival stays at 0 until the travel ends, then glides in", () => {
    const c = clock();
    expect(stepBlendClock(c, open, board, { phase: "in" }, DT, false)).toBe(0);
    expect(stepBlendClock(c, open, board, null, DT, false)).toBeGreaterThan(0);
  });

  it("the puff-away phase alone does not cut (the fade hides the departure island's glide)", () => {
    const c = { k: 1, id: "map-web-plaza" };
    expect(stepBlendClock(c, null, board, { phase: "out" }, DT, false)).toBeGreaterThan(0.99);
  });
});

describe("travelCutsCloseup", () => {
  it("cuts from a fast travel's arrival on (its in phase), not during the puff away or without a travel", () => {
    expect(travelCutsCloseup(null)).toBe(false);
    expect(travelCutsCloseup({ phase: "out" })).toBe(false);
    expect(travelCutsCloseup({ phase: "in" })).toBe(true);
  });
});

describe("closeupHidesEzra", () => {
  it("hides him only past the blend's half way, on the way in and on the way out", () => {
    expect(closeupHidesEzra(0)).toBe(false);
    expect(closeupHidesEzra(EZRA_HIDE_WEIGHT)).toBe(false);
    expect(closeupHidesEzra(EZRA_HIDE_WEIGHT + 0.01)).toBe(true);
    expect(closeupHidesEzra(1)).toBe(true);
  });

  it("the first frames of the glide in still show him, and he is back before the glide out lands", () => {
    const c = clock();
    const vis: boolean[] = [];
    for (let i = 0; i < Math.round(CLOSEUP_GLIDE / DT); i++) vis.push(!closeupHidesEzra(stepBlendClock(c, open, board, null, DT, false)));
    expect(vis[0]).toBe(true);
    expect(vis[vis.length - 1]).toBe(false);
    // one switch: shown, then hidden
    expect(vis.filter((v, i) => i > 0 && v !== vis[i - 1]).length).toBe(1);
    const out: boolean[] = [];
    for (let i = 0; i < Math.round(CLOSEUP_GLIDE / DT) + 1; i++) out.push(!closeupHidesEzra(stepBlendClock(c, null, board, null, DT, false)));
    expect(out[0]).toBe(false);
    expect(out[out.length - 1]).toBe(true);
    expect(out.filter((v, i) => i > 0 && v !== out[i - 1]).length).toBe(1);
  });
});
