/**
 * Ezra's model, measured in blocks (no three.js here, so engine code may read it): scene/Ezra.tsx builds him from
 * these, scene/graduation.ts cuts the gown and the mortarboard to them, and the clearance rules (scene/islands/layouts)
 * read how far the model reaches past his collision box. Body space: feet at the origin, facing +z, his left +x.
 */

/**
 * His body: Ezra.tsx builds his model from these and the gown is cut to them, so the two cannot drift apart.
 * - torso and hips: their half width and depth, and their bottom and top heights.
 * - arm: hangs from its shoulder pivot. The tee sleeve runs from `top` above the pivot down to `sleeve` below it; the
 *   skin (forearm and hand) runs from `skin.top` below it down to the hand's bottom, `hand` below it.
 * - thigh: hangs from the hip pivot (LEG in scene/ezra/anim.ts), `top` above it and `bottom` below it; the shin below
 *   the knee shares its half width.
 * - shoe: the shoe's top above the sole.
 */
export const EZRA_FIT = {
  torso: { halfW: 0.28, halfD: 0.16, bottom: 0.75, top: 1.33 },
  hips: { halfW: 0.25, halfD: 0.15, bottom: 0.56, top: 0.76 },
  shoulder: { x: 0.37, y: 1.28 },
  arm: { halfW: 0.09, halfD: 0.1, top: 0.02, sleeve: 0.2, skin: { halfW: 0.075, halfD: 0.08, top: 0.19 }, hand: 0.55 },
  thigh: { half: 0.11, top: 0.02, bottom: 0.39 },
  shoe: 0.12,
} as const;

/**
 * His head: its pivot (the head's base) `pivot` above his feet, and the highest of its hair boxes, the messy volume on
 * top (its centre `y` above the pivot and its height `h`).
 */
export const EZRA_HEAD = { pivot: 1.36, crown: { y: 0.595, h: 0.11 } } as const;

/**
 * The graduation mortarboard, worn from the 2026 moment on: its base `base` above the head pivot, then the skull cap,
 * the square board and the centre button, each with its size and its centre height `y` above the base.
 */
export const EZRA_CAP = {
  base: 0.49,
  skull: { w: 0.6, h: 0.18, d: 0.54 },
  board: { size: 0.78, h: 0.035, y: 0.1975 },
  button: { size: 0.07, h: 0.025, y: 0.2275 },
} as const;

/**
 * How far the model reaches above his feet, in its neutral pose: the hair's top, and with the mortarboard on, the
 * button's top and the board (half its width either side of him, from its underside to its top). The tassel hangs
 * beside his face, inside the board's reach.
 */
export const EZRA_REACH = (() => {
  const capBase = EZRA_HEAD.pivot + EZRA_CAP.base;
  const { board, button } = EZRA_CAP;
  return {
    hairTop: EZRA_HEAD.pivot + EZRA_HEAD.crown.y + EZRA_HEAD.crown.h / 2,
    capTop: capBase + button.y + button.h / 2,
    board: { half: board.size / 2, bottom: capBase + board.y - board.h / 2, top: capBase + board.y + board.h / 2 },
  };
})();
