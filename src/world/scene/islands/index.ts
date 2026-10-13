import type { FC } from "react";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { StarIslandModule } from "./types";
import { FOOTPRINTS } from "./layouts";
import { tourStopFor } from "./framing";
import { stampCells } from "./shared/local";
import { HeroIsland } from "./Hero";
import { GtidIsland } from "./Gtid";
import { PetakUmpetIsland } from "./PetakUmpet";
import { OrbitStoreIsland } from "./OrbitStore";
import { EzraBotIsland } from "./EzraBot";

/** Every star island shares one tour framing (framing.ts) and stamps its FOOTPRINTS cells as barrier collision. */
const star = (id: string, Component: FC<{ placement: IslandPlacement }>): StarIslandModule => ({
  id,
  Component,
  tourStop: tourStopFor,
  stamp: (grid, p) => stampCells(grid, p, FOOTPRINTS[id]),
});

export const STAR_ISLANDS: Record<string, StarIslandModule> = {
  hero: star("hero", HeroIsland),
  gtid: star("gtid", GtidIsland),
  "petak-umpet": star("petak-umpet", PetakUmpetIsland),
  "orbit-store": star("orbit-store", OrbitStoreIsland),
  "ezra-bot": star("ezra-bot", EzraBotIsland),
};
