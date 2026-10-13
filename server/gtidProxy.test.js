import { describe, expect, it, vi } from "vitest";
import { createGtidProxy, registerGtidRoutes } from "./gtidProxy.js";

const PRICE = {
  buy: 850, sell: 870, buyBgl: 84500, sellBgl: 86000, bgl: { buy: 84500, sell: 86000 },
  spread: { dl: 20, bgl: 1500 }, posts24h: 120, sources: 14, updatedAt: "2026-10-13T08:00:00.000Z",
};
const HISTORY = {
  period: "1d", field: "buy", count: 3,
  data: [
    { t: "2026-10-13T00:00:00.000Z", v: 840, o: 840, h: 845, l: 838, c: 842 },
    { t: "2026-10-13T01:00:00.000Z", v: 846, o: 842, h: 850, l: 841, c: 848 },
    { t: "2026-10-13T02:00:00.000Z", v: 850, o: 848, h: 852, l: 846, c: 850 },
  ],
};
const STATUS = {
  mods: {
    online: [{ name: "misthios", status: "Online", lastSeen: 1 }, { name: "miu", status: "Idle", lastSeen: 1 }],
    offline: [], updatedAt: 1760342400000, source: "galang",
  },
  playerCount: { current: null, history: [] }, logs: [], sb: [], updatedAt: "2026-10-13T08:00:00.000Z", stale: false,
};

function setup() {
  const routes = { price: PRICE, history: HISTORY, mods: STATUS };
  const fetchImpl = vi.fn(async (url) => {
    const key = url.includes("game-status") ? "mods" : url.includes("endpoint=history") ? "history" : "price";
    const r = routes[key];
    if (r instanceof Error) throw r;
    return { ok: true, status: 200, json: async () => r };
  });
  const clock = { t: 0 };
  const proxy = createGtidProxy({ fetchImpl, now: () => clock.t });
  return { routes, fetchImpl, clock, proxy };
}

describe("gtid proxy", () => {
  it("returns only the price fields the board uses and caches them for 30 s", async () => {
    const { fetchImpl, clock, proxy } = setup();
    const a = await proxy.get("price");
    expect(a).toEqual({
      data: { buy: 850, sell: 870, buyBgl: 84500, sellBgl: 86000, updatedAt: "2026-10-13T08:00:00.000Z" },
      stale: false, fetchedAt: 0,
    });
    clock.t = 29_999;
    await proxy.get("price");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    clock.t = 30_000;
    await proxy.get("price");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("keeps only t/v points for the 24 h chart and caches history for 120 s", async () => {
    const { fetchImpl, clock, proxy } = setup();
    const r = await proxy.get("history");
    expect(r.data.points).toEqual([
      { t: "2026-10-13T00:00:00.000Z", v: 840 },
      { t: "2026-10-13T01:00:00.000Z", v: 846 },
      { t: "2026-10-13T02:00:00.000Z", v: 850 },
    ]);
    clock.t = 119_999;
    await proxy.get("history");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns only the mods roster from game-status", async () => {
    const { proxy } = setup();
    const r = await proxy.get("mods");
    expect(r.data).toEqual({
      online: [{ name: "misthios", status: "Online" }, { name: "miu", status: "Idle" }],
      updatedAt: 1760342400000,
    });
  });

  it("serves the last good payload marked stale when the upstream fails", async () => {
    const { routes, clock, proxy } = setup();
    await proxy.get("price");
    clock.t = 31_000;
    routes.price = new Error("down");
    const r = await proxy.get("price");
    expect(r.stale).toBe(true);
    expect(r.fetchedAt).toBe(0);
    expect(r.data.buy).toBe(850);
  });

  it("rejects with status 503 when nothing is cached and the upstream fails", async () => {
    const { routes, proxy } = setup();
    routes.price = new Error("down");
    await expect(proxy.get("price")).rejects.toMatchObject({ status: 503 });
  });

  it("treats a 'Not enough data' history answer as a failure", async () => {
    const { routes, proxy } = setup();
    routes.history = { error: "Not enough data" };
    await expect(proxy.get("history")).rejects.toMatchObject({ status: 503 });
  });

  it("rejects unknown keys with status 404", async () => {
    const { proxy } = setup();
    await expect(proxy.get("nope")).rejects.toMatchObject({ status: 404 });
  });

  it("registers the three routes, answering JSON with no-store caching", async () => {
    const handlers = {};
    const app = { get: (path, fn) => { handlers[path] = fn; } };
    const proxy = { get: vi.fn(async (k) => ({ data: { k }, stale: false, fetchedAt: 0 })) };
    registerGtidRoutes(app, proxy);
    expect(Object.keys(handlers).sort()).toEqual(["/api/gtid/history", "/api/gtid/mods", "/api/gtid/price"]);
    const res = {
      headers: {}, code: 200, body: null,
      set(k, v) { this.headers[k] = v; return this; },
      status(c) { this.code = c; return this; },
      json(b) { this.body = b; return this; },
    };
    await handlers["/api/gtid/price"]({}, res);
    expect(res.body).toEqual({ data: { k: "price" }, stale: false, fetchedAt: 0 });
    expect(res.headers["Cache-Control"]).toBe("no-store");
  });
});
