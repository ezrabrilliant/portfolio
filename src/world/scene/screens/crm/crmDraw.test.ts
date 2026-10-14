import { describe, expect, it } from "vitest";
import { formatRupiah } from "../format";
import { fakeCtx } from "../testing/fakeCtx";
import { PULSE_SECONDS, initCrm, pulsing, recordSale, toggleTask } from "./crm";
import { crmApp } from "./index";
import { CRM_STRINGS } from "./strings";

const NOW = new Date(2026, 9, 14, 10, 30, 0);

interface Call {
  op: string;
  args: unknown[];
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: unknown;
}

/** fakeCtx plus a log of every method call with the styles current at the call (save/restore keep a style stack). */
function recordingCtx(): { g: CanvasRenderingContext2D; calls: Call[] } {
  const calls: Call[] = [];
  const stack: Record<string | symbol, unknown>[] = [];
  let state: Record<string | symbol, unknown> = { font: "10px sans-serif", lineWidth: 1, fillStyle: "#000000", strokeStyle: "#000000" };
  const g = new Proxy(
    {},
    {
      get: (_, key) => {
        if (key === "measureText") return (s: string) => ({ width: s.length * 5 });
        if (key === "save") return () => stack.push({ ...state });
        if (key === "restore") return () => (state = stack.pop() ?? state);
        if (key in state) return state[key];
        return (...args: unknown[]) => {
          calls.push({ op: String(key), args, fillStyle: state.fillStyle, strokeStyle: state.strokeStyle, lineWidth: state.lineWidth });
        };
      },
      set: (_, key, value) => {
        state[key] = value;
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
  return { g, calls };
}

const textColour = (calls: Call[], text: string) => calls.find((c) => c.op === "fillText" && c.args[0] === text)?.fillStyle;
const ringArcs = (calls: Call[]) =>
  calls.filter((c) => c.op === "arc" && typeof c.strokeStyle === "string" && c.strokeStyle.startsWith("rgba(79,70,229"));

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

describe("crmApp after a sale", () => {
  const PULSE = 5.3;
  const s = recordSale(initCrm(NOW), PULSE);
  const revenue = formatRupiah(s.revenue);
  const transactions = String(s.transactions);

  it("shows revenue and transactions green exactly while the sale pulses, then dark again", () => {
    for (let f = 0; f < 100; f++) {
      const t = PULSE - 0.1 + f / 60;
      const { g, calls } = recordingCtx();
      crmApp.draw(g, s, t);
      const colour = pulsing(s, t) ? "#10B981" : "#1F2937";
      expect(textColour(calls, revenue)).toBe(colour);
      expect(textColour(calls, transactions)).toBe(colour);
    }
  });

  it("keeps the pulse ring inside the chart card, and draws none once the pulse is over", () => {
    for (let f = 0; f < 72; f++) {
      const { g, calls } = recordingCtx();
      const card = crmApp.draw(g, s, PULSE + f / 60).find((r) => r.action === "sale");
      if (!card) throw new Error("no chart card");
      const rings = ringArcs(calls);
      expect(rings).toHaveLength(1);
      const [x, y, r] = rings[0].args as number[];
      const reach = r + Number(rings[0].lineWidth) / 2;
      expect(x + reach).toBeLessThanOrEqual(card.x + card.w);
      expect(x - reach).toBeGreaterThanOrEqual(card.x);
      expect(y - reach).toBeGreaterThanOrEqual(card.y);
      expect(y + reach).toBeLessThanOrEqual(card.y + card.h);
    }
    const { g, calls } = recordingCtx();
    crmApp.draw(g, s, PULSE + PULSE_SECONDS);
    expect(ringArcs(calls)).toHaveLength(0);
  });
});

describe("crmApp sidebar", () => {
  it("draws the bee in white, so a monochrome emoji font still shows it on the indigo disc", () => {
    const { g, calls } = recordingCtx();
    crmApp.draw(g, initCrm(NOW), 0);
    expect(textColour(calls, CRM_STRINGS.logoEmoji)).toBe("#ffffff");
  });
});
