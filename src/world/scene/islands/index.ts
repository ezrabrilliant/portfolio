import type { StarIslandModule } from "./types";
import { heroIsland } from "./Hero";
import { gtidIsland } from "./Gtid";
import { petakUmpetIsland } from "./PetakUmpet";
import { orbitStoreIsland } from "./OrbitStore";
import { ezraBotIsland } from "./EzraBot";

export const STAR_ISLANDS: Record<string, StarIslandModule> = {
  hero: heroIsland,
  gtid: gtidIsland,
  "petak-umpet": petakUmpetIsland,
  "orbit-store": orbitStoreIsland,
  "ezra-bot": ezraBotIsland,
};
