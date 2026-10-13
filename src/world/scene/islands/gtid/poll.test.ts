import { describe, expect, it } from "vitest";
import { GTID_SNAPSHOT } from "./snapshot";
import { INITIAL_GTID, applyAnswer, applyFailure, pollDelay, readEnvelope } from "./poll";

const history = { points: [{ t: "a", v: 1 }, { t: "b", v: 2 }] };
const mods = { online: [], updatedAt: 1 };

describe("GTID polling", () => {
  it("backs off exponentially after failures, capped at 5 minutes", () => {
    expect(pollDelay("price", 0)).toBe(30_000);
    expect(pollDelay("price", 1)).toBe(60_000);
    expect(pollDelay("price", 3)).toBe(240_000);
    expect(pollDelay("price", 4)).toBe(300_000);
    expect(pollDelay("mods", 9)).toBe(300_000);
    expect(pollDelay("history", 0)).toBe(120_000);
    expect(pollDelay("history", 2)).toBe(300_000);
  });

  it("rejects answers that are not a proxy envelope of the right shape", () => {
    expect(() => readEnvelope("price", null)).toThrow();
    expect(() => readEnvelope("price", "<!doctype html>")).toThrow();
    expect(() => readEnvelope("price", { data: null, stale: false })).toThrow();
    expect(() => readEnvelope("price", { data: { error: "x" }, stale: false })).toThrow();
    expect(() => readEnvelope("history", { data: { error: "Not enough data" }, stale: false })).toThrow();
    expect(() => readEnvelope("mods", { data: { online: "x" }, stale: false })).toThrow();
    expect(readEnvelope("history", { data: history, stale: true })).toEqual({ data: history, stale: true });
    expect(readEnvelope("price", { data: GTID_SNAPSHOT.price, fetchedAt: 1 })).toEqual({ data: GTID_SNAPSHOT.price, stale: false });
  });

  it("starts from the snapshot and goes live section by section", () => {
    expect(INITIAL_GTID).toMatchObject({ live: false, stale: true, sources: { price: "snapshot", history: "snapshot", mods: "snapshot" } });
    expect(INITIAL_GTID.price).toBe(GTID_SNAPSHOT.price);
    const price = { ...GTID_SNAPSHOT.price, buy: 999 };
    const s1 = applyAnswer(INITIAL_GTID, "price", price, false);
    expect(s1.price).toBe(price);
    expect(s1).toMatchObject({ live: true, stale: true, sources: { price: "live", history: "snapshot", mods: "snapshot" } });
    const s3 = applyAnswer(applyAnswer(s1, "history", history, false), "mods", mods, false);
    expect(s3).toMatchObject({ live: true, stale: false, sources: { price: "live", history: "live", mods: "live" } });
    expect(applyAnswer(s3, "mods", mods, true)).toMatchObject({ stale: true, sources: { mods: "stale" } });
  });

  it("returns the same state when an answer changes nothing, so React skips the render", () => {
    const s1 = applyAnswer(INITIAL_GTID, "price", { ...GTID_SNAPSHOT.price }, false);
    expect(s1.price).toBe(GTID_SNAPSHOT.price); // equal values keep their reference
    expect(applyAnswer(s1, "price", { ...GTID_SNAPSHOT.price }, false)).toBe(s1);
    const s2 = applyAnswer(s1, "price", { ...GTID_SNAPSHOT.price }, true);
    expect(s2).not.toBe(s1);
    expect(s2.price).toBe(s1.price);
    expect(s2.sources.price).toBe("stale");
  });

  it("turns a live section stale on failure, once, and leaves snapshot sections alone", () => {
    const s1 = applyAnswer(INITIAL_GTID, "mods", mods, false);
    const s2 = applyFailure(s1, "mods");
    expect(s2.sources.mods).toBe("stale");
    expect(s2.mods).toBe(s1.mods);
    expect(applyFailure(s2, "mods")).toBe(s2);
    expect(applyFailure(INITIAL_GTID, "price")).toBe(INITIAL_GTID);
  });
});
