import { layoutLines } from "./voxelFont";
import { INFO_BOARD, infoBoardTop } from "./shared/boardGeometry";
import { boxCells, postCells, type Cell } from "./shared/local";
import { projectById } from "./shared/project";
import { infoBoardRows, miniBoardLines } from "./shared/text";

/**
 * Single source of island prop positions (island-local, fronts face +z).
 * Components read these to place props; FOOTPRINTS derives collision cells from the same numbers.
 * layouts.test.ts checks: inside 78% of the radius, at least 2 blocks from every crossing anchor (MINI_ANCHOR_CLEARANCE
 * on the radius-4 minis), and every panel on two posts is closed between its posts up to its top row (boardSpan).
 * Voxel titles stay visible from the tour camera (framing.ts): no board, trunk or chart column stands between them.
 */

export const INFO_HALF_SPAN = INFO_BOARD.width / 2 - INFO_BOARD.postInset; // InfoBoard posts at ±1.0
// InfoBoard collision rows: the panel ends ≤ 2.83 above the grass (the hero's wrapped title; layouts.test checks every board)
const INFO_ROWS = 3;

// From the tour camera the title needs the flag on its left and the (2.83-tall, wrapped-title) board on its right, with
// no overlap: at cell 0.13 the island is ~4 px too narrow for both, at 0.12 each side keeps ~16 px. Ezra sits on the
// front rim at (-2, 5) (ezra/seat.ts), so nothing stands there.
export const HERO = {
  tree: { x: 3, z: 1, h: 3, seed: 5 },
  // left of the title, not in front of its B; the cloth flies left (ry = π), away from the letters
  flag: { x: -4.4, z: -0.3, ry: Math.PI },
  // front right; posts land in columns (0, 4) and (2, 4) with ≥ 0.1 to spare from a rounding edge
  info: { x: 1.4, z: 4.3, ry: 0 },
  // integer z: the barrier row (titleCells) holds the letter plane
  title: { x: -1.05, z: -1, cell: 0.12, lines: ["EZRA", "BRILLIANT"] },
  // behind the title: from the tour camera it shows above "EZRA" and covers no letter (any spot in front of the
  // title hid one); two blocks from the 2022 milestone
  map: { x: -0.4, z: -4.4, ry: 0 },
} as const;

export const GTID = {
  chart: { x0: -4, z: -5, heights: [1, 2, 2, 3, 2, 4, 5, 4, 3] },
  lock: { x: 2, z: -5 },
  lamps: { x: 1, z: 3.6 }, // in front of the board, clear of the info board and signpost from the tour camera
  board: { x: 2.7, z: 2.4, w: 4, h: 2.5, y: 2.1, ry: -0.35 },
  title: { x: -1.5, z: -3, cell: 0.32, lines: ["GTID."] },
  info: { x: -4.4, z: 3, ry: 0.35 },
  link: { x: -2.4, z: 5, ry: 0.2 },
  // between the about board and the price board, low enough to leave the title in view, four blocks from the hero bridge
  map: { x: -2.3, z: 1.5, ry: -0.3 },
} as const;

export const PETAK = {
  house: { x0: -3, z0: -2, w: 4, d: 3 },
  trees: [{ x: 3, z: -1, h: 3, seed: 9 }],
  banana: { x: -5, z: -3, h: 2.6 },
  lanterns: [
    { x: -3.0, z: 1.5 },
    { x: -0.4, z: 1.5 },
  ],
  gentong: { x: -0.6, z: 2.8 },
  jemuran: { x0: -4.2, x1: -2.6, z: 5.3 },
  // dirt path from the stair to the front; decoration only (no footprint)
  path: [
    { x: -2, z: 2.35 },
    { x: -1.95, z: 3.1 },
    { x: -1.85, z: 3.85 },
    { x: -1.65, z: 4.6 },
    { x: -1.45, z: 5.35 },
    { x: -1.25, z: 6.1 },
    { x: -1.1, z: 6.85 },
  ],
  // the title: low and wide at the front so it leads but never covers the kid or the house (posts at ±(w / 2 − 0.3))
  sign: { x: 0.9, z: 6.0, ry: -0.3, w: 3.0, h: 1.4 },
  kid: { home: { x: 3.2, z: -1.65 }, peek: -0.45, hide: { x: -1.5, z: -4.3 } },
  info: { x: -4.6, z: 3.2, ry: 0.2 },
  link: { x: 4.6, z: 4, ry: -0.2 },
  // at the bridge head from GTID, left of the house and clear of the about board in the tour view
  map: { x: -6.8, z: 0, ry: -0.6 },
} as const;

export const ORBIT = {
  crates: [
    { x: 2.4, z: 0.9, s: 0.85, ry: 0, stack: 0 },
    { x: 2.45, z: 0.85, s: 0.7, ry: 0.35, stack: 0.85 },
    { x: -2.4, z: -0.7, s: 0.8, ry: -0.2, stack: 0 }, // left of the stall, out from behind the minecart sign
    { x: 2.9, z: -0.6, s: 0.75, ry: 0.15, stack: 0 },
  ],
  logo: { y: 5.05, z: -0.78 },
  receipt: { x: 0.95, y: 1.42, z: 1.03, w: 0.42, maxLen: 1.3 },
  info: { x: -4, z: -0.2, ry: 0.2 },
  link: { x: 3.4, z: 3.8, ry: -0.25 },
  // left of the minecart station from Petak Umpet, clear of the stall and the about board in the tour view
  map: { x: -6.0, z: 1.0, ry: -0.6 },
} as const;

export const EZRA = {
  robot: { x: -1.2, z: 0.2 },
  // forward and tighter (pitch 1.2) so the tour camera reads the replies; w 3.8 fits one 60 px canvas line
  bubbles: { x: 0.5, z: 0.6, ys: [4.8, 3.6, 2.4], w: 3.8, h: 0.9 },
  // low and in front, so from the tour camera it sits under the chat bubbles instead of over the newest one
  screen: { x: 1.8, z: 3.0, w: 2.6, h: 1.0, y: 1.0, ry: -0.2 },
  // front-left, below the bounce pad at (-5, -2) in the tour view so the pad stays visible
  info: { x: -3.5, z: 4.0, ry: 0.3 },
  // right of the screen board, clear of its corner
  link: { x: 3.9, z: 4.3, ry: -0.35 },
  // beside the bounce pad from Orbit, left of the robot
  map: { x: -5.7, z: -0.5, ry: 0 },
} as const;

/* ---------- Web & Apps district (plaza + three radius-4 minis) ---------- */

/** InfoBoard and Signpost on the radius-4 minis are scaled down whole (posts, panel and text): see shared/InfoBoard.tsx. */
export const MINI_BOARD_SCALE = 0.55;
export const MINI_SIGN_SCALE = 0.8;
/** Map board (shared/MapBoard.tsx): a 480 × 300 map canvas on one post, its face centre MAP_BOARD.y above the grass. */
export const MAP_BOARD = { w: 1.5, h: 0.9375, y: 1.2 } as const;
export const MAP_HALF_SPAN = MAP_BOARD.w / 2 - 0.15;

// The plaza: the minecart from Ezra Bot stops on its west side (station ~(-2, 0)), the bridge to POS Monosuko leaves on
// its east side (~(3.5, 1.5)). The district sign stands at the back facing the tour camera, the map board where the
// cart riders step off.
export const PLAZA = {
  // board 2.6 × 1.1 centred 2.2 above the grass (panel 1.65–2.75), posts at ±(w / 2 − 0.1)
  sign: { x: 0, z: -2.2, ry: -0.3, w: 2.6, h: 1.1, y: 2.2 },
  tree: { x: -2, z: -3, h: 3, seed: 17 },
  lamps: [
    { x: 2.4, z: -1.0 },
    // front right, among the flowers: at (−2, 3) it stood in the map board's phone closeup (the camera backs off ~4 blocks)
    { x: 1.0, z: 3.0 },
  ],
  // decoration only (no footprint)
  flowers: [
    { x: -0.9, z: 2.6, c: "#efe7cf" },
    { x: 1.3, z: 2.4, c: "#e8c9a8" },
    { x: 2.6, z: -2.3, c: "#efe7cf" },
    { x: -2.7, z: -1.6, c: "#d9c37a" },
    { x: 0.4, z: 3.1, c: "#efe7cf" },
  ],
  map: { x: 0, z: 0.25, ry: -0.6 },
} as const;

/**
 * Prop clearance around a bridge anchor on the radius-4 minis (2 everywhere else). Their anchors sit only 3 blocks out
 * (0.75 × radius) and the two bridges cut both sides of the island, so a 2-block ring leaves no room for a building row:
 * 1.75 frees the back and front corners while layouts.test.ts still keeps every rope post clear and a walkway from
 * bridge to bridge. Each mini's `stand` is the free cell Ezra uses the screen from.
 */
export const MINI_ANCHOR_CLEARANCE = 1.75;

// POS Monosuko: the plaza bridge lands on the west (~(-2.8, -1.2)), the bridge to Bee leaves on the east (~(2.9, -0.7)).
// The stall stands at the back: wall row z −2, counter row z −1 (cells x −1..1), the screen on the wall above the counter.
export const MONOSUKO = {
  stall: { x0: -1, x1: 1, wallZ: -2, counterZ: -1, wallRows: 4 },
  screen: { x: 0, y: 3.0, z: -2.12, w: 3.4, h: 2.125 },
  // a tabletop charcoal grill on the counter's right end; smoke rises from it
  grill: { x: 1.05, z: -1.0 },
  logo: { x: 0, y: 5.6, z: -2.3, r: 0.72 },
  table: { x: 0.9, z: 1.9 },
  info: { x: -0.75, z: 2.25, ry: -0.6 },
  link: { x: 0.5, z: -0.45, ry: -0.3 },
  map: { x: -1.75, z: 0.5, ry: 0 },
  stand: { x: 0, z: 0 },
} as const;

// Bee Furniture CRM: the bridge from POS Monosuko lands on the west (~(-2.9, 0.7)), the bridge to PeduliPasal leaves on
// the east-front (~(2.4, 1.8)). The shed (back and left walls, open to the front and right) stands at the back left, the
// monitor on its stand at the front right, in front of the shed's open side.
export const BEE = {
  shed: { x0: -1, x1: 1, z0: -2, z1: -1, rows: 3 },
  bench: { x: -0.4, z: -1.85 },
  logs: { x: -2, z: -1 },
  // the stand's column stands under the screen centre (its cell is (2, 0))
  monitor: { x: 1.8, z: 0 },
  screen: { x: 1.8, y: 2.9, z: 0.15, w: 3.4, h: 2.125 },
  // figure-eight flight over the shed roof (3.2 at the back): centre, half-widths along x / z, bob height
  bee: { x: -0.6, y: 3.6, z: -1.4, ax: 1.2, az: 0.8, ay: 0.25 },
  info: { x: 0, z: 2, ry: -0.6 },
  link: { x: -1.5, z: -0.5, ry: -0.3 },
  map: { x: -1, z: 1, ry: -0.6 },
  stand: { x: 1, z: 0 },
} as const;

// PeduliPasal: one bridge, landing on the west-back (~(-2.4, -1.8)). The pavilion stands at the back right, the phone
// on its plinth in front of it.
export const PEDULI = {
  pavilion: { x0: 0, x1: 2, z0: -2, z1: -1 },
  shelf: { x: 1, z: -2.1, w: 2.6, h: 2.2 },
  scales: { x: 1, z: -1.1 },
  // a stone plinth (x −0.05–1.55, cells 0..1 of row 1) with the phone body standing on it; the screen face sits 0.09
  // in front of the body centre, high enough that the front props stay under it in the tour view
  phone: { x: 0.75, z: 0.9, w: 1.42, h: 2.9, plinth: 0.8 },
  screen: { x: 0.75, y: 2.25, z: 0.99, w: 1.25, h: 2.708 },
  // trunk 4 tall: the crown (4–6 up) clears the pavilion roof (3.2–3.6)
  tree: { x: 3, z: 0, h: 4, seed: 59 },
  // x −1: at −0.75 the board's top corner covered the phone's FAB and chips in the tour view
  info: { x: -1, z: 1.75, ry: -0.3 },
  link: { x: -2.5, z: -0.5, ry: -0.3 },
  map: { x: -2, z: 1, ry: -0.6 },
  stand: { x: 1, z: 2 },
} as const;

const rot = (dx: number, ry: number) => ({ x: dx * Math.cos(ry), z: -dx * Math.sin(ry) });

/**
 * Collision for a panel on two posts: the post-to-post line sampled every 0.5 block, `rows` rows tall (up to the
 * panel's top row). The panels hang low (InfoBoard from 1.0, the Petak sign from 0.55): posts alone left a gap Ezra's
 * 0.6-wide body walked through, and a barrier lower than the panel top could be jumped onto from a prop.
 */
function boardSpan(at: { x: number; z: number }, halfSpan: number, ry: number, rows = 2): Cell[] {
  const n = Math.ceil((2 * halfSpan) / 0.5);
  const seen = new Set<string>();
  const out: Cell[] = [];
  for (let i = 0; i <= n; i++) {
    const o = rot(-halfSpan + (2 * halfSpan * i) / n, ry);
    for (const c of postCells(at.x + o.x, at.z + o.z, rows)) {
      const key = c.join();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
  }
  return out;
}

function titleCells(t: { x: number; z: number; cell: number; lines: readonly string[] }): Cell[] {
  const half = (layoutLines(t.lines).width * t.cell) / 2;
  const z = Math.round(t.z);
  return boxCells(Math.round(t.x - half), Math.round(t.x + half), 0, 1, z, z);
}

const trunk = (t: { x: number; z: number; h: number }): Cell[] => boxCells(t.x, t.x, 0, t.h - 1, t.z, t.z);
const mapCells = (m: { x: number; z: number; ry: number }): Cell[] => boardSpan(m, MAP_HALF_SPAN, m.ry, 2);
/** A mini's scaled InfoBoard: posts at ±INFO_HALF_SPAN × scale, barrier rows up to the row its scaled panel top is in. */
function miniInfo(id: string, b: { x: number; z: number; ry: number }): Cell[] {
  const p = projectById(id);
  const top = infoBoardTop(infoBoardRows(p.title, miniBoardLines(p))) * MINI_BOARD_SCALE;
  return boardSpan(b, INFO_HALF_SPAN * MINI_BOARD_SCALE, b.ry, Math.floor(top) + 1);
}

export const FOOTPRINTS: Record<string, Cell[]> = {
  hero: [
    ...trunk(HERO.tree),
    ...postCells(HERO.flag.x, HERO.flag.z, 3),
    ...boardSpan(HERO.info, INFO_HALF_SPAN, HERO.info.ry, INFO_ROWS),
    ...titleCells(HERO.title),
    ...mapCells(HERO.map),
  ],
  gtid: [
    ...GTID.chart.heights.flatMap((h, i) => boxCells(GTID.chart.x0 + i, GTID.chart.x0 + i, 0, h - 1, GTID.chart.z, GTID.chart.z)),
    ...boardSpan(GTID.board, GTID.board.w / 2 - 0.3, GTID.board.ry, 5), // the panel spans 1.62–4.28
    ...titleCells(GTID.title),
    ...boardSpan(GTID.info, INFO_HALF_SPAN, GTID.info.ry, INFO_ROWS),
    ...postCells(GTID.link.x, GTID.link.z),
    ...mapCells(GTID.map),
  ],
  "petak-umpet": [
    ...boxCells(PETAK.house.x0, PETAK.house.x0 + PETAK.house.w - 1, 0, 5, PETAK.house.z0, PETAK.house.z0 + PETAK.house.d - 1),
    // the roof's lowest layer (eave 4.25–4.51 up) overhangs the walls by a block all round: drops must not fall through it
    ...boxCells(PETAK.house.x0 - 1, PETAK.house.x0 + PETAK.house.w, 4, 4, PETAK.house.z0 - 1, PETAK.house.z0 + PETAK.house.d),
    // the stair to the door: two rows in the cell before it, one in the next
    [PETAK.house.x0 + 1, 0, PETAK.house.z0 + PETAK.house.d],
    [PETAK.house.x0 + 1, 1, PETAK.house.z0 + PETAK.house.d],
    [PETAK.house.x0 + 1, 0, PETAK.house.z0 + PETAK.house.d + 1],
    ...PETAK.trees.flatMap(trunk),
    ...trunk(PETAK.banana),
    ...PETAK.lanterns.flatMap((l) => postCells(l.x, l.z)),
    ...postCells(PETAK.gentong.x, PETAK.gentong.z, 1),
    ...postCells(PETAK.jemuran.x0, PETAK.jemuran.z),
    ...postCells(PETAK.jemuran.x1, PETAK.jemuran.z),
    ...boardSpan(PETAK.sign, PETAK.sign.w / 2 - 0.3, PETAK.sign.ry), // the panel spans 0.55–1.95
    ...boardSpan(PETAK.info, INFO_HALF_SPAN, PETAK.info.ry, INFO_ROWS),
    ...postCells(PETAK.link.x, PETAK.link.z),
    ...mapCells(PETAK.map),
  ],
  "orbit-store": [
    ...boxCells(-1, 1, 0, 1, -1, 1),
    ...ORBIT.crates.flatMap((c) => postCells(c.x, c.z, c.stack > 0 ? 2 : 1)),
    ...boardSpan(ORBIT.info, INFO_HALF_SPAN, ORBIT.info.ry, INFO_ROWS),
    ...postCells(ORBIT.link.x, ORBIT.link.z),
    ...mapCells(ORBIT.map),
  ],
  "ezra-bot": [
    ...boxCells(-2, 0, 0, 3, 0, 0),
    ...boardSpan(EZRA.screen, EZRA.screen.w / 2 - 0.25, EZRA.screen.ry), // the panel spans 0.73–1.87
    ...boardSpan(EZRA.info, INFO_HALF_SPAN, EZRA.info.ry, INFO_ROWS),
    ...postCells(EZRA.link.x, EZRA.link.z),
    ...mapCells(EZRA.map),
  ],
  "web-plaza": [
    ...boardSpan(PLAZA.sign, PLAZA.sign.w / 2 - 0.1, PLAZA.sign.ry, 3), // the panel spans 1.65–2.75
    ...trunk(PLAZA.tree),
    ...PLAZA.lamps.flatMap((l) => postCells(l.x, l.z)),
    ...mapCells(PLAZA.map),
  ],
  "pos-monosuko": [
    ...boxCells(MONOSUKO.stall.x0, MONOSUKO.stall.x1, 0, MONOSUKO.stall.wallRows - 1, MONOSUKO.stall.wallZ, MONOSUKO.stall.wallZ),
    ...boxCells(MONOSUKO.stall.x0, MONOSUKO.stall.x1, 0, 0, MONOSUKO.stall.counterZ, MONOSUKO.stall.counterZ),
    ...postCells(MONOSUKO.table.x, MONOSUKO.table.z, 1),
    ...miniInfo("pos-monosuko", MONOSUKO.info),
    ...postCells(MONOSUKO.link.x, MONOSUKO.link.z),
    ...mapCells(MONOSUKO.map),
  ],
  "bee-furniture-crm": [
    ...boxCells(BEE.shed.x0, BEE.shed.x1, 0, BEE.shed.rows - 1, BEE.shed.z0, BEE.shed.z0), // back wall: the bench stands against it
    ...boxCells(BEE.shed.x0, BEE.shed.x0, 0, BEE.shed.rows - 1, BEE.shed.z1, BEE.shed.z1), // left wall's front end
    ...postCells(BEE.shed.x1 + 0.4, BEE.shed.z1 + 0.4, BEE.shed.rows), // front-right roof post
    ...postCells(BEE.logs.x, BEE.logs.z, 1),
    ...postCells(BEE.monitor.x, BEE.monitor.z),
    ...miniInfo("bee-furniture-crm", BEE.info),
    ...postCells(BEE.link.x, BEE.link.z),
    ...mapCells(BEE.map),
  ],
  pedulipasal: [
    ...boxCells(PEDULI.pavilion.x0, PEDULI.pavilion.x1, 0, 2, PEDULI.pavilion.z0, PEDULI.pavilion.z0), // the shelf row, back posts at its ends
    ...boxCells(PEDULI.pavilion.x0, PEDULI.pavilion.x0, 0, 2, PEDULI.pavilion.z1, PEDULI.pavilion.z1), // front posts
    ...boxCells(PEDULI.pavilion.x1, PEDULI.pavilion.x1, 0, 2, PEDULI.pavilion.z1, PEDULI.pavilion.z1),
    ...postCells(PEDULI.scales.x, PEDULI.scales.z, 1),
    ...boxCells(0, 1, 0, 3, 1, 1), // the plinth and the phone on it (x −0.05–1.55, 3.7 tall)
    ...trunk(PEDULI.tree),
    ...miniInfo("pedulipasal", PEDULI.info),
    ...postCells(PEDULI.link.x, PEDULI.link.z),
    ...mapCells(PEDULI.map),
  ],
};
