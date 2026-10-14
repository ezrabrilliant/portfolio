import { worldCopy } from "@/config/portfolio";
import { DEFAULT_PARAMS, MODEL_TOP } from "@/world/engine/physics/character";
import { EZRA_REACH } from "@/world/engine/physics/ezraModel";
import { layoutLines } from "./voxelFont";
import { INFO_BOARD, SCREEN_BEZEL, SIGNPOST, SIGNPOST_FACE, infoBoardTop } from "./shared/boardGeometry";
import { boxCells, postCells, type Cell } from "./shared/local";
import { projectById } from "./shared/project";
import { treeBlocks } from "./shared/props";
import { infoBoardRows, miniBoardLines } from "./shared/text";

/**
 * Single source of island prop positions (island-local, fronts face +z).
 * Components read these to place props; FOOTPRINTS derives collision cells from the same numbers.
 * layouts.test.ts checks: inside 78% of the radius, at least 2 blocks from every crossing anchor (MINI_ANCHOR_CLEARANCE
 * on the radius-4 minis); every board, sign and map board has barrier cells along its whole face and posts (slabCells;
 * the GTID price board, the Petak title sign, Ezra Bot's screen board and the plaza's district sign along their posts,
 * boardSpan) up to its top row, so Ezra's model never stands in one; none stands in a drawn prop, and on the minis
 * none hides behind one. Voxel titles stay visible from the tour camera (framing.ts): no board, trunk or chart column
 * stands between them.
 */

/**
 * Ezra's reach (engine/physics/character.ts): on the grass his 1.8-tall box fills rows 0–1 (BODY_ROWS), and a jump
 * rises JUMP_RISE (jumpSpeed² / 2·gravity, the most any frame rate reaches; the 120 Hz substeps peak at ~1.46), lifting
 * the box into row 3 (REACH_ROW). Rows from BODY_ROWS up never stop him walking. His model's top (the mortarboard he
 * wears from the 2026 moment on) stands MODEL_OVER above the box, so a barrier row stops the box at its bottom and the
 * model that much higher.
 */
export const BODY_ROWS = Math.ceil(DEFAULT_PARAMS.height);
export const JUMP_RISE = DEFAULT_PARAMS.jumpSpeed ** 2 / (2 * DEFAULT_PARAMS.gravity);
export const REACH_ROW = Math.floor(DEFAULT_PARAMS.height + JUMP_RISE);
export const MODEL_OVER = MODEL_TOP - DEFAULT_PARAMS.height;
/**
 * How far a visual may brush into the edge of Ezra's 0.6-wide box (his head is 0.54 wide) before it counts as in his
 * way: an overhang reaching less than this into a cell needs no barrier there.
 */
export const SLIVER = 0.1;
/**
 * How far either side of his centre Ezra's model reaches, less SLIVER: the mortarboard's board (0.78 square, ezraModel.ts)
 * once he wears it, wider than his 0.6 box.
 */
export const MODEL_REACH = Math.max(DEFAULT_PARAMS.width / 2, EZRA_REACH.board.half) - SLIVER;

/** A box drawn on an island (island-local centre and size, as PropBlocks draws it), tilted about x or turned about y. */
export interface Slab { x: number; y: number; z: number; sx: number; sy: number; sz: number; rx?: number; ry?: number }

/** A slab's footprint on the grass (centre, half extents along its own axes, turn about y) and its height range. */
export interface Footprint { cx: number; cz: number; hx: number; hz: number; ry: number; y0: number; y1: number }

export function footprintOf(s: Slab): Footprint {
  const c = Math.cos(s.rx ?? 0);
  const n = Math.abs(Math.sin(s.rx ?? 0));
  const hy = (s.sy / 2) * c + (s.sz / 2) * n;
  return { cx: s.x, cz: s.z, hx: s.sx / 2, hz: (s.sz / 2) * c + (s.sy / 2) * n, ry: s.ry ?? 0, y0: s.y - hy, y1: s.y + hy };
}

/** Whether a footprint reaches into the axis-aligned square of half side `half` centred at (x, z) (separating axes). */
export function reaches(f: Footprint, x: number, z: number, half: number): boolean {
  const c = Math.cos(f.ry);
  const s = Math.sin(f.ry);
  // the footprint's own axes after a three.js turn about y: local x → (cos, −sin), local z → (sin, cos)
  const axes = [[1, 0], [0, 1], [c, -s], [s, c]] as const;
  for (const [ax, az] of axes) {
    const square = half * (Math.abs(ax) + Math.abs(az));
    const own = f.hx * Math.abs(ax * c - az * s) + f.hz * Math.abs(ax * s + az * c);
    if (Math.abs((f.cx - x) * ax + (f.cz - z) * az) >= square + own - 1e-9) return false;
  }
  return true;
}

/** A LiveScreen at `s` (face centre, size; facing +z) as the slab of its bezel, which runs SCREEN_BEZEL.depth behind the face. */
export function screenSlab(s: { x: number; y: number; z: number; w: number; h: number }): Slab {
  const { rim, depth } = SCREEN_BEZEL;
  return { x: s.x, y: s.y, z: s.z - depth / 2, sx: s.w + 2 * rim, sy: s.h + 2 * rim, sz: depth };
}

/** A tree's crown blocks (shared/props.ts treeBlocks: everything above its trunk) as slabs. */
export function crownSlabs(t: { x: number; z: number; h: number; seed: number }): Slab[] {
  return treeBlocks(t.x, t.z, t.h, t.seed)
    .filter((b) => b.y > t.h)
    .map((b) => ({ x: b.x, y: b.y, z: b.z, sx: b.sx ?? 1, sy: b.sy ?? 1, sz: b.sz ?? 1 }));
}

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
  // title hid one); two blocks from the 2022 milestone. z −4.25 keeps its post (0.2 behind the face) in row −4: at
  // −4.4 it stood in (0, −5), past 78 % of the radius
  map: { x: -0.4, z: -4.25, ry: 0 },
} as const;

export const GTID = {
  chart: { x0: -4, z: -5, heights: [1, 2, 2, 3, 2, 4, 5, 4, 3] },
  lock: { x: 2, z: -5 },
  lamps: { x: 1, z: 3.6 }, // in front of the board, clear of the info board and signpost from the tour camera
  // x 2.55: at 2.7 the frame's right end (0.38 past the barrier's span) reached into (5, 3), inside the Petak bridge's
  // 2-block ring, where it can't have a barrier
  board: { x: 2.55, z: 2.4, w: 4, h: 2.5, y: 2.1, ry: -0.35 },
  title: { x: -1.5, z: -3, cell: 0.32, lines: ["GTID."] },
  info: { x: -4.4, z: 3, ry: 0.35, title: "gtid.pro" },
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
  info: { x: -4.6, z: 3.2, ry: 0.2, title: "Roblox" },
  // its face reaches 1.53 right of the post: at x 4.6 the arrow's tip stood in (6, 4), past 78 % of the radius
  link: { x: 4.0, z: 4, ry: -0.2 },
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
  info: { x: -4, z: -0.2, ry: 0.2, title: "Orbit Store" },
  // at (3.4, 3.8, −0.25) the arrow's tip stood in (5, 4), past 78 % of the radius, and from the portrait camera the
  // face covered a quarter of the bounce pad
  link: { x: 2.9, z: 4.1, ry: -0.15 },
  // left of the minecart station from Petak Umpet, clear of the stall and the about board in the tour view; at
  // (−6, 1) the bezel's left end stood in (−7, 1), past 78 % of the radius
  map: { x: -5.9, z: 1.1, ry: -0.6 },
} as const;

export const EZRA = {
  // feet centre; its torso is w × d (the head as deep), arms and face plates aside
  robot: { x: -1.2, z: 0.2, w: 1.5, d: 1.0 },
  // forward and tighter (pitch 1.2) so the tour camera reads the replies; w 3.8 fits one 60 px canvas line. The lowest
  // tail tip ends 2.325 up: over Ezra's model standing (2.09 with the mortarboard) and when a barrier row stops his jump
  // (2.29). Each bubble's left edge is at x, its plate d deep inside a slate rim `rim` wider all round; its tail (a
  // square `size` turned 45°) hangs from (tail.x, tail.y) off the bubble's left edge and centre
  bubbles: { x: 0.5, z: 0.6, ys: [5.35, 4.15, 2.95], w: 3.8, h: 0.9, d: 0.16, rim: 0.05, tail: { x: 0.12, y: -0.42, size: 0.29 } },
  // low and in front, so from the tour camera it sits under the chat bubbles instead of over the newest one; x 1.0
  // (from 1.8) leaves room on its right for the link sign, which can't stand further out
  screen: { x: 1.0, z: 3.0, w: 2.6, h: 1.0, y: 1.0, ry: -0.2 },
  // front-left, below the bounce pad at (-5, -2) in the tour view so the pad stays visible; at x −3.5 the panel's left
  // end stood in (−5, 4), past 78 % of the radius
  info: { x: -3.35, z: 4.0, ry: 0.3, title: "Discord" },
  // right of the screen board, clear of it and of the minecart sign in the tour view; at (3.9, 4.3) the arrow's tip
  // stood in (5, 5), past 78 % of the radius
  link: { x: 3.1, z: 3.9, ry: -0.35 },
  // in front of the bounce pad from Orbit, left of the robot: at (−5.7, −0.5) it hid the pad from both tour cameras;
  // at (−6, 0.75) the bezel's left end stood in (−7, 0), past 78 % of the radius
  map: { x: -5.85, z: 0.8, ry: -0.6 },
} as const;

/* ---------- Web & Apps district (plaza + three radius-4 minis) ---------- */

/** InfoBoard and Signpost on the radius-4 minis are scaled down whole (posts, panel and text): see shared/InfoBoard.tsx. */
export const MINI_BOARD_SCALE = 0.55;
export const MINI_SIGN_SCALE = 0.8;
/** Map board (shared/MapBoard.tsx): a 480 × 300 map canvas on one post, its face centre MAP_BOARD.y above the grass. */
export const MAP_BOARD = { w: 1.5, h: 0.9375, y: 1.2 } as const;
/** A map board's bezel (the LiveScreen frame) reaches this far either side of its centre, SCREEN_BEZEL.rim past the face. */
export const MAP_HALF_SPAN = MAP_BOARD.w / 2 + SCREEN_BEZEL.rim;

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
  // x 0.15: at 0 the bezel's left end stood in (−1, 0), on the minecart station
  map: { x: 0.15, z: 0.25, ry: -0.6 },
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
  // a tabletop charcoal grill on the counter's right end (w × d, its chicken pieces up to `top`); smoke rises from it
  grill: { x: 1.05, z: -1.0, w: 0.7, d: 0.45, top: 1.4 },
  // the badge stands on the awning; its top is at the edge of the desktop tour frame, so neither can rise
  logo: { x: 0, y: 5.6, z: -2.3, r: 0.72 },
  // the awning over the screen (monosuko/awning.ts): `stripes` slabs across w, `len` long and centred at z, sloping down
  // `tilt` from `top` (their top at the back edge) to a `valance` along the front. The phone's tour camera looks down
  // steeply (its sight line from the screen's top edge climbs ~0.62 per block), so the front edge stays ~0.5 in front of
  // the screen; layouts.test keeps all of it above the screen from both tour cameras
  awning: { x: 0, z: -2.1, w: 3.6, stripes: 6, len: 1.0, top: 5.0, tilt: 0.25, valance: 0.1 },
  table: { x: 0.9, z: 1.9 },
  info: { x: -0.75, z: 2.25, ry: -0.6 },
  // front right, its face in row 1: at (0.5, −0.45) the face stood over the stand and the counter's end, reached into
  // the Bee bridge's ring at (2, 0), and its barrier made a stair (counter, sign, grill) onto the stall's wall
  link: { x: 1.1, z: 0.65, ry: -0.3 },
  // 0.25 forward of (−1.75, 0.5): there the info board crossed the phone closeup's line to the board
  map: { x: -1.75, z: 0.75, ry: -0.15 },
  stand: { x: 0, z: 0 },
} as const;

// Bee Furniture CRM: the bridge from POS Monosuko lands on the west (~(-2.9, 0.7)), the bridge to PeduliPasal leaves on
// the east-front (~(2.4, 1.8)). The shed (back and left walls, open to the front and right) stands at the back left, the
// monitor on its stand at the front right, in front of the shed's open side.
export const BEE = {
  shed: { x0: -1, x1: 1, z0: -2, z1: -1, rows: 3 },
  // `planks` roof planks (w × thick × depth, tilted `tilt` front-down) every half block from the back wall's outer
  // edge; their centre line is `back` up there and drops `slope` per block toward the front (beeRoofY)
  roof: { back: 3.2, slope: 0.24, planks: 5, w: 3.4, thick: 0.16, depth: 0.55, tilt: 0.2 },
  bench: { x: -0.4, z: -1.85 },
  logs: { x: -2, z: -1 },
  // the stand's column stands under the screen centre (its cell is (2, 0))
  monitor: { x: 1.8, z: 0 },
  // raised so its bezel (2.31 up) clears Ezra's model standing under it (2.09 with the mortarboard) and when a barrier row
  // stops his jump (2.29)
  screen: { x: 1.8, y: 3.45, z: 0.15, w: 3.4, h: 2.125 },
  // figure-eight flight over the shed roof (3.2 at the back): centre, half-widths along x / z, bob height
  bee: { x: -0.6, y: 3.6, z: -1.4, ax: 1.2, az: 0.8, ay: 0.25 },
  // turned 0.3 more than (0, 2, −0.6), so the sign behind it shows whole in the tour view
  info: { x: 0.1, z: 2, ry: -0.9 },
  // in front of the shed's left wall, facing the front: at (−1.5, −0.5) the face stood in (−2, 0), inside the POS
  // bridge's ring, and over the log pile
  link: { x: -0.9, z: -0.4, ry: 0 },
  // forward of (−1, 1), where its top edge cut into the "Try the CRM" sign in the desktop tour view; at (−1, 1.25) the
  // bezel's left end stood in (−2, 1), inside the POS bridge's ring
  map: { x: -0.75, z: 1.15, ry: -0.45 },
  // in front of the screen, facing it
  stand: { x: 2, z: 1 },
} as const;

// PeduliPasal: one bridge, landing on the west-back (~(-2.4, -1.8)). The pavilion stands at the back right, the phone
// on its plinth in front of it.
export const PEDULI = {
  pavilion: { x0: 0, x1: 2, z0: -2, z1: -1 },
  // the flat roof, centred on the pavilion: a lower slab overhanging the posts (its underside 3.61 up, over Ezra's
  // mortarboard at a jump's top, ~3.59), a smaller one set into it on top, ending just under the tree's lowest leaves (4.0)
  roof: [
    { y: 3.72, sx: 3.6, sy: 0.22, sz: 2.6 },
    { y: 3.88, sx: 3.0, sy: 0.2, sz: 2.0 },
  ],
  shelf: { x: 1, z: -2.1, w: 2.6, h: 2.2 },
  // left of the phone's sight lines, its table's back edge just clear of the book spines: at (1, −1.1) the phone hid it
  // from both tour cameras. x 0.5 keeps its barrier in cell (1, −1) (postCells rounds up), the post column takes cell 0
  scales: { x: 0.5, z: -1.4 },
  // a stone plinth `plinth` tall, plinthW × plinthD (x −0.05–1.55, z 0.45–1.35: cells 0..1 of row 1), with the phone
  // body (w × h × d) standing on it; the screen face sits 0.09 in front of the body centre, high enough that the front
  // props stay under it in the tour view
  phone: { x: 0.75, z: 0.9, w: 1.42, h: 2.9, d: 0.16, plinth: 0.8, plinthW: 1.6, plinthD: 0.9 },
  screen: { x: 0.75, y: 2.25, z: 0.99, w: 1.25, h: 2.708 },
  // trunk 4 tall: the crown (4–6 up) clears the pavilion roof (3.61–3.98)
  tree: { x: 3, z: 0, h: 4, seed: 59 },
  // right of the phone, turned to the tour camera: its left end and posts stand 0.3 clear of the plinth (x 1.55), and
  // both tour views show a gap between it and the phone. At (2, 1.1, −0.6) that end and its post sank into the plinth;
  // on the left at (−1, 2) it hid the sign behind it in the tour view, and any spot right of that covered the phone
  info: { x: 2.2, z: 0.9, ry: -1.05 },
  // at (−2.5, −0.5) the face stood in column −3: off the grass, over a rope post and inside the bridge's ring
  link: { x: -1.9, z: -0.4, ry: -0.3 },
  // by the bridge head, forward of (−2, 1), where its top edge cut into the "Get the APK" sign in the desktop view; at
  // (−2, 1.25) the bezel's left end stood in (−3, 1), off the grass
  map: { x: -1.85, z: 1.05, ry: -0.6 },
  stand: { x: 1, z: 2 },
} as const;

/** The Bee shed roof's centre line above island-local z (BeeCrm.tsx also stops the left wall's top row under it). */
export function beeRoofY(z: number): number {
  return BEE.roof.back - BEE.roof.slope * (z - (BEE.shed.z0 - 0.5));
}

/** The Bee shed roof's planks, back to front, as BeeCrm.tsx draws them. */
export function beeRoofPlanks(): Slab[] {
  const r = BEE.roof;
  return Array.from({ length: r.planks }, (_, i) => {
    const z = BEE.shed.z0 - 0.5 + i * 0.5;
    return { x: 0, y: beeRoofY(z), z, sx: r.w, sy: r.thick, sz: r.depth, rx: r.tilt };
  });
}

/** Ezra Bot's chat bubbles as slabs: each plate in its rim, and its tail (the turned square's box, its tip exact). */
export function bubbleSlabs(): Slab[] {
  const b = EZRA.bubbles;
  const tail = b.tail.size * Math.SQRT2;
  return b.ys.flatMap((y) => [
    { x: b.x + b.w / 2, y, z: b.z, sx: b.w + 2 * b.rim, sy: b.h + 2 * b.rim, sz: b.d },
    { x: b.x + b.tail.x, y: y + b.tail.y, z: b.z, sx: tail, sy: tail, sz: b.d },
  ]);
}

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
/**
 * Within this of a cell's centre, what hangs overhead is in reach of Ezra's model at its widest (MODEL_REACH, the
 * mortarboard's board) while his box stands in the cell.
 */
const CELL_REACH = 0.5 - DEFAULT_PARAMS.width / 2 + MODEL_REACH;

/**
 * The cells a thin slab (a board's panel, a sign's face, a post: under 2 × SLIVER deep) stands in, from row 0 up to the
 * row its top is in (`rows` to set another height): every cell its centre plane crosses, short of each end by as much
 * as keeps every corner of that end within SLIVER (along x and along z) of the plane's last point. Wherever Ezra's
 * body (his box less SLIVER) touches the slab, his box then reaches past that point into one of the cells.
 */
export function slabCells(s: Slab, rows?: number): Cell[] {
  const depth = s.sz / 2;
  if (depth >= SLIVER) throw new Error(`slabCells: a slab ${s.sz} deep is not thin`);
  const c = Math.abs(Math.cos(s.ry ?? 0));
  const n = Math.abs(Math.sin(s.ry ?? 0));
  // an end corner sits `trim` along the face and `depth` across it from the plane's last point
  const trim = Math.min(c > 1e-9 ? (SLIVER - depth * n) / c : Infinity, n > 1e-9 ? (SLIVER - depth * c) / n : Infinity);
  // a hair deep, so a plane lying on a cell edge stands in the cells either side of it (an end on an edge does not, but
  // a post trimmed to a point on an edge does)
  const f = footprintOf({ ...s, sx: Math.max(2e-6, s.sx - 2 * trim), sz: 2e-6 });
  const top = rows ?? Math.ceil(footprintOf(s).y1);
  const r = f.hx + f.hz;
  const out: Cell[] = [];
  for (let x = Math.floor(f.cx - r) - 1; x <= Math.ceil(f.cx + r) + 1; x++) {
    for (let z = Math.floor(f.cz - r) - 1; z <= Math.ceil(f.cz + r) + 1; z++) {
      if (reaches(f, x, z, 0.5)) out.push(...boxCells(x, x, 0, top - 1, z, z));
    }
  }
  return out;
}

/** Cells without repeats, in their first order. */
function unique(cells: Cell[]): Cell[] {
  const seen = new Set<string>();
  return cells.filter((c) => {
    const key = c.join();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** An InfoBoard's panel (boardGeometry.ts INFO_BOARD, scaled whole): from its post tops to the top edge its rows need. */
export function infoSlab(at: { x: number; z: number; ry: number }, title: string, lines: readonly string[], scale = 1): Slab {
  const y0 = INFO_BOARD.postH * scale;
  const y1 = infoBoardTop(infoBoardRows(title, lines)) * scale;
  return { x: at.x, y: (y0 + y1) / 2, z: at.z, sx: INFO_BOARD.width * scale, sy: y1 - y0, sz: INFO_BOARD.depth * scale, ry: at.ry };
}

/** An InfoBoard's two posts (shared/InfoBoard.tsx, scaled whole), from the grass up behind the panel. */
export function infoPostSlabs(at: { x: number; z: number; ry: number }, scale = 1): Slab[] {
  const { width, postInset, postW, postZ, postH, postOver } = INFO_BOARD;
  const h = (postH + postOver) * scale;
  return [-1, 1].map((side) => {
    const dx = side * (width / 2 - postInset) * scale;
    const dz = postZ * scale;
    return {
      x: at.x + Math.cos(at.ry) * dx + Math.sin(at.ry) * dz,
      y: h / 2,
      z: at.z - Math.sin(at.ry) * dx + Math.cos(at.ry) * dz,
      sx: postW * scale,
      sy: h,
      sz: postW * scale,
      ry: at.ry,
    };
  });
}

/** A map board's post (shared/MapBoard.tsx draws it): `w` square, standing `back` behind the face, up to the face's centre. */
export const MAP_POST = { w: 0.12, back: 0.2 } as const;

/** A map board's bezel (shared/MapBoard.tsx: a LiveScreen MAP_BOARD.y up, turned by ry) and its post. */
export function mapSlabs(m: { x: number; z: number; ry: number }): Slab[] {
  const back = (d: number) => ({ x: m.x - Math.sin(m.ry) * d, z: m.z - Math.cos(m.ry) * d });
  const bezel = screenSlab({ x: m.x, y: MAP_BOARD.y, z: m.z, w: MAP_BOARD.w, h: MAP_BOARD.h });
  return [
    { ...bezel, ...back(SCREEN_BEZEL.depth / 2), ry: m.ry },
    { ...back(MAP_POST.back), y: MAP_BOARD.y / 2, sx: MAP_POST.w, sy: MAP_BOARD.y, sz: MAP_POST.w, ry: m.ry },
  ];
}

/** A Signpost (scaled whole): its face (board and arrow head, SIGNPOST_FACE, faceZ in front of the post) and its post. */
export function signSlabs(l: { x: number; z: number; ry: number }, scale = 1): Slab[] {
  const f = SIGNPOST_FACE;
  const cx = ((f.x0 + f.x1) / 2) * scale;
  const cz = SIGNPOST.faceZ * scale;
  return [
    {
      x: l.x + Math.cos(l.ry) * cx + Math.sin(l.ry) * cz,
      y: ((f.y0 + f.y1) / 2) * scale,
      z: l.z - Math.sin(l.ry) * cx + Math.cos(l.ry) * cz,
      sx: (f.x1 - f.x0) * scale,
      sy: (f.y1 - f.y0) * scale,
      sz: SIGNPOST.faceDepth * scale,
      ry: l.ry,
    },
    { x: l.x, y: (SIGNPOST.postH * scale) / 2, z: l.z, sx: SIGNPOST.postW * scale, sy: SIGNPOST.postH * scale, sz: SIGNPOST.postW * scale, ry: l.ry },
  ];
}

/** A map board's barrier: every cell its bezel or post stands in, rows 0–1 (its top is 1.75 up). */
const mapCells = (m: { x: number; z: number; ry: number }): Cell[] => unique(mapSlabs(m).flatMap((sl) => slabCells(sl, 2)));
/** A Signpost's barrier: every cell its face or post stands in, up to the row the face's top is in. */
const signCells = (l: { x: number; z: number; ry: number }, scale = 1): Cell[] => {
  const [face, post] = signSlabs(l, scale);
  const rows = Math.ceil(footprintOf(face).y1);
  return unique([...slabCells(face, rows), ...slabCells(post, rows)]);
};
/** An InfoBoard's barrier: every cell its panel or a post stands in, up to the row its top is in (`rows` to set another height). */
function infoCells(b: { x: number; z: number; ry: number }, title: string, lines: readonly string[], scale = 1, rows?: number): Cell[] {
  const panel = infoSlab(b, title, lines, scale);
  const top = rows ?? Math.ceil(footprintOf(panel).y1);
  return unique([panel, ...infoPostSlabs(b, scale)].flatMap((sl) => slabCells(sl, top)));
}
/** A mini's InfoBoard, scaled by MINI_BOARD_SCALE. */
function miniInfo(id: string, b: { x: number; z: number; ry: number }): Cell[] {
  const p = projectById(id);
  return infoCells(b, p.title, miniBoardLines(p), MINI_BOARD_SCALE);
}

/**
 * Ceiling cells under overhead slabs, so no jump puts Ezra's model through them: in each cell where his box would put his
 * model (MODEL_REACH either side of him) under a slab, the rows from the highest one that still stops the model's top
 * (MODEL_OVER above the box) under the slab, but never his body's rows, up to the highest row a jump from the grass lifts
 * the box to (REACH_ROW), as the board barriers rise to their panel's top row. A slab above the model's whole jump needs
 * none. Cells in `keepClear` stay open: they lie in a crossing's clearance ring or over its station (layouts.test lists
 * the gap each one leaves).
 */
function capCells(slabs: readonly Slab[], keepClear: readonly (readonly [number, number])[] = []): Cell[] {
  const out: Cell[] = [];
  for (const s of slabs) {
    const f = footprintOf(s);
    if (f.y0 >= MODEL_TOP + JUMP_RISE) continue;
    const lo = Math.max(BODY_ROWS, Math.floor(f.y0 - MODEL_OVER));
    const hi = Math.min(REACH_ROW, Math.ceil(f.y1) - 1);
    const r = f.hx + f.hz;
    for (let x = Math.floor(f.cx - r); x <= Math.ceil(f.cx + r); x++) {
      for (let z = Math.floor(f.cz - r); z <= Math.ceil(f.cz + r); z++) {
        if (!reaches(f, x, z, CELL_REACH) || keepClear.some(([kx, kz]) => kx === x && kz === z)) continue;
        for (let y = lo; y <= hi; y++) out.push([x, y, z]);
      }
    }
  }
  return out;
}

/** An island's prop cells, then the ceiling cells over them that no prop claims yet. */
function withCaps(cells: Cell[], caps: Cell[]): Cell[] {
  const seen = new Set(cells.map((c) => c.join()));
  const out = [...cells];
  for (const c of caps) {
    const key = c.join();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

/** Every island's prop cells, from the spots above (FOOTPRINTS). */
function buildFootprints(): Record<string, Cell[]> {
  return {
  hero: [
    ...trunk(HERO.tree),
    ...postCells(HERO.flag.x, HERO.flag.z, 3),
    ...infoCells(HERO.info, worldCopy.location, [worldCopy.heroLine], 1, INFO_ROWS),
    ...titleCells(HERO.title),
    ...mapCells(HERO.map),
  ],
  gtid: [
    ...GTID.chart.heights.flatMap((h, i) => boxCells(GTID.chart.x0 + i, GTID.chart.x0 + i, 0, h - 1, GTID.chart.z, GTID.chart.z)),
    ...boardSpan(GTID.board, GTID.board.w / 2 - 0.3, GTID.board.ry, 5), // the panel spans 1.62–4.28
    ...titleCells(GTID.title),
    ...infoCells(GTID.info, GTID.info.title, projectById("gtid").stats ?? [], 1, INFO_ROWS),
    ...signCells(GTID.link),
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
    ...infoCells(PETAK.info, PETAK.info.title, projectById("petak-umpet").stats ?? [], 1, INFO_ROWS),
    ...signCells(PETAK.link),
    ...mapCells(PETAK.map),
  ],
  "orbit-store": [
    ...boxCells(-1, 1, 0, 1, -1, 1),
    ...ORBIT.crates.flatMap((c) => postCells(c.x, c.z, c.stack > 0 ? 2 : 1)),
    ...infoCells(ORBIT.info, ORBIT.info.title, projectById("orbit-store").stats ?? [], 1, INFO_ROWS),
    ...signCells(ORBIT.link),
    ...mapCells(ORBIT.map),
  ],
  "ezra-bot": withCaps(
    [
      ...boxCells(-2, 0, 0, 3, 0, 0),
      // the torso and head (robot.d deep around z 0.2, face plates ~0.08 more) reach 0.28 into row z 1 from x −1.95
      // to −0.45: walking up to the robot or jumping in front of it put Ezra's face into its chest and head
      ...boxCells(-2, -1, 0, 3, 1, 1),
      ...boardSpan(EZRA.screen, EZRA.screen.w / 2 - 0.25, EZRA.screen.ry), // the panel spans 0.73–1.87
      ...infoCells(EZRA.info, EZRA.info.title, projectById("ezra-bot").stats ?? []), // one stat: the panel ends 1.92 up
      ...signCells(EZRA.link),
      ...mapCells(EZRA.map),
    ],
    // the bubbles' right half, (3, 1) and (4, 1), hangs over the minecart station (and (4, 1) in its 2-block ring)
    capCells(bubbleSlabs(), [[3, 1], [4, 1]]),
  ),
  "web-plaza": withCaps(
    [
      ...boardSpan(PLAZA.sign, PLAZA.sign.w / 2 - 0.1, PLAZA.sign.ry, 3), // the panel spans 1.65–2.75
      ...trunk(PLAZA.tree),
      ...PLAZA.lamps.flatMap((l) => postCells(l.x, l.z)),
      ...mapCells(PLAZA.map),
    ],
    // the crown's lowest layer is 3.0 up: rows 2–3 under it keep the hair below it. Its corner (−3, −2) lies in the
    // minecart's 2-block ring (a 4-tall trunk would lift the crown out of reach, but cut its top off the desktop view)
    capCells(crownSlabs(PLAZA.tree), [[-3, -2]]),
  ),
  "pos-monosuko": [
    ...boxCells(MONOSUKO.stall.x0, MONOSUKO.stall.x1, 0, MONOSUKO.stall.wallRows - 1, MONOSUKO.stall.wallZ, MONOSUKO.stall.wallZ),
    ...boxCells(MONOSUKO.stall.x0, MONOSUKO.stall.x1, 0, 0, MONOSUKO.stall.counterZ, MONOSUKO.stall.counterZ),
    // rows 1–2 over the counter's grill end: stepping onto the counter neither stands Ezra in the grill (up to 1.4)
    // nor lets him onto an invisible ledge above it. The screen's ends (x ±1.5–1.78) hang over (±2, −2), in the
    // bridges' clearance rings: no ceiling there (layouts.test lists the gap)
    ...boxCells(Math.round(MONOSUKO.grill.x), Math.round(MONOSUKO.grill.x), 1, 2, Math.round(MONOSUKO.grill.z), Math.round(MONOSUKO.grill.z)),
    ...postCells(MONOSUKO.table.x, MONOSUKO.table.z, 1),
    ...miniInfo("pos-monosuko", MONOSUKO.info),
    ...signCells(MONOSUKO.link, MINI_SIGN_SCALE),
    ...mapCells(MONOSUKO.map),
  ],
  "bee-furniture-crm": withCaps(
    [
      ...boxCells(BEE.shed.x0, BEE.shed.x1, 0, BEE.shed.rows - 1, BEE.shed.z0, BEE.shed.z0), // back wall: the bench stands against it
      ...boxCells(BEE.shed.x0, BEE.shed.x0, 0, BEE.shed.rows - 1, BEE.shed.z1, BEE.shed.z1), // left wall's front end
      ...postCells(BEE.shed.x1 + 0.4, BEE.shed.z1 + 0.4, BEE.shed.rows), // front-right roof post
      // two rows: on top of a one-row log pile Ezra's head stood in the roof's left eave (x −1.7 to −1.5)
      ...postCells(BEE.logs.x, BEE.logs.z, 2),
      ...postCells(BEE.monitor.x, BEE.monitor.z),
      ...miniInfo("bee-furniture-crm", BEE.info),
      ...signCells(BEE.link, MINI_SIGN_SCALE),
      ...mapCells(BEE.map),
    ],
    // under the roof (eaves 0.2–0.29 past the shed on every side) and the monitor (bezel 2.31–4.59 up, x 0.02–3.58):
    // Ezra still walks under both in rows 0–1. The roof's front-left corner (−2, 0) lies in the bridge's clearance ring
    capCells([...beeRoofPlanks(), screenSlab(BEE.screen)], [[-2, 0]]),
  ),
  pedulipasal: [
    ...boxCells(PEDULI.pavilion.x0, PEDULI.pavilion.x1, 0, 2, PEDULI.pavilion.z0, PEDULI.pavilion.z0), // the shelf row, back posts at its ends
    ...boxCells(PEDULI.pavilion.x0, PEDULI.pavilion.x0, 0, 2, PEDULI.pavilion.z1, PEDULI.pavilion.z1), // front posts
    ...boxCells(PEDULI.pavilion.x1, PEDULI.pavilion.x1, 0, 2, PEDULI.pavilion.z1, PEDULI.pavilion.z1),
    // the scales (1.3 high) and their table: two rows, so Ezra can't step up into them. Boxed in by the front posts and
    // the shelf, nothing reaches the top row. The roof's eave (0.2–0.3 past these cells) is high enough to need no
    // ceiling (PEDULI.roof)
    ...postCells(PEDULI.scales.x, PEDULI.scales.z, 2),
    ...boxCells(0, 1, 0, 3, 1, 1), // the plinth and the phone on it (x −0.05–1.55, 3.7 tall)
    ...trunk(PEDULI.tree),
    ...miniInfo("pedulipasal", PEDULI.info),
    ...signCells(PEDULI.link, MINI_SIGN_SCALE),
    ...mapCells(PEDULI.map),
  ],
  };
}

export const FOOTPRINTS: Record<string, Cell[]> = buildFootprints();
