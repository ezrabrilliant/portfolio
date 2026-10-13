/** Shapes served by /api/gtid/* (see server/gtidProxy.js). Prices are rupiah per DL / per BGL. */
export interface GtidPrice { buy: number | null; sell: number | null; buyBgl: number | null; sellBgl: number | null; updatedAt: string | null }
export interface GtidHistory { points: { t: string; v: number }[] }
export interface GtidModsEntry { name: string; status: string }
export interface GtidMods { online: GtidModsEntry[]; updatedAt: number | null }
export interface GtidSnapshot { price: GtidPrice; history: GtidHistory; mods: GtidMods; capturedAt: string }
/** The three proxied sources, one per /api/gtid/<key> route. */
export type GtidKey = "price" | "history" | "mods";
/** Where a section's values come from: the bundled snapshot, a fresh proxy answer, or the last good answer after a failure. */
export type GtidSource = "snapshot" | "live" | "stale";
/**
 * What the island renders: `live` once any proxy answer arrived; `stale` when some data is old or from the snapshot.
 * `sources` says the same per section (the board marks sections still on the snapshot while others are live).
 */
export interface GtidData {
  price: GtidPrice;
  history: GtidHistory;
  mods: GtidMods;
  stale: boolean;
  live: boolean;
  sources: Record<GtidKey, GtidSource>;
}
