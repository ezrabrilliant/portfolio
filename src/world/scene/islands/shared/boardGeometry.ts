import type { BoardRows } from "./text";

/**
 * Board and sign extents, shared by the components that draw them (InfoBoard.tsx, Signpost.tsx) and the rules that
 * check them (the collision rows in layouts.ts, the tour views in layouts.test.ts). Blocks, in the board's own frame
 * before its `scale`: x along the face (+x to the right), y up from the grass top, z out of the face.
 */

/** InfoBoard: a panel `width` wide standing on two posts `postH` tall, each set `postInset` in from a panel end. */
export const INFO_BOARD = { width: 2.4, postH: 1.0, postInset: 0.2 } as const;

/** An InfoBoard's top edge above the grass, before scale: the posts, then a panel tall enough for every row. */
export function infoBoardTop(rows: Pick<BoardRows, "height">): number {
  return INFO_BOARD.postH + rows.height;
}

const SIGN_POST_H = 2.1;

/**
 * Signpost: one post `postW` square and `postH` tall; on it a board `boardW` × `boardH` centred at (boardX, boardY),
 * and an arrow head (a square `arrowSize` turned 45°) centred at arrowX.
 */
export const SIGNPOST = {
  postW: 0.16,
  postH: SIGN_POST_H,
  boardX: 0.15,
  boardY: SIGN_POST_H - 0.25,
  boardW: 2.0,
  boardH: 0.5,
  arrowX: 1.27,
  arrowSize: 0.36,
} as const;

/** The sign's face, from the board's left end to the arrow's tip: x −0.85..1.53, y 1.6..2.1. */
export const SIGNPOST_FACE = {
  x0: SIGNPOST.boardX - SIGNPOST.boardW / 2,
  x1: SIGNPOST.arrowX + (SIGNPOST.arrowSize * Math.SQRT2) / 2,
  y0: SIGNPOST.boardY - SIGNPOST.boardH / 2,
  y1: SIGNPOST.boardY + SIGNPOST.boardH / 2,
};

/** The sign's hit area: the face padded to x −1.0..1.6 and z −0.2..0.4 (centre (cx, cz), half extents hx × hz). */
export const SIGNPOST_HIT = { cx: 0.3, cz: 0.1, hx: 1.3, hz: 0.3 } as const;
