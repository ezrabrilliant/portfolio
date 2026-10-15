import { worldCopy } from "@/config/portfolio";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { Collider } from "@/world/engine/physics/colliders";
import {
  BEE, EZRA, GTID, HERO, MINI_BOARD_SCALE, MINI_SIGN_SCALE, MONOSUKO, ORBIT, PEDULI, PETAK, PLAZA,
  bubbleSlabs, infoPostSlabs, infoSlab, mapSlabs, screenSlab, signSlabs, type Slab,
} from "./layouts";
import { shedBlocks } from "./bee/blocks";
import { POLE } from "./hero/blocks";
import { stallBlocks as posStallBlocks } from "./monosuko/blocks";
import { stallBlocks as orbitStallBlocks } from "./orbit/blocks";
import { pavilionBlocks, phoneBody } from "./peduli/blocks";
import { bananaBlocks, gentongBlocks, jemuranBlocks, postBlocks } from "./petak/blocks";
import { districtSignBlocks, plazaPropBlocks } from "./plaza/blocks";
import { islandFrame } from "./shared/local";
import { projectById } from "./shared/project";
import { treeBlocks, type PropBlock } from "./shared/props";
import { miniBoardLines } from "./shared/text";

/**
 * A prop's collision box, island-local like the props themselves (centre, full sizes, turn about y): what Ezra's body
 * bumps into instead of whole barrier blocks (spec: voxel controls §2). Built from the very blocks and slabs the
 * islands draw, so collision is the drawn shape.
 */
export interface PropBox {
  x: number; y: number; z: number;
  sx: number; sy: number; sz: number;
  ry: number;
  what: string;
  /**
   * Ezra walks through it (spec: voxel controls §2, Ezra 2026-10-15): boards, signs, map boards and anything thin in plan
   * (posts, poles, a clothesline's posts). They still count for placement and fade around him (seeThroughShader); only
   * the solid ones (buildings' furniture, trunks, crates, the gentong, tables) stop his body.
   */
  pass: boolean;
}

/** EzraBot.tsx: the robot's chest panel, visor and eyes stand up to this far proud of its torso and head. */
const ROBOT_FACE = 0.08;
/** Blocks lower than this (paths, flower stems, floors) are walked over, not bumped into. */
const UNDERFOOT = 0.2;
/** Blocks thinner than this on any side (washing lines, paper slots) never stop him. */
const HAIR = 0.03;
/** A block this thin or thinner in plan (a post, a pole, a sign's panel) is walked through. */
const THIN = 0.2;

/** A drawn block as a collision box, or null for one that is tilted (leaves, awnings), underfoot or a hair thin. */
export function blockBox(b: PropBlock, what: string): PropBox | null {
  if (b.rx || b.rz) return null;
  const sx = b.sx ?? 1, sy = b.sy ?? 1, sz = b.sz ?? 1;
  if (b.y + sy / 2 <= UNDERFOOT || Math.min(sx, sy, sz) < HAIR) return null;
  return { x: b.x, y: b.y, z: b.z, sx, sy, sz, ry: b.ry ?? 0, what, pass: Math.min(sx, sz) <= THIN };
}

const blocks = (list: readonly PropBlock[], what: string): PropBox[] =>
  list.flatMap((b) => blockBox(b, what) ?? []);

/**
 * A slab (layouts.ts: boards, signs, map bezels, bubbles) as a collision box; tilted ones (roof planks) have none. Boards
 * and signs pass (`pass`); what hangs overhead (bubbles, the monitor) stays solid, so a jump never lifts him into it.
 */
function slab(s: Slab, what: string, pass = true): PropBox[] {
  if (s.rx) return [];
  return [{ x: s.x, y: s.y, z: s.z, sx: s.sx, sy: s.sy, sz: s.sz, ry: s.ry ?? 0, what, pass }];
}

const turn = (at: { x: number; z: number; ry: number }, lx: number, lz: number) => ({
  x: at.x + lx * Math.cos(at.ry) + lz * Math.sin(at.ry),
  z: at.z - lx * Math.sin(at.ry) + lz * Math.cos(at.ry),
});

/** A board on two posts drawn in its own frame at `at` (GTID's price board, Ezra Bot's screen). */
function postedBoard(
  at: { x: number; z: number; ry: number },
  post: { w: number; h: number; dx: number; z: number },
  frame: { w: number; h: number; d: number; y: number },
  what: string,
): PropBox[] {
  const out: PropBox[] = [-1, 1].map((s) => ({ ...turn(at, s * post.dx, post.z), y: post.h / 2, sx: post.w, sy: post.h, sz: post.w, ry: at.ry, what: `${what} post`, pass: true }));
  out.push({ ...turn(at, 0, 0), y: frame.y, sx: frame.w, sy: frame.h, sz: frame.d, ry: at.ry, what, pass: true });
  return out;
}

function info(at: { x: number; z: number; ry: number }, title: string, lines: readonly string[], scale = 1): PropBox[] {
  return [...slab(infoSlab(at, title, lines, scale), "info board"), ...infoPostSlabs(at, scale).flatMap((s) => slab(s, "info board post"))];
}
const statsInfo = (id: string, at: { x: number; z: number; ry: number; title: string }) => info(at, at.title, projectById(id).stats ?? []);
function miniInfo(id: string, at: { x: number; z: number; ry: number }): PropBox[] {
  const p = projectById(id);
  return info(at, p.title, miniBoardLines(p), MINI_BOARD_SCALE);
}
const sign = (at: { x: number; z: number; ry: number }, scale = 1) => signSlabs(at, scale).flatMap((s) => slab(s, "link sign"));
const map = (at: { x: number; z: number; ry: number }) => mapSlabs(at).flatMap((s) => slab(s, "map board"));
const tree = (t: { x: number; z: number; h: number; seed: number }) => blocks(treeBlocks(t.x, t.z, t.h, t.seed), "tree");

/** Every island's prop boxes. Buildings, walls, counters and roofs stay voxel collision (layouts.ts FOOTPRINTS). */
function buildPropBoxes(): Record<string, PropBox[]> {
  const gb = GTID.board;
  const eb = EZRA.screen;
  return {
    hero: [
      ...tree(HERO.tree),
      ...blocks(POLE, "flag pole"),
      ...info(HERO.info, worldCopy.location, [worldCopy.heroLine]),
      ...map(HERO.map),
    ],
    gtid: [
      ...postedBoard(gb, { w: 0.16, h: gb.y, dx: gb.w / 2 - 0.3, z: -0.08 }, { w: gb.w + 0.16, h: gb.h + 0.16, d: 0.12, y: gb.y + gb.h / 2 - 0.4 }, "price board"),
      ...statsInfo("gtid", GTID.info),
      ...sign(GTID.link),
      ...map(GTID.map),
    ],
    "petak-umpet": [
      ...PETAK.trees.flatMap(tree),
      ...blocks(bananaBlocks(), "banana tree"),
      ...blocks(gentongBlocks(), "gentong"),
      ...blocks(jemuranBlocks(), "jemuran"),
      ...blocks(postBlocks(), "lantern post / title sign"),
      ...statsInfo("petak-umpet", PETAK.info),
      ...sign(PETAK.link),
      ...map(PETAK.map),
    ],
    "orbit-store": [
      ...blocks(orbitStallBlocks(), "stall"),
      ...statsInfo("orbit-store", ORBIT.info),
      ...sign(ORBIT.link),
      ...map(ORBIT.map),
    ],
    "ezra-bot": [
      ...postedBoard(eb, { w: 0.14, h: eb.y, dx: eb.w / 2 - 0.25, z: -0.06 }, { w: eb.w + 0.14, h: eb.h + 0.14, d: 0.1, y: eb.y + eb.h / 2 - 0.2 }, "bot screen"),
      ...bubbleSlabs().flatMap((s) => slab(s, "chat bubble", false)),
      // EzraBot.tsx ROBOT: legs and torso up to 1.82, the head from 2.34 to its antenna ball (3.94), the face plates
      // ROBOT_FACE proud of both. Its cells are voxel collision too; these keep a jump beside it out of its face
      ...[[0.91, 1.82], [3.14, 1.6]].map(([y, sy]) => ({ x: EZRA.robot.x, y, z: EZRA.robot.z + ROBOT_FACE / 2, sx: EZRA.robot.w, sy, sz: EZRA.robot.d + ROBOT_FACE, ry: 0, what: "robot", pass: false })),
      ...statsInfo("ezra-bot", EZRA.info),
      ...sign(EZRA.link),
      ...map(EZRA.map),
    ],
    "web-plaza": [
      ...blocks(districtSignBlocks(), "district sign"),
      ...blocks(plazaPropBlocks(), "plaza prop"),
      ...map(PLAZA.map),
    ],
    "pos-monosuko": [
      ...blocks(posStallBlocks(), "stall"),
      ...miniInfo("pos-monosuko", MONOSUKO.info),
      ...sign(MONOSUKO.link, MINI_SIGN_SCALE),
      ...map(MONOSUKO.map),
    ],
    "bee-furniture-crm": [
      ...blocks(shedBlocks(), "shed"),
      ...slab(screenSlab(BEE.screen), "monitor", false),
      ...miniInfo("bee-furniture-crm", BEE.info),
      ...sign(BEE.link, MINI_SIGN_SCALE),
      ...map(BEE.map),
    ],
    pedulipasal: [
      ...blocks(pavilionBlocks(), "pavilion"),
      ...blocks([phoneBody()], "phone"),
      ...miniInfo("pedulipasal", PEDULI.info),
      ...sign(PEDULI.link, MINI_SIGN_SCALE),
      ...map(PEDULI.map),
    ],
  };
}

export const PROP_BOXES: Record<string, PropBox[]> = buildPropBoxes();

/** An island's solid prop boxes (the ones that stop Ezra) in world space, ready for the physics' ColliderSet. */
export function islandColliders(id: string, p: IslandPlacement): Collider[] {
  const [fx, fy, fz] = islandFrame(p);
  return (PROP_BOXES[id] ?? []).filter((b) => !b.pass).map((b) => ({
    x: fx + b.x, y: fy + b.y, z: fz + b.z, hx: b.sx / 2, hy: b.sy / 2, hz: b.sz / 2, ry: b.ry, what: `${id}: ${b.what}`,
  }));
}
