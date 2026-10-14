import type { FC } from "react";
import { WEB_PLAZA_ID, type IslandPlacement } from "@/world/engine/gen/layout";
import type { IslandModule } from "./types";
import { FOOTPRINTS } from "./layouts";
import { tourStopFor } from "./framing";
import { stampCells } from "./shared/local";
import { HeroIsland } from "./Hero";
import { GtidIsland } from "./Gtid";
import { PetakUmpetIsland } from "./PetakUmpet";
import { OrbitStoreIsland } from "./OrbitStore";
import { EzraBotIsland } from "./EzraBot";
import { PlazaIsland } from "./Plaza";
import { PosMonosukoIsland } from "./PosMonosuko";

/** Every island shares one tour framing (framing.ts) and stamps its FOOTPRINTS cells as barrier collision. */
const island = (id: string, Component: FC<{ placement: IslandPlacement }>): IslandModule => ({
  id,
  Component,
  tourStop: tourStopFor,
  stamp: (grid, p) => stampCells(grid, p, FOOTPRINTS[id]),
});

/** Terrain only: a Web & Apps island before its hand-built module replaces this one (no props, no collision). */
const Bare: FC<{ placement: IslandPlacement }> = () => null;
const bare = (id: string): IslandModule => ({ id, Component: Bare, tourStop: tourStopFor });

/** The island registry: the hero, the four stars, the Web & Apps plaza and its three minis. */
export const ISLANDS: Record<string, IslandModule> = {
  hero: island("hero", HeroIsland),
  gtid: island("gtid", GtidIsland),
  "petak-umpet": island("petak-umpet", PetakUmpetIsland),
  "orbit-store": island("orbit-store", OrbitStoreIsland),
  "ezra-bot": island("ezra-bot", EzraBotIsland),
  [WEB_PLAZA_ID]: island(WEB_PLAZA_ID, PlazaIsland),
  "pos-monosuko": island("pos-monosuko", PosMonosukoIsland),
  "bee-furniture-crm": bare("bee-furniture-crm"),
  pedulipasal: bare("pedulipasal"),
};
