import { describe, expect, it } from "vitest";
import type { GtidData } from "./types";
import { buildBoardModel, formatRp, normalizeSeries } from "./board";

const data = (over: Partial<GtidData> = {}): GtidData => ({
  price: { buy: 850, sell: 870, buyBgl: 84500, sellBgl: 86000, updatedAt: null },
  history: { points: [{ t: "a", v: 840 }, { t: "b", v: 860 }, { t: "c", v: 850 }] },
  mods: {
    online: [
      { name: "miu", status: "Idle" },
      { name: "misthios", status: "Online" },
      { name: "qadevone", status: "Undercover" },
    ],
    updatedAt: null,
  },
  stale: false,
  live: true,
  sources: { price: "live", history: "live", mods: "live" },
  ...over,
});

describe("GTID board model", () => {
  it("formats rupiah prices and missing values", () => {
    expect(formatRp(850)).toBe("Rp 850");
    expect(formatRp(84500)).toBe("Rp 84.500");
    expect(formatRp(null)).toBe("—");
  });

  it("normalises the 24 h series into the 0..1 box", () => {
    expect(normalizeSeries([{ t: "a", v: 840 }, { t: "b", v: 860 }, { t: "c", v: 850 }])).toEqual([
      { x: 0, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 0.5 },
    ]);
    expect(normalizeSeries([{ t: "a", v: 5 }, { t: "b", v: 5 }]).map((p) => p.y)).toEqual([0.5, 0.5]);
    expect(normalizeSeries([])).toEqual([]);
  });

  it("builds DL and BGL rows and the chart range", () => {
    const m = buildBoardModel(data(), "chart");
    expect(m.rows).toEqual([
      { label: "DL", buy: "Rp 850", sell: "Rp 870" },
      { label: "BGL", buy: "Rp 84.500", sell: "Rp 86.000" },
    ]);
    expect(m.chartLow).toBe("Rp 840");
    expect(m.chartHigh).toBe("Rp 860");
  });

  it("lists online mods first and counts the rest past the cap", () => {
    const m = buildBoardModel(data(), "mods", 2);
    expect(m.mods.map((x) => x.name)).toEqual(["misthios", "miu"]);
    expect(m.mods[0]).toEqual({ name: "misthios", status: "online", online: true });
    expect(m.moreMods).toBe(1);
  });

  it("words the moderators card like gtid.pro, with \"just now\" only for a live roster", () => {
    const m = buildBoardModel(data(), "mods");
    expect(m.modsInGame).toBe(3);
    expect(m.modsCaption).toBe("mods in-game");
    expect(m.modsSeen).toBe("just now");
    const one = data({ mods: { online: [{ name: "a", status: "Online" }], updatedAt: null } });
    expect(buildBoardModel(one, "mods").modsCaption).toBe("mod in-game");
    const none = buildBoardModel(data({ mods: { online: [], updatedAt: null } }), "mods");
    expect([none.modsInGame, none.modsCaption]).toEqual([0, "no mods in-game"]);
    expect(buildBoardModel(data({ stale: true, sources: { price: "live", history: "live", mods: "stale" } }), "mods").modsSeen).toBe("");
    expect(buildBoardModel(data({ live: false, stale: true, sources: { price: "snapshot", history: "snapshot", mods: "snapshot" } }), "mods").modsSeen).toBe("");
  });

  it("marks sections still on the saved snapshot while the rest is live", () => {
    const mixed = buildBoardModel(data({ stale: true, sources: { price: "live", history: "snapshot", mods: "stale" } }), "chart");
    expect(mixed.snapshot).toEqual({ price: false, history: true, mods: false });
    expect(mixed.footer).toBe("Last update from gtid.pro");
    // all from the snapshot: the footer already says so
    const off = buildBoardModel(data({ live: false, stale: true, sources: { price: "snapshot", history: "snapshot", mods: "snapshot" } }), "chart");
    expect(off.snapshot).toEqual({ price: false, history: false, mods: false });
  });

  it("says where the numbers come from", () => {
    expect(buildBoardModel(data(), "chart").footer).toBe("Live from gtid.pro");
    expect(buildBoardModel(data({ stale: true }), "chart").footer).toBe("Last update from gtid.pro");
    expect(buildBoardModel(data({ live: false, stale: true }), "chart").footer).toBe("Saved snapshot from gtid.pro");
  });
});
