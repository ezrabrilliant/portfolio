/**
 * The island title card (spec: voxel controls §5): a moving to another island (the tour's hop, a map pick, a fast travel
 * in Play) names it as it arrives. announceIsland records it; TitleCard (Hud) shows it for TITLE_CARD.show seconds after
 * TITLE_CARD.delay (the camera is most of the way there by then).
 */
export const TITLE_CARD = { delay: 0.55, show: 2.0 } as const;
/** Seconds after the move starts that the card shows: near the landing of a hop, of a map pick's dive, of a fast travel. */
export const TITLE_DELAY = { hop: 1.0, map: 1.8, travel: 0.25 } as const;

type Listener = () => void;
let current: { id: string; at: number; delay: number } | null = null;
const listeners = new Set<Listener>();

export function announceIsland(id: string, delay: number = TITLE_CARD.delay, now = performance.now()): void {
  current = { id, at: now, delay };
  for (const l of listeners) l();
}

export function subscribeTitleCard(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function titleCardNow(): { id: string; at: number; delay: number } | null {
  return current;
}

/** Is the card for an announcement made at `at` up at time `now` (ms)? */
export function titleCardShown(at: number, now: number, delay: number = TITLE_CARD.delay): boolean {
  const t = (now - at) / 1000;
  return t >= delay && t < delay + TITLE_CARD.show;
}
