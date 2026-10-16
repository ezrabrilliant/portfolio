/**
 * Petak Umpet's hide and seek (polish #13): in Play, coming near the kid starts it. He runs to one of HIDE_SPOTS, Ezra
 * finds him (within FOUND_AT), he runs to the next; three rounds, a different spot each, then he goes home. Island-local
 * spots, each behind something: the banana tree, the gentong, the clothesline, the Roblox board.
 */
export const HIDE_SPOTS: readonly { x: number; z: number }[] = [
  { x: -5.6, z: -2.4 },
  { x: 0.1, z: 3.5 },
  { x: -3.4, z: 6.0 },
  { x: -5.2, z: 4.1 },
];
export const ROUNDS = 3;
/** Blocks from the kid's feet within which Ezra finds him. */
export const FOUND_AT = 1.5;
/** Blocks from the kid's peek spot within which Ezra starts the game (Play). */
export const START_AT = 4.5;
/** Ezra this far from the kid ends the game (he left the island). */
export const GIVE_UP_AT = 14;

/** ROUNDS different spots in a random order (indices into HIDE_SPOTS). */
export function pickRounds(rnd: () => number = Math.random): number[] {
  const idx = HIDE_SPOTS.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, ROUNDS);
}
