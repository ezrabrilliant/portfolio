// Server-side proxy for gtid.pro's public API, with an in-memory cache.
// The portfolio's GTID island reads /api/gtid/*; the browser never calls gtid.pro directly.

const TTL = { price: 30_000, history: 120_000, mods: 30_000 };

function pickPrice(j) {
  if (!j || j.error || !("buy" in j)) return null;
  return { buy: j.buy ?? null, sell: j.sell ?? null, buyBgl: j.buyBgl ?? null, sellBgl: j.sellBgl ?? null, updatedAt: j.updatedAt ?? null };
}

function pickHistory(j) {
  if (!j || !Array.isArray(j.data) || j.data.length < 2) return null;
  return { points: j.data.map((d) => ({ t: d.t, v: d.v })) };
}

function pickMods(j) {
  if (!j || !j.mods || !Array.isArray(j.mods.online)) return null;
  return { online: j.mods.online.map((m) => ({ name: String(m.name), status: String(m.status) })), updatedAt: j.mods.updatedAt ?? null };
}

export function createGtidProxy({ fetchImpl = globalThis.fetch, now = () => Date.now(), base = "https://gtid.pro", timeoutMs = 8000 } = {}) {
  const sources = {
    price: { url: `${base}/api/dl-price?endpoint=price`, pick: pickPrice },
    history: { url: `${base}/api/dl-price?endpoint=history&period=1d&field=buy`, pick: pickHistory },
    mods: { url: `${base}/api/game-status`, pick: pickMods },
  };
  const cache = new Map(); // key -> { data, at }
  const inflight = new Map(); // key -> Promise<data>

  async function load(key) {
    const src = sources[key];
    const res = await fetchImpl(src.url, {
      headers: { accept: "application/json", "user-agent": "ezrabrilliant.com portfolio" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = src.pick(await res.json());
    if (!data) throw new Error("unexpected payload");
    return data;
  }

  async function get(key) {
    if (!sources[key]) {
      const e = new Error(`unknown gtid source: ${key}`);
      e.status = 404;
      throw e;
    }
    const hit = cache.get(key);
    if (hit && now() - hit.at < TTL[key]) return { data: hit.data, stale: false, fetchedAt: hit.at };
    if (!inflight.has(key)) inflight.set(key, load(key).finally(() => inflight.delete(key)));
    try {
      const data = await inflight.get(key);
      const at = now();
      cache.set(key, { data, at });
      return { data, stale: false, fetchedAt: at };
    } catch (err) {
      if (hit) return { data: hit.data, stale: true, fetchedAt: hit.at };
      const e = new Error(`gtid ${key} unavailable: ${err.message}`);
      e.status = 503;
      throw e;
    }
  }

  return { get };
}

export function registerGtidRoutes(app, proxy = createGtidProxy()) {
  for (const key of ["price", "history", "mods"]) {
    app.get(`/api/gtid/${key}`, async (_req, res) => {
      try {
        const result = await proxy.get(key);
        res.set("Cache-Control", "no-store");
        res.json(result);
      } catch (e) {
        res.status(e.status || 500).json({ error: e.message });
      }
    });
  }
}
