import type { Milestone } from "@/config/schema";
import { wrapWords } from "@/world/scene/islands/shared/text";

/**
 * A milestone plaque (Milestones.tsx): a lighter stone slab on the pillar's front with the year in Pixelify Sans and the
 * title and line in the grotesk. Character limits keep every row inside the slab (≤ 0.53 em per character at these
 * sizes, as InfoBoard measures), so troika never wraps a row on its own.
 */
export const PLAQUE = {
  w: 1.3,
  h: 1.4,
  yearSize: 0.34,
  titleSize: 0.14,
  lineSize: 0.1,
  titleChars: 16,
  lineChars: 23,
} as const;

const YEAR_Y = 0.24; // row centres, measured down from the plaque's top edge
const TITLE_Y = 0.54;
const TITLE_ROW = 0.17;
const LINE_GAP = 0.2;
const LINE_ROW = 0.125;

export interface PlaqueRows {
  title: string[];
  line: string[];
  yearY: number;
  titleY: number[];
  lineY: number[];
  /** height every row needs (≤ PLAQUE.h for the configured milestones) */
  height: number;
}

export function plaqueRows(m: Milestone): PlaqueRows {
  const title = wrapWords(m.title, PLAQUE.titleChars);
  const line = wrapWords(m.line, PLAQUE.lineChars);
  const titleY = title.map((_, i) => TITLE_Y + i * TITLE_ROW);
  const lineTop = titleY[titleY.length - 1] + LINE_GAP;
  const lineY = line.map((_, i) => lineTop + i * LINE_ROW);
  return { title, line, yearY: YEAR_Y, titleY, lineY, height: lineY[lineY.length - 1] + LINE_ROW };
}
