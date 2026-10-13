/** Shapes served by /api/gtid/* (see server/gtidProxy.js). Prices are rupiah per DL / per BGL. */
export interface GtidPrice { buy: number | null; sell: number | null; buyBgl: number | null; sellBgl: number | null; updatedAt: string | null }
export interface GtidHistory { points: { t: string; v: number }[] }
export interface GtidModsEntry { name: string; status: string }
export interface GtidMods { online: GtidModsEntry[]; updatedAt: number | null }
export interface GtidSnapshot { price: GtidPrice; history: GtidHistory; mods: GtidMods; capturedAt: string }
/** What the island renders: `live` once any proxy answer arrived; `stale` when some data is old or from the snapshot. */
export interface GtidData { price: GtidPrice; history: GtidHistory; mods: GtidMods; stale: boolean; live: boolean }
