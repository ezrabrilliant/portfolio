import type { ScreenApp } from "../types";
import { POS_LOGICAL, actPos, autoPos, busyPos, initPos } from "./pos";
import type { PosState } from "./pos";
import { drawPos } from "./posDraw";

export type { PosState } from "./pos";

/** The POS Monosuko cashier screen ("Input Order"), for a LiveScreen (landscape, 640 × 400). */
export const posApp: ScreenApp<PosState> = {
  logical: POS_LOGICAL,
  init: initPos,
  act: actPos,
  auto: autoPos,
  busy: busyPos,
  draw: drawPos,
};
