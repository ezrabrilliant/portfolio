/** 5-row block glyphs for in-world voxel titles. Only the letters the titles use; add glyphs as titles need them. */
export const GLYPH_HEIGHT = 5;

export const GLYPHS: Record<string, readonly string[]> = {
  A: [".###.", "#...#", "#####", "#...#", "#...#"],
  B: ["####.", "#...#", "####.", "#...#", "####."],
  D: ["####.", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "####.", "#....", "#####"],
  G: [".####", "#....", "#..##", "#...#", ".###."],
  I: ["###", ".#.", ".#.", ".#.", "###"],
  L: ["#....", "#....", "#....", "#....", "#####"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#"],
  R: ["####.", "#...#", "####.", "#..#.", "#...#"],
  T: ["#####", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "...#.", "..#..", ".#...", "#####"],
  ".": [".", ".", ".", ".", "#"],
  " ": ["..", "..", "..", "..", ".."],
};

export interface GlyphCell { x: number; y: number }

/** Cells of one line, left-aligned from x = 0, bottom row y = 0, one empty column between glyphs. */
export function layoutText(text: string): { cells: GlyphCell[]; width: number } {
  const cells: GlyphCell[] = [];
  let cursor = 0;
  [...text.toUpperCase()].forEach((ch, i) => {
    const glyph = GLYPHS[ch];
    if (!glyph) throw new Error(`Unsupported glyph: ${ch}`);
    if (i > 0) cursor += 1;
    glyph.forEach((row, r) => {
      [...row].forEach((c, k) => {
        if (c === "#") cells.push({ x: cursor + k, y: GLYPH_HEIGHT - 1 - r });
      });
    });
    cursor += glyph[0].length;
  });
  return { cells, width: cursor };
}

/** Cell centres of several centred lines: x relative to the block's centre, y from its bottom (both in cell units). */
export function layoutLines(lines: readonly string[], lineGap = 2): { cells: GlyphCell[]; width: number; height: number } {
  const laid = lines.map(layoutText);
  const width = Math.max(...laid.map((l) => l.width));
  const height = lines.length * GLYPH_HEIGHT + (lines.length - 1) * lineGap;
  const cells: GlyphCell[] = [];
  laid.forEach((l, i) => {
    const yOff = (lines.length - 1 - i) * (GLYPH_HEIGHT + lineGap);
    const xOff = (width - l.width) / 2;
    for (const c of l.cells) cells.push({ x: c.x + xOff - width / 2 + 0.5, y: c.y + yOff + 0.5 });
  });
  return { cells, width, height };
}
