import type { StarIslandModule } from "./types";
import { PLACEHOLDER_ISLANDS } from "./placeholders";
import { petakUmpetIsland } from "./PetakUmpet";
import { ezraBotIsland } from "./EzraBot";
import { orbitStoreIsland } from "./OrbitStore";
import { gtidIsland } from "./Gtid";

// Real islands replace placeholders one by one (Tasks 5–9); Task 10 removes the placeholders.
const REAL_ISLANDS: Record<string, StarIslandModule> = {
  "petak-umpet": petakUmpetIsland,
  "ezra-bot": ezraBotIsland,
  "orbit-store": orbitStoreIsland,
  gtid: gtidIsland,
};

export const STAR_ISLANDS: Record<string, StarIslandModule> = { ...PLACEHOLDER_ISLANDS, ...REAL_ISLANDS };
