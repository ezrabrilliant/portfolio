import { describe, expect, it, vi } from "vitest";
import { createHandler } from "./index.js";
import { createGtidProxy } from "../server/gtidProxy.js";

const PRICE = { buy: 78500, sell: 77000, buyBgl: 7850000, sellBgl: 7700000, updatedAt: "2026-10-19T08:00:00Z" };

function upstream(payload = PRICE) {
  return vi.fn(async () => new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } }));
}

function env() {
  return { ASSETS: { fetch: vi.fn(async (req) => new Response(`asset ${new URL(req.url).pathname}`, { status: 200 })) } };
}

function ctx() {
  const pending = [];
  return { waitUntil: vi.fn((p) => pending.push(p)), pending };
}

const get = (path) => new Request(`https://beta.ezrabrilliant.com${path}`);

describe("worker: /api/gtid/* (was server.js)", () => {
  it("answers the gtid.pro price through the proxy as JSON, never cached by the browser", async () => {
    const fetchImpl = upstream();
    const handle = createHandler(createGtidProxy({ fetchImpl }));
    const e = env();
    const res = await handle(get("/api/gtid/price"), e, ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body.data.buy).toBe(78500);
    expect(body.stale).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(e.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it("an unknown gtid source and an unknown /api route are JSON 404s, not the page", async () => {
    const handle = createHandler(createGtidProxy({ fetchImpl: upstream() }));
    for (const path of ["/api/gtid/nope", "/api/whatever"]) {
      const res = await handle(get(path), env(), ctx());
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toContain("application/json");
    }
  });

  it("gtid.pro down with nothing cached: 503 JSON (the board keeps its bundled snapshot)", async () => {
    const fetchImpl = vi.fn(async () => new Response("down", { status: 502 }));
    const handle = createHandler(createGtidProxy({ fetchImpl }));
    const res = await handle(get("/api/gtid/mods"), env(), ctx());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/unavailable/);
  });

  it("a refresh past the TTL runs in the background, kept alive with ctx.waitUntil", async () => {
    let t = 0;
    const fetchImpl = upstream();
    const handle = createHandler(createGtidProxy({ fetchImpl, now: () => t }));
    await handle(get("/api/gtid/price"), env(), ctx());
    t = 31_000; // past the 30 s price TTL
    const c = ctx();
    const res = await handle(get("/api/gtid/price"), env(), c);
    expect(res.status).toBe(200);
    expect(c.waitUntil).toHaveBeenCalledTimes(1);
    await Promise.all(c.pending);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("everything else is the site's own files", async () => {
    const handle = createHandler(createGtidProxy({ fetchImpl: upstream() }));
    const e = env();
    const res = await handle(get("/assets/index.js"), e, ctx());
    expect(await res.text()).toBe("asset /assets/index.js");
    expect(e.ASSETS.fetch).toHaveBeenCalledTimes(1);
  });
});
