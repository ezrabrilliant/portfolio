import { useEffect, useState } from "react";
import type { GtidData, GtidKey } from "./types";
import { GTID_KEYS, INITIAL_GTID, POLL, applyAnswer, applyFailure, pollDelay, readEnvelope } from "./poll";

const TIMEOUT = 10_000;

/**
 * Polls /api/gtid/* politely: one setTimeout chain per source, backing off after failures (reset on success),
 * no requests while the tab is hidden. Starts from the bundled snapshot and keeps the last good values.
 */
export function useGtidData(): GtidData {
  const [state, setState] = useState<GtidData>(INITIAL_GTID);

  useEffect(() => {
    let alive = true;
    const timers: Partial<Record<GtidKey, number>> = {};
    const fails: Record<GtidKey, number> = { price: 0, history: 0, mods: 0 };
    const schedule = (key: GtidKey, ms: number) => {
      timers[key] = window.setTimeout(() => void poll(key), ms);
    };
    const poll = async (key: GtidKey) => {
      if (document.hidden) {
        schedule(key, POLL[key]);
        return;
      }
      try {
        const res = await fetch(`/api/gtid/${key}`, { signal: AbortSignal.timeout(TIMEOUT) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const env = readEnvelope(key, await res.json());
        if (!alive) return;
        fails[key] = 0;
        setState((s) => applyAnswer(s, key, env.data, env.stale));
      } catch {
        if (!alive) return;
        fails[key] += 1;
        setState((s) => applyFailure(s, key));
      }
      schedule(key, pollDelay(key, fails[key]));
    };
    for (const key of GTID_KEYS) void poll(key);
    return () => {
      alive = false;
      for (const key of GTID_KEYS) window.clearTimeout(timers[key]);
    };
  }, []);

  return state;
}
