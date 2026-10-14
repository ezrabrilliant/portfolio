import { describe, expect, it } from "vitest";
import { fakeCtx } from "../testing/fakeCtx";
import { initCrm, recordSale, toggleTask } from "./crm";
import { crmApp } from "./index";

const NOW = new Date(2026, 9, 14, 10, 30, 0);

describe("crmApp", () => {
  it("is a 640 × 400 landscape screen", () => {
    expect(crmApp.logical).toEqual({ w: 640, h: 400 });
  });

  it("draws the chart card as the sale region and one region per task, all inside the screen", () => {
    const regions = crmApp.draw(fakeCtx(), initCrm(NOW), 0);
    expect(regions.filter((r) => r.action === "sale")).toHaveLength(1);
    expect(regions.filter((r) => r.action === "task").map((r) => r.arg)).toEqual([0, 1, 2]);
    for (const r of regions) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(640);
      expect(r.y + r.h).toBeLessThanOrEqual(400);
    }
  });

  it("draws the pulse after a sale and a toggled task without throwing", () => {
    const s = toggleTask(recordSale(initCrm(NOW), 2), 1);
    expect(() => crmApp.draw(fakeCtx(), s, 2.5)).not.toThrow();
  });
});
