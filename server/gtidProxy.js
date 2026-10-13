// Server-side proxy for gtid.pro's public API, with an in-memory cache.
// The portfolio's GTID island reads /api/gtid/*; the browser never calls gtid.pro directly.
//
// Stale-while-revalidate: once a key has data, a request never waits on gtid.pro. Past its TTL the cached copy is
// answered at once and refreshed in the background (one upstream request per key at a time). After a failure the
// key backs off (no upstream request for `backoffMs`), its answers are marked `stale` until a refresh succeeds, and
// the failure streak logs one warning. Only a key with nothing cached yet waits for the upstream (or answers 503).

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

export function createGtidProxy({
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  base = "https://gtid.pro",
  timeoutMs = 8000,
  backoffMs = 15_000,
  warn = (msg) => console.warn(msg),
} = {}) {
  const sources = {
    price: { url: `${base}/api/dl-price?endpoint=price`, pick: pickPrice },
    history: { url: `${base}/api/dl-price?endpoint=history&period=1d&field=buy`, pick: pickHistory },
    mods: { url: `${base}/api/game-status`, pick: pickMods },
  };
  const cache = new Map(); // key -> { data, at }
  const inflight = new Map(); // key -> Promise<boolean> (true once the cache holds the fresh answer)
  const failure = new Map(); // key -> { at, message } of the latest failure in the current streak (absent = healthy)

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

  /** One upstream request per key at a time. Never rejects: success fills the cache, failure starts or extends a streak. */
  function refresh(key) {
    let p = inflight.get(key);
    if (!p) {
      p = load(key)
        .then(
          (data) => {
            cache.set(key, { data, at: now() });
            failure.delete(key);
            return true;
          },
          (err) => {
            if (!failure.has(key)) warn(`[gtid] ${key}: gtid.pro failed (${err.message}); serving cached data until it recovers`);
            failure.set(key, { at: now(), message: err.message });
            return false;
          },
        )
        .finally(() => inflight.delete(key));
      inflight.set(key, p);
    }
    return p;
  }

  const backingOff = (key) => {
    const f = failure.get(key);
    return f !== undefined && now() - f.at < backoffMs;
  };

  async function get(key) {
    if (!sources[key]) {
      const e = new Error(`unknown gtid source: ${key}`);
      e.status = 404;
      throw e;
    }
    const hit = cache.get(key);
    if (hit) {
      if (now() - hit.at >= TTL[key] && !backingOff(key)) void refresh(key);
      return { data: hit.data, stale: failure.has(key), fetchedAt: hit.at };
    }
    if (!backingOff(key) && (await refresh(key))) {
      const fresh = cache.get(key);
      return { data: fresh.data, stale: false, fetchedAt: fresh.at };
    }
    const e = new Error(`gtid ${key} unavailable: ${failure.get(key)?.message ?? "no data"}`);
    e.status = 503;
    throw e;
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
