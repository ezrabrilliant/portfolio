import type { ScreenApp } from "../types";
import { CRM_LOGICAL, actCrm, autoCrm, busyCrm, initCrm } from "./crm";
import type { CrmState } from "./crm";
import { drawCrm } from "./crmDraw";

export type { CrmState } from "./crm";

/** The Bee Furniture CRM admin dashboard, for a LiveScreen (landscape, 640 × 400). */
export const crmApp: ScreenApp<CrmState> = {
  logical: CRM_LOGICAL,
  init: initCrm,
  act: actCrm,
  auto: autoCrm,
  busy: busyCrm,
  draw: drawCrm,
};
