import type { WorldLayout } from "@/world/engine/gen/layout";
import type { ScreenApp } from "../types";
import { drawMap } from "./mapDraw";
import { MAP_LOGICAL, buildMapModel, initialCursor, mapKeyButton, mapRegions, stepIsland } from "./mapModel";

/** The map board's state: the island its button bar points at (arrow keys and the ‹ › buttons move it). */
export interface MapState { cursor: number }

/**
 * A map board's screen app (spec §8): the live layout from above with one hit region per island. Tapping an island (or
 * "Travel to …" / Enter for the cursor island) calls `travel(id)`; ‹ › and the arrow keys move the cursor in tour
 * order. Built once per board: memoise it (LiveScreen keys its state on the app object).
 */
export function mapApp(layout: WorldLayout, here: string, travel: (id: string) => void): ScreenApp<MapState> {
  const model = buildMapModel(layout, here);
  const regions = mapRegions(model);
  const press = (s: MapState, action: string, arg: number | undefined): MapState => {
    if (action === "prev") return { cursor: stepIsland(model, s.cursor, -1) };
    if (action === "next") return { cursor: stepIsland(model, s.cursor, 1) };
    if (action === "go") {
      const i = arg ?? s.cursor;
      const island = model.islands[i];
      if (!island) return s;
      travel(island.id);
      return i === s.cursor ? s : { cursor: i };
    }
    return s;
  };
  return {
    logical: MAP_LOGICAL,
    init: () => ({ cursor: initialCursor(model) }),
    act: (s, action, arg) => press(s, action, arg),
    auto: () => null,
    busy: () => false,
    draw: (ctx, s) => {
      drawMap(ctx, model, s.cursor);
      return regions;
    },
    key: (s, code) => {
      const button = mapKeyButton(code);
      return button ? press(s, button, undefined) : null;
    },
  };
}
