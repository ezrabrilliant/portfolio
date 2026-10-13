import type { GtidData, GtidKey, GtidSource } from "./types";
import { GTID_SNAPSHOT } from "./snapshot";

/** Base poll interval per source (the proxy caches price and mods for 30 s, history for 120 s). */
export const POLL: Record<GtidKey, number> = { price: 30_000, history: 120_000, mods: 30_000 };
export const GTID_KEYS: readonly GtidKey[] = ["price", "history", "mods"];
const MAX_DELAY = 300_000;

/** Delay before the next poll of `key` after `fails` failures in a row: doubles from the base interval, capped at 5 min. */
export function pollDelay(key: GtidKey, fails: number): number {
  return Math.min(POLL[key] * 2 ** fails, MAX_DELAY);
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const VALID: Record<GtidKey, (d: Record<string, unknown>) => boolean> = {
  price: (d) => "buy" in d && "sell" in d && "buyBgl" in d && "sellBgl" in d,
  history: (d) => Array.isArray(d.points),
  mods: (d) => Array.isArray(d.online),
};

/** The proxy's `{ data, stale }` envelope; throws for anything else so a bad 200 never reaches the scene. */
export function readEnvelope<K extends GtidKey>(key: K, body: unknown): { data: GtidData[K]; stale: boolean } {
  if (!isObj(body) || !isObj(body.data) || !VALID[key](body.data)) throw new Error(`unexpected /api/gtid/${key} payload`);
  return { data: body.data as unknown as GtidData[K], stale: body.stale === true };
}

function withSources(s: GtidData, sources: Record<GtidKey, GtidSource>): GtidData {
  const all = GTID_KEYS.map((k) => sources[k]);
  return { ...s, sources, live: all.some((x) => x !== "snapshot"), stale: all.some((x) => x !== "live") };
}

/** Before any answer: everything from the bundled snapshot. */
export const INITIAL_GTID: GtidData = {
  price: GTID_SNAPSHOT.price,
  history: GTID_SNAPSHOT.history,
  mods: GTID_SNAPSHOT.mods,
  stale: true,
  live: false,
  sources: { price: "snapshot", history: "snapshot", mods: "snapshot" },
};

/** Merges one proxy answer. Returns `s` itself when nothing visible changed (React then skips the render). */
export function applyAnswer<K extends GtidKey>(s: GtidData, key: K, data: GtidData[K], stale: boolean): GtidData {
  const source: GtidSource = stale ? "stale" : "live";
  const same = JSON.stringify(s[key]) === JSON.stringify(data);
  if (same && s.sources[key] === source) return s;
  return withSources({ ...s, [key]: same ? s[key] : data }, { ...s.sources, [key]: source });
}

/** A failed poll keeps the section's last values; a live section turns stale, a snapshot section stays as it is. */
export function applyFailure(s: GtidData, key: GtidKey): GtidData {
  return s.sources[key] === "live" ? withSources(s, { ...s.sources, [key]: "stale" }) : s;
}
