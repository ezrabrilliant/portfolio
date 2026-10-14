import { describe, expect, it } from "vitest";
import {
  DAY_CAP,
  PRODUCT_PRICES,
  PULSE_SECONDS,
  SALE_GAP,
  SEED_DAYS,
  actCrm,
  autoCrm,
  busyCrm,
  chartMax,
  dayLabel,
  dueLabel,
  initCrm,
  pulsing,
  recordSale,
  toggleTask,
} from "./crm";

const NOW = new Date(2026, 9, 14, 10, 30, 0); // 14 Oct 2026, local time

describe("CRM seed state", () => {
  it("starts at the seed KPIs, the example series and three tasks", () => {
    const s = initCrm(NOW);
    expect([s.revenue, s.customers, s.transactions, s.promos]).toEqual([4781000, 3, 6, 2]);
    expect(s.days).toEqual(SEED_DAYS);
    expect(s.tasks.map((task) => task.done)).toEqual([false, false, true]);
    expect(busyCrm(s, 0)).toBe(false);
  });
});

describe("CRM sales", () => {
  it("a sale raises revenue, transactions and today's point by one product price, and pulses", () => {
    const s0 = initCrm(NOW);
    const s1 = actCrm(s0, "sale", undefined, 5);
    const price = s1.revenue - s0.revenue;
    expect(PRODUCT_PRICES).toContain(price);
    expect(s1.transactions).toBe(s0.transactions + 1);
    expect(s1.days[6]).toBe(s0.days[6] + price);
    expect(s1.days.slice(0, 6)).toEqual(s0.days.slice(0, 6));
    expect(s1.customers).toBe(s0.customers);
    expect(s1.promos).toBe(s0.promos);
    expect(busyCrm(s1, 5 + PULSE_SECONDS - 0.01)).toBe(true);
    expect(busyCrm(s1, 5 + PULSE_SECONDS)).toBe(false);
  });

  it("pulses for exactly PULSE_SECONDS after a sale, and is busy exactly while it pulses", () => {
    const s = recordSale(initCrm(NOW), 5);
    expect(pulsing(s, 5 + PULSE_SECONDS - 0.01)).toBe(true);
    expect(pulsing(s, 5 + PULSE_SECONDS)).toBe(false);
    expect(pulsing(initCrm(NOW), 0)).toBe(false);
    for (let f = 0; f < 120; f++) {
      const t = 4.9 + f / 60;
      expect(busyCrm(s, t)).toBe(pulsing(s, t));
    }
  });

  it("moves the series on a day when a sale would pass the cap; the new day starts with that sale", () => {
    const s0 = { ...initCrm(NOW), days: [1, 2, 3, 4, 5, 6, DAY_CAP - 100] };
    const s1 = recordSale(s0, 1);
    const price = s1.revenue - s0.revenue;
    expect(s1.days).toEqual([2, 3, 4, 5, 6, DAY_CAP - 100, price]);
  });

  it("a sale that brings today exactly to the cap stays on today", () => {
    const base = initCrm(NOW);
    const price = recordSale(base, 1).revenue - base.revenue;
    const s0 = { ...base, days: [1, 2, 3, 4, 5, 6, DAY_CAP - price] };
    expect(recordSale(s0, 1).days).toEqual([1, 2, 3, 4, 5, 6, DAY_CAP]);
  });

  it("picks the product deterministically from the seed, and each sale advances the seed", () => {
    const s0 = initCrm(NOW);
    const s1 = recordSale(s0, 1);
    expect(recordSale(initCrm(NOW), 1)).toEqual(s1);
    expect(s1.seed).not.toBe(s0.seed);
    const prices = new Set<number>();
    let s = s0;
    for (let i = 0; i < 10; i++) {
      const n = recordSale(s, i);
      prices.add(n.revenue - s.revenue);
      s = n;
    }
    expect(prices.size).toBeGreaterThan(1);
  });

  it("the idle demo waits SALE_GAP before its first sale, so the seed KPIs show first", () => {
    const s0 = initCrm(NOW);
    expect(s0.next).toBe(SALE_GAP);
    expect(autoCrm(s0, 0)).toBeNull();
    expect(autoCrm(s0, SALE_GAP - 0.01)).toBeNull();
  });

  it("the idle demo records a sale every SALE_GAP seconds", () => {
    const s0 = initCrm(NOW);
    const s1 = autoCrm(s0, SALE_GAP);
    if (!s1) throw new Error("no demo step");
    expect(s1.transactions).toBe(s0.transactions + 1);
    expect(s1.next).toBe(2 * SALE_GAP);
    expect(autoCrm(s1, 2 * SALE_GAP - 0.01)).toBeNull();
    expect(autoCrm(s1, 2 * SALE_GAP)?.transactions).toBe(s0.transactions + 2);
  });

  it("the chart's top grows in Rp 500,000 steps and is at least Rp 1,500,000", () => {
    expect(chartMax(SEED_DAYS)).toBe(1500000);
    expect(chartMax([0, 0, 0, 0, 0, 0, 3600000])).toBe(4000000);
  });
});

describe("CRM tasks", () => {
  it("a tap toggles a task between Pending and Completed", () => {
    const s0 = initCrm(NOW);
    const s1 = actCrm(s0, "task", 0, 1);
    expect(s1.tasks[0].done).toBe(true);
    expect(toggleTask(s1, 0).tasks[0].done).toBe(false);
    expect(s1.tasks.slice(1)).toEqual(s0.tasks.slice(1));
  });

  it("ignores unknown task indices", () => {
    const s = initCrm(NOW);
    expect(toggleTask(s, 3)).toBe(s);
    expect(toggleTask(s, -1)).toBe(s);
    expect(toggleTask(s, 1.5)).toBe(s);
    expect(actCrm(s, "task", undefined, 1)).toBe(s);
  });
});

describe("CRM dates from the injected now", () => {
  it("labels the seven days YYYY-MM-DD, ending today", () => {
    const s = initCrm(NOW);
    expect(dayLabel(s, 6)).toBe("2026-10-14");
    expect(dayLabel(s, 0)).toBe("2026-10-08");
  });

  it("crosses month boundaries", () => {
    expect(dayLabel(initCrm(new Date(2026, 2, 2, 9)), 0)).toBe("2026-02-24");
  });

  it("writes due dates as 'Mon DD, YYYY' relative to today", () => {
    const s = initCrm(NOW);
    expect(s.tasks.map((task) => dueLabel(s, task))).toEqual(["Oct 14, 2026", "Oct 16, 2026", "Oct 07, 2026"]);
  });
});
