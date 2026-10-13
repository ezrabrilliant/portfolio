import { useEffect, useState } from "react";
import type { GtidData } from "./types";
import { GTID_SNAPSHOT } from "./snapshot";

const POLL = { price: 30_000, history: 120_000, mods: 30_000 } as const;
type Key = keyof typeof POLL;

/** Polls /api/gtid/*; starts from the bundled snapshot and keeps the last good values when a poll fails. */
export function useGtidData(): GtidData {
  const [state, setState] = useState<GtidData>({
    price: GTID_SNAPSHOT.price,
    history: GTID_SNAPSHOT.history,
    mods: GTID_SNAPSHOT.mods,
    stale: true,
    live: false,
  });

  useEffect(() => {
    let alive = true;
    const fresh = new Set<Key>();
    const load = async (key: Key) => {
      try {
        const res = await fetch(`/api/gtid/${key}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const env = (await res.json()) as { data: unknown; stale: boolean };
        if (!alive) return;
        if (env.stale) fresh.delete(key);
        else fresh.add(key);
        setState((s) => ({ ...s, ...({ [key]: env.data } as Partial<GtidData>), live: true, stale: fresh.size < 3 }));
      } catch {
        if (!alive) return;
        fresh.delete(key);
        setState((s) => ({ ...s, stale: true }));
      }
    };
    const keys = Object.keys(POLL) as Key[];
    const timers = keys.map((k) => {
      void load(k);
      return window.setInterval(() => void load(k), POLL[k]);
    });
    return () => {
      alive = false;
      timers.forEach((id) => window.clearInterval(id));
    };
  }, []);

  return state;
}
