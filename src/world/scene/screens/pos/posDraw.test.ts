import { describe, expect, it, vi } from "vitest";
import { FakeImage, fakeCtx } from "../testing/fakeCtx";
import { addItem, initPos, payOrder } from "./pos";
import { posApp } from "./index";

vi.stubGlobal("Image", FakeImage);

const NOW = new Date(2026, 9, 14, 9, 0, 0);

describe("posApp", () => {
  it("is a 640 × 400 landscape screen", () => {
    expect(posApp.logical).toEqual({ w: 640, h: 400 });
  });

  it("draws a region per menu card, per table and for Pay, all inside the screen", () => {
    const regions = posApp.draw(fakeCtx(), initPos(NOW), 0);
    expect(regions.filter((r) => r.action === "add").map((r) => r.arg)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(regions.filter((r) => r.action === "table").map((r) => r.arg)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(regions.filter((r) => r.action === "pay")).toHaveLength(1);
    for (const r of regions) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(640);
      expect(r.y + r.h).toBeLessThanOrEqual(400);
    }
  });

  it("draws an open order and the payment confirmation without throwing", () => {
    const order = addItem(addItem(initPos(NOW), 0), 5);
    expect(() => posApp.draw(fakeCtx(), order, 1)).not.toThrow();
    expect(() => posApp.draw(fakeCtx(), payOrder(order, 1), 1.5)).not.toThrow();
  });

  it("a tap on a drawn card adds that item", () => {
    const s0 = initPos(NOW);
    const card = posApp.draw(fakeCtx(), s0, 0).find((r) => r.action === "add" && r.arg === 3);
    if (!card) throw new Error("no card region for item 3");
    expect(posApp.act(s0, card.action, card.arg, 0).lines).toEqual([{ item: 3, qty: 1 }]);
  });
});
