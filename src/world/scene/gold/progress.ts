import { GOLD_TOTAL } from "./spots";

/** Which gold blocks this visitor has found, kept in this browser (it may be unavailable: then for the page's life). */
const KEY = "voxel.gold.v1";
type Listener = () => void;
const listeners = new Set<Listener>();

function load(): Set<string> {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

let found = load();
let snapshot = { count: found.size, all: found.size >= GOLD_TOTAL };

export function goldFound(): ReadonlySet<string> {
  return found;
}

/** For useSyncExternalStore: the count and whether all are found (a new object only when it changes). */
export function goldSnapshot(): { count: number; all: boolean } {
  return snapshot;
}

export function subscribeGold(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Records a find; returns the new count, or null when it was found before. */
export function collectGold(id: string): number | null {
  if (found.has(id)) return null;
  found = new Set(found).add(id);
  snapshot = { count: found.size, all: found.size >= GOLD_TOTAL };
  try {
    localStorage.setItem(KEY, JSON.stringify([...found]));
  } catch {
    // private window or blocked storage: the find still counts for this visit
  }
  for (const l of listeners) l();
  return found.size;
}

/** Tests: forget every find. */
export function resetGold(): void {
  found = new Set();
  snapshot = { count: 0, all: false };
}
