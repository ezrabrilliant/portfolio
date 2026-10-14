/** Greedy word wrap; a word longer than maxChars sits alone on its line. */
export function wrapWords(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (!current) current = word;
    else if (current.length + 1 + word.length <= maxChars) current += " " + word;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// InfoBoard text area: 2.2 wide (board 2.4 minus margins); title size 0.26, body size 0.2, Schibsted Grotesk 700.
// Measured widths: up to ~0.6 em per character in titles (all caps) and ≤ 0.52 em in body lines, so rows of
// ≤ 14 title / ≤ 21 body characters fit the width and troika never wraps a row on its own (which would overlap).
const TITLE_CHARS = 14;
const BODY_CHARS = 21;
const TITLE_TOP = 0.28; // first title row centre, below the board's top edge
const TITLE_ROW = 0.31; // line pitch of the 0.26 title
const BODY_GAP = 0.34; // last title row centre to first body row centre
const BODY_ROW = 0.3;

export interface BoardRows {
  title: string[];
  body: string[];
  /** Row centres measured down from the board's top edge. */
  titleY: number[];
  bodyY: number[];
  /** Board height that holds every row. */
  height: number;
}

/** InfoBoard layout: a long title wraps onto extra rows and pushes the body (and the board's bottom) down. */
export function infoBoardRows(title: string, lines: readonly string[]): BoardRows {
  const titleRows = wrapWords(title, TITLE_CHARS);
  const body = lines.flatMap((l) => wrapWords(l, BODY_CHARS));
  const titleY = titleRows.map((_, i) => TITLE_TOP + i * TITLE_ROW);
  const bodyTop = TITLE_TOP + (titleRows.length - 1) * TITLE_ROW + BODY_GAP;
  const bodyY = body.map((_, i) => bodyTop + i * BODY_ROW);
  return { title: titleRows, body, titleY, bodyY, height: bodyTop + body.length * BODY_ROW };
}

/**
 * A mini island board's meta rows: the year and the tags joined with " · ", packed greedily into rows of at most
 * `maxChars` (the InfoBoard body limit) so a row never ends on a dangling separator: "2026 · React", "Express · MySQL".
 */
export function metaRows(year: number, tags: readonly string[], maxChars = BODY_CHARS): string[] {
  const rows: string[] = [];
  let current = "";
  for (const item of [String(year), ...tags]) {
    if (!current) current = item;
    else if (current.length + 3 + item.length <= maxChars) current += ` · ${item}`;
    else {
      rows.push(current);
      current = item;
    }
  }
  if (current) rows.push(current);
  return rows;
}
