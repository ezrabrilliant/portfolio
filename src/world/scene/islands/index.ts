import { placeholderIsland } from "./placeholder";
import type { StarIslandModule } from "./types";

export const STAR_ISLANDS: Record<string, StarIslandModule> = {
  hero: placeholderIsland("hero", "Ezra Brilliant", 1.3),
  gtid: placeholderIsland("gtid", "GTID"),
  "petak-umpet": placeholderIsland("petak-umpet", "Petak Umpet"),
  "orbit-store": placeholderIsland("orbit-store", "Orbit Store"),
  "ezra-bot": placeholderIsland("ezra-bot", "Ezra Bot"),
};
