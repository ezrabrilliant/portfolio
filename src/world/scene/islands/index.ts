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

/** Every star island shares one tour framing (framing.ts) and stamps its FOOTPRINTS cells as barrier collision. */
const star = (id: string, Component: FC<{ placement: IslandPlacement }>): IslandModule => ({
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
  hero: star("hero", HeroIsland),
  gtid: star("gtid", GtidIsland),
  "petak-umpet": star("petak-umpet", PetakUmpetIsland),
  "orbit-store": star("orbit-store", OrbitStoreIsland),
  "ezra-bot": star("ezra-bot", EzraBotIsland),
  [WEB_PLAZA_ID]: bare(WEB_PLAZA_ID),
  "pos-monosuko": bare("pos-monosuko"),
  "bee-furniture-crm": bare("bee-furniture-crm"),
  pedulipasal: bare("pedulipasal"),
};
