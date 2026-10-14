import type { Milestone } from "@/config/schema";
import { wrapWords } from "@/world/scene/islands/shared/text";

/**
 * A milestone plaque (Milestones.tsx): a lighter stone slab on the pillar's front with the year in Pixelify Sans and the
 * title and line in the grotesk. Character limits keep every row inside the slab (≤ 0.53 em per character at these
 * sizes, as InfoBoard measures), so troika never wraps a row on its own.
 */
export const PLAQUE = {
  w: 1.0,
  h: 0.86,
  yearSize: 0.28,
  titleSize: 0.09,
  lineSize: 0.07,
  titleChars: 20,
  lineChars: 26,
} as const;

const YEAR_Y = 0.2; // row centres, measured down from the plaque's top edge
const TITLE_Y = 0.43;
const TITLE_ROW = 0.115;
const LINE_GAP = 0.14;
const LINE_ROW = 0.09;

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
