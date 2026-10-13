import { layoutLines } from "./voxelFont";
import { boxCells, postCells, type Cell } from "./shared/local";

/**
 * Single source of island prop positions (island-local, fronts face +z).
 * Components read these to place props; FOOTPRINTS derives collision cells from the same numbers.
 * layouts.test.ts checks: inside 78% of the radius, at least 2 blocks from every crossing anchor.
 * Voxel titles stay visible from the tour camera (framing.ts): no board, trunk or chart column stands between them.
 */

export const INFO_HALF_SPAN = 1.0; // InfoBoard posts at ±(2.4 / 2 − 0.2)

export const HERO = {
  tree: { x: 3, z: 1, h: 3, seed: 5 },
  flag: { x: -4, z: 1.5 },
  info: { x: 0.2, z: 4.4, ry: 0.1 },
  title: { x: -1, z: -1.5, cell: 0.13, lines: ["EZRA", "BRILLIANT"] },
} as const;

export const GTID = {
  chart: { x0: -4, z: -5, heights: [1, 2, 2, 3, 2, 4, 5, 4, 3] },
  lock: { x: 2, z: -5 },
  lamps: { x: -3, z: 2 },
  board: { x: 2.7, z: 2.4, w: 4, h: 2.5, y: 2.1, ry: -0.35 },
  title: { x: -1, z: -2.5, cell: 0.32, lines: ["GTID."] },
  info: { x: -4.4, z: 3, ry: 0.35 },
  link: { x: -2.4, z: 5, ry: 0.2 },
} as const;

export const PETAK = {
  house: { x0: -3, z0: -2, w: 4, d: 3 },
  trees: [
    { x: 3, z: -1, h: 3, seed: 9 },
    { x: -5, z: -3, h: 2, seed: 13 },
  ],
  lanterns: [
    { x: -3.0, z: 1.5 },
    { x: -0.4, z: 1.5 },
  ],
  sign: { x: 2.6, z: 3, ry: -0.2 },
  kid: { home: { x: 3.2, z: -1.65 }, peek: -0.45, hide: { x: -1.5, z: -4.3 } },
  info: { x: -4.6, z: 3.2, ry: 0.2 },
  link: { x: 4.6, z: 4, ry: -0.2 },
} as const;

export const ORBIT = {
  crates: [
    { x: 2.4, z: 0.9, s: 0.85, ry: 0, stack: 0 },
    { x: 2.45, z: 0.85, s: 0.7, ry: 0.35, stack: 0.85 },
    { x: -2.5, z: 1.1, s: 0.8, ry: -0.2, stack: 0 },
    { x: 2.9, z: -0.6, s: 0.75, ry: 0.15, stack: 0 },
  ],
  logo: { y: 5.05, z: -0.78 },
  receipt: { x: 0.95, y: 1.42, z: 1.03, w: 0.42, maxLen: 1.3 },
  info: { x: -4, z: -0.2, ry: 0.2 },
  link: { x: 3.4, z: 3.8, ry: -0.25 },
} as const;

export const EZRA = {
  robot: { x: -1.2, z: 0.2 },
  bubbles: { x: 0.5, z: 0.4, ys: [5.4, 3.9, 2.4], w: 3.6, h: 0.9 },
  // low and in front, so from the tour camera it sits under the chat bubbles instead of over the newest one
  screen: { x: 2.1, z: 3.0, w: 2.6, h: 1.0, y: 1.0, ry: -0.2 },
  info: { x: -4.4, z: 3, ry: 0.35 },
  // right of the screen board, clear of its corner
  link: { x: 4.4, z: 3.9, ry: -0.35 },
} as const;

const rot = (dx: number, ry: number) => ({ x: dx * Math.cos(ry), z: -dx * Math.sin(ry) });

function boardPosts(at: { x: number; z: number }, halfSpan: number, ry: number): Cell[] {
  return [-1, 1].flatMap((s) => {
    const o = rot(s * halfSpan, ry);
    return postCells(at.x + o.x, at.z + o.z);
  });
}

function titleCells(t: { x: number; z: number; cell: number; lines: readonly string[] }): Cell[] {
  const half = (layoutLines(t.lines).width * t.cell) / 2;
  const z = Math.round(t.z);
  return boxCells(Math.round(t.x - half), Math.round(t.x + half), 0, 1, z, z);
}

const trunk = (t: { x: number; z: number; h: number }): Cell[] => boxCells(t.x, t.x, 0, t.h - 1, t.z, t.z);

export const FOOTPRINTS: Record<string, Cell[]> = {
  hero: [
    ...trunk(HERO.tree),
    ...postCells(HERO.flag.x, HERO.flag.z, 3),
    ...boardPosts(HERO.info, INFO_HALF_SPAN, HERO.info.ry),
    ...titleCells(HERO.title),
  ],
  gtid: [
    ...GTID.chart.heights.flatMap((h, i) => boxCells(GTID.chart.x0 + i, GTID.chart.x0 + i, 0, h - 1, GTID.chart.z, GTID.chart.z)),
    ...boardPosts(GTID.board, GTID.board.w / 2 - 0.3, GTID.board.ry),
    ...titleCells(GTID.title),
    ...boardPosts(GTID.info, INFO_HALF_SPAN, GTID.info.ry),
    ...postCells(GTID.link.x, GTID.link.z),
  ],
  "petak-umpet": [
    ...boxCells(PETAK.house.x0, PETAK.house.x0 + PETAK.house.w - 1, 0, 4, PETAK.house.z0, PETAK.house.z0 + PETAK.house.d - 1),
    [PETAK.house.x0 + 1, 0, PETAK.house.z0 + PETAK.house.d],
    ...PETAK.trees.flatMap(trunk),
    ...PETAK.lanterns.flatMap((l) => postCells(l.x, l.z)),
    ...postCells(PETAK.sign.x, PETAK.sign.z),
    ...boardPosts(PETAK.info, INFO_HALF_SPAN, PETAK.info.ry),
    ...postCells(PETAK.link.x, PETAK.link.z),
  ],
  "orbit-store": [
    ...boxCells(-1, 1, 0, 1, -1, 1),
    ...ORBIT.crates.flatMap((c) => postCells(c.x, c.z, c.stack > 0 ? 2 : 1)),
    ...boardPosts(ORBIT.info, INFO_HALF_SPAN, ORBIT.info.ry),
    ...postCells(ORBIT.link.x, ORBIT.link.z),
  ],
  "ezra-bot": [
    ...boxCells(-2, 0, 0, 3, 0, 0),
    ...boardPosts(EZRA.screen, EZRA.screen.w / 2 - 0.25, EZRA.screen.ry),
    ...boardPosts(EZRA.info, INFO_HALF_SPAN, EZRA.info.ry),
    ...postCells(EZRA.link.x, EZRA.link.z),
  ],
};
