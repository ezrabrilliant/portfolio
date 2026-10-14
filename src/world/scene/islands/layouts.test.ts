import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { OBB } from "three/examples/jsm/math/OBB.js";
import { buildLayout } from "@/world/engine/gen/layout";
import { generateIsland } from "@/world/engine/gen/islandGen";
import { DEFAULT_PARAMS, MODEL_TOP, characterCollides, createCharacter } from "@/world/engine/physics/character";
import { EZRA_REACH } from "@/world/engine/physics/ezraModel";
import { CLOSEUP_HUD_PX, CLOSEUP_NEAR_MARGIN, closeupPanLimit, closeupPose } from "@/world/engine/camera/closeup";
import { buildWorld } from "@/world/engine/worldBuild";
import { worldCopy, worldProjects } from "@/config/portfolio";
import type { Vec3 } from "@/world/engine/types";
import { PAD_SIZE, SIGN_OFFSET, SIGN_WIDTH, STATION_SIZE, minecartRail, padPair, railEnds } from "@/world/scene/crossings/geometry";
import { advanceRide } from "@/world/scene/crossings/ride";
import { poseFor } from "@/world/scene/ezra/anim";
import type { Ride } from "@/world/state/runtime";
import {
  BEE, BODY_ROWS, EZRA, FOOTPRINTS, GTID, HERO, INFO_HALF_SPAN, JUMP_RISE, MAP_BOARD, MAP_HALF_SPAN,
  MINI_ANCHOR_CLEARANCE, MINI_BOARD_SCALE, MINI_SIGN_SCALE, MODEL_OVER, MODEL_REACH, MONOSUKO, ORBIT, PEDULI, PETAK, PLAZA, SLIVER,
  MAP_POST, beeRoofPlanks, bubbleSlabs, crownSlabs, footprintOf, infoPostSlabs, infoSlab, mapSlabs, reaches, screenSlab, signSlabs,
  slabCells,
  type Slab,
} from "./layouts";
import { TOUR_FOV, portraitStop, tourStopFor } from "./framing";
import { shedBlocks } from "./bee/blocks";
import { awningParts } from "./monosuko/awning";
import { stallBlocks } from "./monosuko/blocks";
import { pavilionBlocks, phoneBody } from "./peduli/blocks";
import { plazaPropBlocks } from "./plaza/blocks";
import { INFO_BOARD, SCREEN_BEZEL, SIGNPOST, SIGNPOST_FACE, infoBoardTop } from "./shared/boardGeometry";
import { islandFrame } from "./shared/local";
import { treeBlocks, type PropBlock } from "./shared/props";
import { projectById } from "./shared/project";
import { infoBoardRows, miniBoardLines } from "./shared/text";

const layout = buildLayout(worldProjects);
const byId = Object.fromEntries(layout.islands.map((p) => [p.id, p]));
const toLocal = (id: string, v: { x: number; z: number }) => ({
  x: v.x - (byId[id].origin.x + 0.5),
  z: v.z - (byId[id].origin.z + 0.5),
});
const grassOf = (id: string) => {
  const p = byId[id];
  return new Set(generateIsland({ radius: p.radius, depth: p.depth, seed: p.seed }).cells.filter((c) => c.y === 0).map((c) => `${c.x},${c.z}`));
};
const WEB = ["web-plaza", "pos-monosuko", "bee-furniture-crm", "pedulipasal"];
/** The islands whose overhead visuals layouts.test checks against Ezra's jump (Part C's district and Ezra Bot). */
const OVERHEAD_ISLANDS = [...WEB, "ezra-bot"];
/** PosMonosuko.tsx's badge disc depth. */
const BADGE_DEPTH = 0.12;
/** EzraBot.tsx: the robot's chest panel, visor and eyes stand up to this far proud of its torso and head. */
const ROBOT_FACE = 0.08;
/**
 * The cells of the props standing on the grass: the rows Ezra's body fills there (BODY_ROWS). Above them a barrier
 * only stops his head, under a roof, screen or crown it caps: those ceiling-only columns may overhang the rim with
 * what they cap, and must hang under it instead ("hang every ceiling-only column …" below).
 */
const groundCells = (id: string) => FOOTPRINTS[id].filter(([, y]) => y < BODY_ROWS);

describe("island prop footprints", () => {
  it("exist for every tour island", () => {
    for (const id of layout.tourOrder) expect(FOOTPRINTS[id]?.length ?? 0, id).toBeGreaterThan(0);
  });

  it("stay on the island (inside 78% of the radius, the narrowest rim after noise)", () => {
    for (const id of layout.tourOrder) {
      const r = byId[id].radius * 0.78;
      // ceiling-only columns over the rim are checked against what they cap instead, where that is known
      const cells = OVERHEAD_ISLANDS.includes(id) ? groundCells(id) : FOOTPRINTS[id];
      for (const [x, , z] of cells) expect(Math.hypot(x, z), `${id} (${x},${z})`).toBeLessThanOrEqual(r);
    }
  });

  it("stand on the Web & Apps islands on grass with grass on all four sides (never on the rim of the real terrain)", () => {
    for (const id of WEB) {
      const grass = grassOf(id);
      for (const [x, , z] of groundCells(id)) {
        const ok = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dz]) => grass.has(`${x + dx},${z + dz}`));
        expect(ok, `${id} (${x},${z})`).toBe(true);
      }
    }
  });

  it("leave 2 blocks clear around every crossing anchor (MINI_ANCHOR_CLEARANCE on the radius-4 minis)", () => {
    for (const c of layout.crossings) {
      for (const [id, anchor] of [[c.from, c.a], [c.to, c.b]] as const) {
        const a = toLocal(id, anchor);
        const clear = byId[id].kind === "mini" ? MINI_ANCHOR_CLEARANCE : 2;
        for (const [x, , z] of FOOTPRINTS[id]) {
          expect(Math.hypot(x - a.x, z - a.z), `${id} (${x},${z}) vs ${c.kind}`).toBeGreaterThanOrEqual(clear);
        }
      }
    }
  });

  // Bridge.tsx stands a rope post 1.05 to each side of every bridge anchor
  it("never put a prop cell on a bridge's rope post", () => {
    for (const c of layout.crossings) {
      if (c.kind !== "bridge") continue;
      const len = Math.hypot(c.b.x - c.a.x, c.b.z - c.a.z);
      const side = { x: -(c.b.z - c.a.z) / len, z: (c.b.x - c.a.x) / len };
      for (const [id, anchor] of [[c.from, c.a], [c.to, c.b]] as const) {
        for (const s of [1.05, -1.05]) {
          const post = toLocal(id, { x: anchor.x + side.x * s, z: anchor.z + side.z * s });
          for (const [x, , z] of FOOTPRINTS[id]) {
            const inside = Math.abs(post.x - x) < 0.6 && Math.abs(post.z - z) < 0.6;
            expect(inside, `${id} (${x},${z}) holds a rope post of ${c.from} → ${c.to}`).toBe(false);
          }
        }
      }
    }
  });

  // Part B puts crossing furniture inside the rim, beyond the 2-block anchor clearance: minecart stations
  // (2.4-block platform 1.4 blocks in, a sign 1.45 blocks beside the track with a 1.7-block board) and
  // 1.3-block bounce pads 1.6 blocks in (crossings/geometry.ts, Minecart.tsx, BouncePad.tsx).
  it("never overlap a minecart station, its sign or a bounce pad", () => {
    const furniture: { id: string; what: string; x: number; z: number; half: number }[] = [];
    for (const c of layout.crossings) {
      if (c.kind === "minecart") {
        const e = railEnds(c, byId[c.from], byId[c.to]);
        const dx = e.stationB.x - e.stationA.x;
        const dz = e.stationB.z - e.stationA.z;
        const l = Math.hypot(dx, dz);
        for (const [st, id] of [[e.stationA, c.from], [e.stationB, c.to]] as const) {
          furniture.push({ id, what: "minecart station", ...toLocal(id, st), half: STATION_SIZE / 2 });
          furniture.push({ id, what: "minecart sign", ...toLocal(id, { x: st.x - (dz / l) * SIGN_OFFSET, z: st.z + (dx / l) * SIGN_OFFSET }), half: SIGN_WIDTH / 2 });
        }
      } else if (c.kind === "bouncePads") {
        const p = padPair(c, byId[c.from], byId[c.to]);
        // each pad is turned to face its pair: its axis-aligned half-extent is PAD_SIZE/2 · (|cos yaw| + |sin yaw|)
        const yaw = Math.atan2(p.b.x - p.a.x, p.b.z - p.a.z);
        const half = (PAD_SIZE / 2) * (Math.abs(Math.cos(yaw)) + Math.abs(Math.sin(yaw)));
        furniture.push({ id: c.from, what: "bounce pad", ...toLocal(c.from, p.a), half });
        furniture.push({ id: c.to, what: "bounce pad", ...toLocal(c.to, p.b), half });
      }
    }
    expect(furniture.length).toBeGreaterThan(0);
    for (const f of furniture) {
      for (const [x, , z] of FOOTPRINTS[f.id]) {
        // gap between the cell's square and the furniture's square; negative = they overlap
        const gap = Math.max(Math.abs(x - f.x), Math.abs(z - f.z)) - 0.5 - f.half;
        expect(gap, `${f.id} (${x},${z}) vs ${f.what}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("give every Web & Apps prop its own cells (no two props claim one)", () => {
    for (const id of WEB) {
      const seen = new Set<string>();
      for (const c of FOOTPRINTS[id]) {
        const k = c.join(",");
        expect(seen.has(k), `${id} (${k}) claimed twice`).toBe(false);
        seen.add(k);
      }
    }
  });

  // On the small Web & Apps islands the props fill most of the free ground: Ezra must still get from every bridge head
  // to every other one, and to the spot in front of the island's screen, over free grass (one cell wide is enough).
  // A ceiling row over a cell (from BODY_ROWS up) leaves it walkable.
  it("keep a walkway on the Web & Apps islands: bridge head to bridge head, and to the screen", () => {
    const stands: Record<string, { x: number; z: number } | undefined> = {
      "pos-monosuko": MONOSUKO.stand, "bee-furniture-crm": BEE.stand, pedulipasal: PEDULI.stand,
    };
    for (const id of WEB) {
      const grass = grassOf(id);
      const blocked = new Set(groundCells(id).map(([x, , z]) => `${x},${z}`));
      const heads = layout.crossings.flatMap((c) => [[c.from, c.a], [c.to, c.b]] as const).filter(([i]) => i === id).map(([, a]) => toLocal(id, a));
      const goals = [...heads.map((a) => ({ x: Math.round(a.x), z: Math.round(a.z) })), ...(stands[id] ? [stands[id]!] : [])];
      const start = goals[0];
      const seen = new Set([`${start.x},${start.z}`]);
      const queue = [start];
      while (queue.length) {
        const c = queue.shift()!;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = `${c.x + dx},${c.z + dz}`;
          if (seen.has(k) || !grass.has(k) || blocked.has(k)) continue;
          seen.add(k);
          queue.push({ x: c.x + dx, z: c.z + dz });
        }
      }
      for (const g of goals) expect(seen.has(`${g.x},${g.z}`), `${id}: (${g.x},${g.z}) unreachable`).toBe(true);
    }
  });
});

describe("board and sign collision", () => {
  // InfoBoard: the posts, then the text panel (boardGeometry.ts); its height grows with the wrapped copy and the whole
  // board scales on the minis
  const infoTop = (title: string, lines: readonly string[], scale = 1) => infoBoardTop(infoBoardRows(title, lines)) * scale;
  const stats = (id: string) => projectById(id).stats ?? [];
  const miniLines = (id: string) => miniBoardLines(projectById(id));
  const g = GTID.board;
  const s = EZRA.screen;
  const mapTop = MAP_BOARD.y + MAP_BOARD.h / 2;
  // every panel on two posts (or one post with a wide panel): where it stands (± half around `at`, turned by ry) and its
  // top edge above the grass
  const boards = [
    { id: "hero", what: "about board", at: HERO.info, half: INFO_HALF_SPAN, ry: HERO.info.ry, top: infoTop(worldCopy.location, [worldCopy.heroLine]) },
    { id: "gtid", what: "price board", at: g, half: g.w / 2 - 0.3, ry: g.ry, top: g.y + g.h / 2 - 0.4 + (g.h + 0.16) / 2 }, // Gtid.tsx PriceBoard
    { id: "gtid", what: "info board", at: GTID.info, half: INFO_HALF_SPAN, ry: GTID.info.ry, top: infoTop(GTID.info.title, stats("gtid")) },
    { id: "petak-umpet", what: "title sign", at: PETAK.sign, half: PETAK.sign.w / 2 - 0.3, ry: PETAK.sign.ry, top: 0.55 + PETAK.sign.h }, // PetakUmpet.tsx SIGN_BOTTOM 0.55
    { id: "petak-umpet", what: "info board", at: PETAK.info, half: INFO_HALF_SPAN, ry: PETAK.info.ry, top: infoTop(PETAK.info.title, stats("petak-umpet")) },
    { id: "orbit-store", what: "info board", at: ORBIT.info, half: INFO_HALF_SPAN, ry: ORBIT.info.ry, top: infoTop(ORBIT.info.title, stats("orbit-store")) },
    { id: "ezra-bot", what: "screen", at: s, half: s.w / 2 - 0.25, ry: s.ry, top: s.y + s.h / 2 - 0.2 + (s.h + 0.14) / 2 }, // EzraBot.tsx SCREEN_GEO
    { id: "ezra-bot", what: "info board", at: EZRA.info, half: INFO_HALF_SPAN, ry: EZRA.info.ry, top: infoTop(EZRA.info.title, stats("ezra-bot")) },
    { id: "web-plaza", what: "district sign", at: PLAZA.sign, half: PLAZA.sign.w / 2 - 0.1, ry: PLAZA.sign.ry, top: PLAZA.sign.y + PLAZA.sign.h / 2 },
    ...([
      ["pos-monosuko", MONOSUKO.info],
      ["bee-furniture-crm", BEE.info],
      ["pedulipasal", PEDULI.info],
    ] as const).map(([id, b]) => ({ id, what: "info board", at: b, half: INFO_HALF_SPAN * MINI_BOARD_SCALE, ry: b.ry, top: infoTop(projectById(id).title, miniLines(id), MINI_BOARD_SCALE) })),
    ...([
      ["hero", HERO.map], ["gtid", GTID.map], ["petak-umpet", PETAK.map], ["orbit-store", ORBIT.map], ["ezra-bot", EZRA.map],
      ["web-plaza", PLAZA.map], ["pos-monosuko", MONOSUKO.map], ["bee-furniture-crm", BEE.map], ["pedulipasal", PEDULI.map],
    ] as const).map(([id, m]) => ({ id, what: "map board", at: m, half: MAP_HALF_SPAN, ry: m.ry, top: mapTop })),
  ];
  // an island's footprint as an IsSolid in island-local blocks: local cell x spans [x − 0.5, x + 0.5) around the
  // frame, so a frame position px sits in block floor(px + 0.5)
  const solidOf = (id: string) => {
    const set = new Set(FOOTPRINTS[id].map(([x, y, z]) => `${x},${y},${z}`));
    return (x: number, y: number, z: number) => set.has(`${x},${y},${z}`);
  };
  const along = (b: (typeof boards)[number], t: number) => ({ x: b.at.x + t * Math.cos(b.ry), z: b.at.z - t * Math.sin(b.ry) });

  it("leave no gap between the posts: Ezra (0.6 wide) can't stand anywhere on the post-to-post line", () => {
    const leaks: string[] = [];
    for (const b of boards) {
      const isSolid = solidOf(b.id);
      for (let t = -b.half; t <= b.half + 1e-9; t += 0.05) {
        const p = along(b, t);
        if (!characterCollides(isSolid, p.x + 0.5, 0, p.z + 0.5)) {
          leaks.push(`${b.id} ${b.what} at t=${t.toFixed(2)}`);
          break;
        }
      }
    }
    expect(leaks).toEqual([]);
  });

  it("reach the panel's top row, so he can't jump onto the barrier inside the panel", () => {
    const short: string[] = [];
    for (const b of boards) {
      const mid = along(b, 0);
      const cx = Math.round(mid.x), cz = Math.round(mid.z);
      const top = Math.max(-1, ...FOOTPRINTS[b.id].filter(([x, , z]) => x === cx && z === cz).map(([, y]) => y));
      if (top < Math.floor(b.top)) short.push(`${b.id} ${b.what}: panel top ${b.top.toFixed(2)}, barrier top row ${top}`);
    }
    expect(short).toEqual([]);
  });

  it("stop every board's barrier on the Web & Apps islands and Ezra Bot at its panel's top row: no invisible row above", () => {
    const ours = boards.filter((b) => OVERHEAD_ISLANDS.includes(b.id));
    expect(ours).toHaveLength(11);
    const tall: string[] = [];
    for (const b of ours) {
      const mid = along(b, 0);
      const cx = Math.round(mid.x), cz = Math.round(mid.z);
      const top = Math.max(-1, ...FOOTPRINTS[b.id].filter(([x, , z]) => x === cx && z === cz).map(([, y]) => y));
      if (top > Math.floor(b.top)) tall.push(`${b.id} ${b.what}: panel top ${b.top.toFixed(2)}, barrier top row ${top}`);
    }
    expect(tall).toEqual([]);
  });

  it("keep MINI_SIGN_SCALE between half and full size", () => {
    expect(MINI_SIGN_SCALE).toBeGreaterThan(0.5);
    expect(MINI_SIGN_SCALE).toBeLessThanOrEqual(1);
  });
});

type Spot = { x: number; z: number; ry: number };
/** A mini's InfoBoard panel, scaled by MINI_BOARD_SCALE. */
function miniInfoPanel(id: string, at: Spot): Slab {
  const p = projectById(id);
  return infoSlab(at, p.title, miniBoardLines(p), MINI_BOARD_SCALE);
}
/** A box as shared/PropBlocks.tsx draws a block: centred at (x, y, z), 1 × 1 × 1 unless sized, turned rx, ry, rz. */
type Box = Pick<PropBlock, "x" | "y" | "z" | "sx" | "sy" | "sz" | "rx" | "ry" | "rz">;
/** Floor tiles and paving reach this high at most: walked on, never in a board's way. */
const FLOOR_TOP = 0.13;
const solidBlocks = (what: string, blocks: readonly PropBlock[]) =>
  blocks.filter((b) => b.y + (b.sy ?? 1) / 2 > FLOOR_TOP).map((box) => ({ what, box: box as Box }));
const treeSolids = (t: { x: number; z: number; h: number; seed: number }) => solidBlocks("tree", treeBlocks(t.x, t.z, t.h, t.seed));
/** EzraBot.tsx ROBOT: legs and torso up to 1.82, the head from 2.34 to its antenna ball (3.94), its face plates proud. */
const ROBOT_BOXES: Box[] = [
  { x: EZRA.robot.x, y: 0.91, z: EZRA.robot.z + ROBOT_FACE / 2, sx: EZRA.robot.w, sy: 1.82, sz: EZRA.robot.d + ROBOT_FACE },
  { x: EZRA.robot.x, y: 3.14, z: EZRA.robot.z + ROBOT_FACE / 2, sx: EZRA.robot.w, sy: 1.6, sz: EZRA.robot.d + ROBOT_FACE },
];
/**
 * The solid props each island draws, as boxes: on the Web & Apps islands every block bar the floors (the stall and
 * counter, the shed walls and bench, the plinth, shelf and pavilion posts, the trees and lamps) and the phone's body; the
 * trees and the robot on the star islands. Boards and signs may neither stand in them nor hide behind them.
 */
const SOLIDS: Record<string, { what: string; box: Box }[]> = {
  hero: treeSolids(HERO.tree),
  "petak-umpet": PETAK.trees.flatMap(treeSolids),
  "ezra-bot": ROBOT_BOXES.map((box) => ({ what: "robot", box })),
  "web-plaza": solidBlocks("plaza prop", plazaPropBlocks()),
  "pos-monosuko": solidBlocks("stall", stallBlocks()),
  "bee-furniture-crm": solidBlocks("shed", shedBlocks()),
  pedulipasal: [...solidBlocks("pavilion", pavilionBlocks()), { what: "phone", box: phoneBody() }],
};
const turnOf = (b: Box) => new THREE.Quaternion().setFromEuler(new THREE.Euler(b.rx ?? 0, b.ry ?? 0, b.rz ?? 0));
/** A box (or a board's slab) as an oriented box, grown `grow` on every side. */
const obbOf = (b: Box, grow = 0) =>
  new OBB(
    new THREE.Vector3(b.x, b.y, b.z),
    new THREE.Vector3((b.sx ?? 1) / 2 + grow, (b.sy ?? 1) / 2 + grow, (b.sz ?? 1) / 2 + grow),
    new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(turnOf(b))),
  );
/** A box's six faces in island-local space: each face's corners in order, its centre and outward normal. */
function facesOf(b: Box) {
  const q = turnOf(b);
  const half = [(b.sx ?? 1) / 2, (b.sy ?? 1) / 2, (b.sz ?? 1) / 2];
  const at = (v: number[]) => new THREE.Vector3(v[0] * half[0], v[1] * half[1], v[2] * half[2]).applyQuaternion(q).add(new THREE.Vector3(b.x, b.y, b.z));
  const out: { corners: THREE.Vector3[]; centre: THREE.Vector3; normal: THREE.Vector3 }[] = [];
  for (let axis = 0; axis < 3; axis++) {
    const [u, v] = [(axis + 1) % 3, (axis + 2) % 3];
    for (const side of [-1, 1]) {
      const corner = (a: number, c: number) => {
        const w = [0, 0, 0];
        w[axis] = side;
        w[u] = a;
        w[v] = c;
        return at(w);
      };
      const n = [0, 0, 0];
      n[axis] = side;
      out.push({
        corners: [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)],
        centre: at(n),
        normal: new THREE.Vector3(n[0], n[1], n[2]).applyQuaternion(q),
      });
    }
  }
  return out;
}

/** The plaza's district sign: its plank face (PLAZA.sign). */
function districtSign(): Slab {
  const g = PLAZA.sign;
  return { x: g.x, y: g.y, z: g.z, sx: g.w, sy: g.h, sz: 0, ry: g.ry };
}

/*
 * What Ezra walks or jumps into. His model stands MODEL_TOP tall (his hair, or the mortarboard he wears from the 2026
 * moment on), up to MODEL_OVER above his 1.8 collision box, and a jump lifts him up to JUMP_RISE more. Wherever he can
 * stand, on the grass or on a barrier column he steps onto, his model must not stand in a visual, and in a jump it must
 * not rise into one: a barrier row has to stop the box low enough. The visuals are every board and signpost on all nine
 * islands as drawn (panels, bezels, sign faces and posts, end to end), and on the Web & Apps islands and Ezra Bot also
 * everything that hangs overhead.
 */
describe("what Ezra could walk or jump into, on every island", () => {
  type Visual = { what: string; slab: Slab };
  const H = DEFAULT_PARAMS.height;
  const HALF = DEFAULT_PARAMS.width / 2;
  const pv = PEDULI.pavilion;
  const grill = MONOSUKO.grill;
  const robot = EZRA.robot;
  const stats = (id: string) => projectById(id).stats ?? [];

  /** A frame on posts, `w` wide, centred `cy` up (the GTID price board, Ezra Bot's screen board). */
  const frame = (at: Spot, w: number, h: number, cy: number, d: number): Slab => ({ x: at.x, y: cy, z: at.z, sx: w, sy: h, sz: d, ry: at.ry });
  const g = GTID.board;
  const s = EZRA.screen;
  const sign = PETAK.sign;
  const ds = PLAZA.sign;
  /** An InfoBoard: its panel and its two posts. */
  const infoBoard = (at: Spot, panel: Slab, scale: number): Visual[] =>
    [panel, ...infoPostSlabs(at, scale)].map((slab) => ({ what: "info board", slab }));
  const mini = (id: string, L: typeof MONOSUKO | typeof BEE | typeof PEDULI): Visual[] => [
    ...infoBoard(L.info, miniInfoPanel(id, L.info), MINI_BOARD_SCALE),
    ...signSlabs(L.link, MINI_SIGN_SCALE).map((slab) => ({ what: "link sign", slab })),
    ...mapSlabs(L.map).map((slab) => ({ what: "map board", slab })),
  ];
  /** Every board, sign and screen on posts: the panels, faces and frames as drawn. */
  const BOARDS: Record<string, Visual[]> = {
    hero: [
      ...infoBoard(HERO.info, infoSlab(HERO.info, worldCopy.location, [worldCopy.heroLine], 1), 1),
      ...mapSlabs(HERO.map).map((slab) => ({ what: "map board", slab })),
    ],
    gtid: [
      // Gtid.tsx PriceBoard: a frame 0.16 larger than the face and 0.12 deep, its centre 0.4 under the face's
      { what: "price board", slab: frame(g, g.w + 0.16, g.h + 0.16, g.y + g.h / 2 - 0.4, 0.12) },
      ...infoBoard(GTID.info, infoSlab(GTID.info, GTID.info.title, stats("gtid"), 1), 1),
      ...signSlabs(GTID.link).map((slab) => ({ what: "link sign", slab })),
      ...mapSlabs(GTID.map).map((slab) => ({ what: "map board", slab })),
    ],
    "petak-umpet": [
      // PetakUmpet.tsx: the title sign's panel from SIGN_BOTTOM (0.55) up, 0.1 deep
      { what: "title sign", slab: frame(sign, sign.w, sign.h, 0.55 + sign.h / 2, 0.1) },
      ...infoBoard(PETAK.info, infoSlab(PETAK.info, PETAK.info.title, stats("petak-umpet"), 1), 1),
      ...signSlabs(PETAK.link).map((slab) => ({ what: "link sign", slab })),
      ...mapSlabs(PETAK.map).map((slab) => ({ what: "map board", slab })),
    ],
    "orbit-store": [
      ...infoBoard(ORBIT.info, infoSlab(ORBIT.info, ORBIT.info.title, stats("orbit-store"), 1), 1),
      ...signSlabs(ORBIT.link).map((slab) => ({ what: "link sign", slab })),
      ...mapSlabs(ORBIT.map).map((slab) => ({ what: "map board", slab })),
    ],
    "ezra-bot": [
      // EzraBot.tsx SCREEN_GEO: a frame 0.14 larger than the face and 0.1 deep, its centre 0.2 under the face's
      { what: "screen board", slab: frame(s, s.w + 0.14, s.h + 0.14, s.y + s.h / 2 - 0.2, 0.1) },
      ...infoBoard(EZRA.info, infoSlab(EZRA.info, EZRA.info.title, stats("ezra-bot"), 1), 1),
      ...signSlabs(EZRA.link).map((slab) => ({ what: "link sign", slab })),
      ...mapSlabs(EZRA.map).map((slab) => ({ what: "map board", slab })),
    ],
    // Plaza.tsx: the dark backing, 0.06 larger than the plank face all round and 0.08 deep
    "web-plaza": [
      { what: "district sign", slab: frame(ds, ds.w + 0.12, ds.h + 0.12, ds.y, 0.08) },
      ...mapSlabs(PLAZA.map).map((slab) => ({ what: "map board", slab })),
    ],
    "pos-monosuko": mini("pos-monosuko", MONOSUKO),
    "bee-furniture-crm": mini("bee-furniture-crm", BEE),
    pedulipasal: mini("pedulipasal", PEDULI),
  };
  /** What hangs over the Web & Apps islands and Ezra Bot. */
  const OVERHEAD: Record<string, Visual[]> = {
    "web-plaza": crownSlabs(PLAZA.tree).map((slab) => ({ what: "tree crown", slab })),
    "pos-monosuko": [
      ...awningParts().map((slab) => ({ what: "awning", slab })),
      { what: "screen", slab: screenSlab(MONOSUKO.screen) },
      { what: "badge", slab: { x: MONOSUKO.logo.x, y: MONOSUKO.logo.y, z: MONOSUKO.logo.z, sx: 2 * MONOSUKO.logo.r, sy: 2 * MONOSUKO.logo.r, sz: BADGE_DEPTH } },
      // on the counter top, its row 0's top
      { what: "grill", slab: { x: grill.x, y: (1 + grill.top) / 2, z: grill.z, sx: grill.w, sy: grill.top - 1, sz: grill.d } },
    ],
    "bee-furniture-crm": [
      ...beeRoofPlanks().map((slab) => ({ what: "shed roof", slab })),
      { what: "screen", slab: screenSlab(BEE.screen) },
    ],
    pedulipasal: [
      ...PEDULI.roof.map((r) => ({ what: "pavilion roof", slab: { ...r, x: (pv.x0 + pv.x1) / 2, z: (pv.z0 + pv.z1) / 2 } })),
      ...crownSlabs(PEDULI.tree).map((slab) => ({ what: "tree crown", slab })),
    ],
    "ezra-bot": [
      ...bubbleSlabs().map((slab) => ({ what: "chat bubbles", slab })),
      // EzraBot.tsx ROBOT: legs and torso up to 1.82, the head from 2.34 to its antenna ball (3.94), its face plates proud
      { what: "robot", slab: { x: robot.x, y: 0.91, z: robot.z + ROBOT_FACE / 2, sx: robot.w, sy: 1.82, sz: robot.d + ROBOT_FACE } },
      { what: "robot", slab: { x: robot.x, y: 3.14, z: robot.z + ROBOT_FACE / 2, sx: robot.w, sy: 1.6, sz: robot.d + ROBOT_FACE } },
    ],
  };
  const visualsOf = (id: string): Visual[] => [...BOARDS[id], ...(OVERHEAD[id] ?? [])];

  /**
   * Ezra's model in layers above his feet, each a square either side of him less SLIVER: his body to its top (the
   * mortarboard's button), and the mortarboard's board, 0.78 square (MODEL_REACH), against what hangs overhead (a jump
   * lifts it into a roof, crown or screen; pressed against a board, sign or wall it brushes it as it brushes any wall).
   * Facing along an axis, as his box does: turned 45° the board's corners reach 0.16 further, as his head's 0.07.
   */
  const LAYERS = [
    { half: HALF - SLIVER, y0: 0, y1: MODEL_TOP, overheadOnly: false },
    { half: MODEL_REACH, y0: EZRA_REACH.board.bottom, y1: EZRA_REACH.board.top, overheadOnly: true },
  ];

  /** Samples per block: Ezra's box (half 0.3) sits flush on a cell edge (k + 0.5) with its centre on this grid. */
  const STEP = 10;

  /**
   * Every spot Ezra can stand on, reached from the island's crossing heads: walking, dropping off an edge, and stepping
   * (or jumping, which rises < 2) one row up onto a barrier column. Each with how far his box rises in a jump: to the
   * lowest barrier row over his box above his body, or the jump's top.
   */
  function footing(id: string) {
    const grass = grassOf(id);
    const cells = new Set(FOOTPRINTS[id].map((c) => c.join(",")));
    const solid = (x: number, y: number, z: number) => (y < 0 ? y === -1 && grass.has(`${x},${z}`) : cells.has(`${x},${y},${z}`));
    // island-local position → block coordinates: local cell x spans [x − 0.5, x + 0.5)
    const collides = (px: number, y: number, pz: number) => characterCollides(solid, px + 0.5, y, pz + 0.5);
    const columns = (px: number, pz: number) => {
      const out: [number, number][] = [];
      for (let x = Math.floor(px + 0.5 - HALF + 1e-6); x <= Math.floor(px + 0.5 + HALF - 1e-6); x++) {
        for (let z = Math.floor(pz + 0.5 - HALF + 1e-6); z <= Math.floor(pz + 0.5 + HALF - 1e-6); z++) out.push([x, z]);
      }
      return out;
    };
    const standable = (px: number, y: number, pz: number) => !collides(px, y, pz) && columns(px, pz).some(([x, z]) => solid(x, y - 1, z));
    const R = (Math.ceil(byId[id].radius * 1.25) + 2) * STEP;
    const seen = new Set<string>();
    const queue: [number, number, number][] = [];
    const visit = (i: number, k: number, y: number) => {
      const key = `${i},${k},${y}`;
      if (seen.has(key)) return;
      seen.add(key);
      queue.push([i, k, y]);
    };
    for (const c of layout.crossings) {
      for (const [iid, anchor] of [[c.from, c.a], [c.to, c.b]] as const) {
        if (iid !== id) continue;
        const a = toLocal(id, anchor);
        const i = Math.round(a.x * STEP), k = Math.round(a.z * STEP);
        if (standable(i / STEP, 0, k / STEP)) visit(i, k, 0);
      }
    }
    expect(queue.length, `${id}: a crossing head to start from`).toBeGreaterThan(0);
    while (queue.length) {
      const [i, k, y] = queue.pop()!;
      for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di, nk = k + dk;
        if (Math.abs(ni) > R || Math.abs(nk) > R) continue;
        const nx = ni / STEP, nz = nk / STEP;
        if (standable(nx, y, nz)) visit(ni, nk, y);
        else if (collides(nx, y, nz)) {
          if (!collides(i / STEP, y + 1, k / STEP) && standable(nx, y + 1, nz)) visit(ni, nk, y + 1);
        } else {
          for (let t = y - 1; t >= 0 && !collides(nx, t, nz); t--) {
            if (standable(nx, t, nz)) {
              visit(ni, nk, t);
              break;
            }
          }
        }
      }
    }
    return [...seen].map((key) => {
      const [i, k, y] = key.split(",").map(Number);
      const px = i / STEP, pz = k / STEP;
      let ceiling = Infinity;
      for (const [x, z] of columns(px, pz)) {
        for (let r = y + BODY_ROWS; r < ceiling; r++) {
          if (solid(x, r, z)) ceiling = r;
          if (r > y + 6) break;
        }
      }
      return { px, pz, y, lift: Math.min(y + H + JUMP_RISE, ceiling) - (y + H) };
    });
  }

  /** Where Ezra's model stands in a visual, or rises into one in a jump: "<island>: … the <what> at (cell)" → how far. */
  function gaps(id: string): Map<string, number> {
    const found = new Map<string, number>();
    const note = (key: string, by: number) => found.set(key, Math.max(found.get(key) ?? 0, by));
    const overhead = new Set(OVERHEAD[id] ?? []);
    const slabs = visualsOf(id).map((v) => ({ what: v.what, f: footprintOf(v.slab), over: overhead.has(v) }));
    for (const { px, pz, y, lift } of footing(id)) {
      const at = `(${Math.round(px)},${Math.round(pz)})${y > 0 ? ` on a ledge ${y} up` : ""}`;
      for (const { what, f, over } of slabs) {
        for (const L of LAYERS) {
          if ((L.overheadOnly && !over) || !reaches(f, px, pz, L.half)) continue;
          const y0 = y + L.y0, y1 = y + L.y1;
          if (f.y0 < y1 && f.y1 > y0) note(`${id}: stands in the ${what} at ${at}`, Math.min(f.y1, y1) - Math.max(f.y0, y0));
          // a jump carries the model's top on up past the visual's underside, whether or not it already stands in it
          if (lift > 0 && f.y0 < y1 + lift && f.y1 > y0) note(`${id}: rises into the ${what} at ${at}`, y1 + lift - f.y0);
        }
      }
    }
    return found;
  }

  /** How far a board or sign keeps from a drawn prop: a sliver of air between them, never a corner sunk in it. */
  const PROP_GAP = 0.02;

  it("never stand a board or sign in a drawn prop: the Web & Apps islands' blocks and phone, the trees, the robot", () => {
    const sunk = new Set<string>();
    for (const id of layout.tourOrder) {
      for (const { what, slab } of BOARDS[id]) {
        const board = obbOf(slab, PROP_GAP);
        for (const solid of SOLIDS[id] ?? []) {
          const b = solid.box;
          if (board.intersectsOBB(obbOf(b))) sunk.add(`${id}: the ${what} stands in the ${solid.what} block at (${b.x.toFixed(2)}, ${b.y.toFixed(2)}, ${b.z.toFixed(2)})`);
        }
      }
    }
    expect([...sunk]).toEqual([]);
  });

  /**
   * Gaps no barrier closes without breaking a placement rule above: their ceiling cell lies in a crossing's clearance
   * ring or over its furniture, and the visual itself would have to move. Listed by the cell Ezra's box is centred in,
   * with how far his model stands or rises in, so a new gap, a deeper one or a closed one all show up here.
   */
  const OPEN: { id: string; what: string; at: string[]; upTo: number }[] = [
    // the crown's corner block (3.0 up) over (−3, −2), 1.55 from the minecart anchor
    { id: "web-plaza", what: "rises into the tree crown", at: ["(-3,-2)", "(-3,-1)", "(-4,-1)", "(-4,-2)"], upTo: 0.6 },
    // the screen's ends (x ±1.5–1.78, 1.86 up) over (±2, −2): 1.62 / 1.12 from the bridge anchors, (−2, −2) on a rope post.
    // Standing there the model's top is 0.24 into the bezel's end, and a jump carries it 1.74 in
    { id: "pos-monosuko", what: "stands in the screen", at: ["(2,-2)", "(-2,-2)"], upTo: 0.24 },
    { id: "pos-monosuko", what: "rises into the screen", at: ["(2,-2)", "(-2,-2)"], upTo: 1.74 },
    // the front-left eave (2.59 up) over (−2, 0), 1.14 from the POS bridge anchor
    { id: "bee-furniture-crm", what: "rises into the shed roof", at: ["(-2,0)"], upTo: 1.02 },
    // the bubbles' right half (2.35 up) over the minecart station (no barrier over its platform)
    { id: "ezra-bot", what: "rises into the chat bubbles", at: ["(3,0)", "(3,1)", "(4,0)", "(4,1)", "(5,0)", "(5,1)"], upTo: 1.15 },
  ];

  it("never stand Ezra's model in a board, sign or anything overhead, nor let a jump lift it into one", () => {
    const found = new Map(layout.tourOrder.flatMap((id) => [...gaps(id)]));
    const open = new Map<string, number>(OPEN.flatMap((o) => o.at.map((c) => [`${o.id}: ${o.what} at ${c}`, o.upTo])));
    const unexpected = [...found].filter(([k, by]) => !(by <= (open.get(k) ?? -1))).map(([k, by]) => `${k} by ${by.toFixed(2)}`);
    expect(unexpected).toEqual([]);
    expect([...open.keys()].filter((k) => !found.has(k)), "closed: drop it from OPEN").toEqual([]);
  });

  it("hang every ceiling-only barrier column under the visual it caps, from the row that stops his model under it to its top", () => {
    const loose: string[] = [];
    for (const id of OVERHEAD_ISLANDS) {
      const ground = new Set(groundCells(id).map(([x, , z]) => `${x},${z}`));
      for (const [x, y, z] of FOOTPRINTS[id]) {
        if (ground.has(`${x},${z}`)) continue;
        const capped = visualsOf(id).some(({ slab }) => {
          const f = footprintOf(slab);
          const lo = Math.max(BODY_ROWS, Math.floor(f.y0 - MODEL_OVER));
          // under it: with his box inside the cell, his model (MODEL_REACH) would reach the visual
          return f.y0 < MODEL_TOP + JUMP_RISE && reaches(f, x, z, 0.5 - HALF + MODEL_REACH) && y >= lo && y < f.y1;
        });
        if (!capped) loose.push(`${id} (${x},${y},${z})`);
      }
    }
    expect(loose).toEqual([]);
  });

  // A minecart rider (crossings/ride.ts), seated in the ride pose as the cart reaches a station and on the hop out to
  // the stand-off point, over the real rail: his model from its feet to its top, and the mortarboard's board
  const terrain = buildWorld(layout, []).grid;
  const RIDE = poseFor("ride", 0, 0, { standUp: 0, reduced: true });
  const HOP = poseFor("jump", 0, 0, { standUp: 0, reduced: true });
  function riders(id: string) {
    const out: { lx: number; lz: number; y0: number }[] = [];
    const p = byId[id];
    for (const c of layout.crossings) {
      if (c.kind !== "minecart" || (c.from !== id && c.to !== id)) continue;
      const ends = railEnds(c, byId[c.from], byId[c.to]);
      const reverse = c.from === id;
      const ride: Ride = { kind: "rail", t: 0, duration: 4, rail: minecartRail(ends, terrain.isSolid), reverse, exit: { ...(reverse ? ends.standA : ends.standB) }, exitHeading: 0 };
      const rider = createCharacter({ x: 0, y: 0, z: 0 });
      for (let f = 0; f < 600; f++) {
        const done = advanceRide(ride, rider, 1 / 60);
        const lx = rider.pos.x - (p.origin.x + 0.5), lz = rider.pos.z - (p.origin.z + 0.5);
        const y0 = rider.pos.y - (p.origin.y + 1) + (ride.kind === "rail" ? RIDE.bodyY : HOP.bodyY);
        if (Math.hypot(lx, lz) <= p.radius * 1.25) out.push({ lx, lz, y0 });
        if (done) break;
      }
    }
    return out;
  }

  it("keep a minecart rider's model clear of every visual at the stations, seated or hopping out", () => {
    const hits = new Set<string>();
    let samples = 0;
    for (const id of layout.tourOrder) {
      for (const r of riders(id)) {
        samples++;
        for (const v of visualsOf(id)) {
          const f = footprintOf(v.slab);
          const what = v.what;
          for (const L of LAYERS) {
            if (L.overheadOnly && !(OVERHEAD[id] ?? []).includes(v)) continue;
            if (reaches(f, r.lx, r.lz, L.half) && f.y0 < r.y0 + L.y1 && f.y1 > r.y0 + L.y0) hits.add(`${id}: ${what} at (${r.lx.toFixed(1)}, ${r.lz.toFixed(1)})`);
          }
        }
      }
    }
    expect(samples).toBeGreaterThan(0);
    expect([...hits]).toEqual([]);
  });
});

/** Screen-space box (NDC, 16:9, TOUR_FOV) and depth of a set of world points seen from a tour stop. */
function projectBox(stop: { camera: Vec3; target: Vec3 }, pts: Vec3[]) {
  const f = { x: stop.target.x - stop.camera.x, y: stop.target.y - stop.camera.y, z: stop.target.z - stop.camera.z };
  const fl = Math.hypot(f.x, f.y, f.z);
  f.x /= fl; f.y /= fl; f.z /= fl;
  const rl = Math.hypot(f.z, f.x);
  const r = { x: -f.z / rl, y: 0, z: f.x / rl };
  const u = { x: r.y * f.z - r.z * f.y, y: r.z * f.x - r.x * f.z, z: r.x * f.y - r.y * f.x };
  const t = Math.tan(((TOUR_FOV / 2) * Math.PI) / 180);
  const box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, depth: 0 };
  for (const p of pts) {
    const v = { x: p.x - stop.camera.x, y: p.y - stop.camera.y, z: p.z - stop.camera.z };
    const z = v.x * f.x + v.y * f.y + v.z * f.z;
    const nx = (v.x * r.x + v.z * r.z) / (z * t * (16 / 9));
    const ny = (v.x * u.x + v.y * u.y + v.z * u.z) / (z * t);
    box.x0 = Math.min(box.x0, nx); box.x1 = Math.max(box.x1, nx);
    box.y0 = Math.min(box.y0, ny); box.y1 = Math.max(box.y1, ny);
    box.depth += z / pts.length;
  }
  return box;
}

describe("Web & Apps tour views", () => {
  type Box = ReturnType<typeof projectBox>;
  type Stop = ReturnType<typeof tourStopFor>;
  type Spot = { x: number; z: number; ry: number };
  /** Corners of a vertical panel: centre (x, z) local, width w turned by ry, from y0 to y1 above the grass. */
  const panel = (id: string, c: { x: number; z: number }, w: number, ry: number, y0: number, y1: number, dx = 0): Vec3[] => {
    const [fx, fy, fz] = islandFrame(byId[id]);
    const out: Vec3[] = [];
    for (const s of [-w / 2 + dx, w / 2 + dx]) for (const y of [y0, y1]) out.push({ x: fx + c.x + s * Math.cos(ry), y: fy + y, z: fz + c.z - s * Math.sin(ry) });
    return out;
  };
  const overlap = (a: Box, b: Box) =>
    (Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0))) /
    ((b.x1 - b.x0) * (b.y1 - b.y0));
  /** How far a box reaches toward the frame's edge (1 = on the edge). */
  const reach = (b: Box) => Math.max(-b.x0, b.x1, -b.y0, b.y1);
  const minis = [
    ["pos-monosuko", MONOSUKO],
    ["bee-furniture-crm", BEE],
    ["pedulipasal", PEDULI],
  ] as const;

  const mapBox = (id: string, stop: Stop, m: Spot) =>
    projectBox(stop, panel(id, m, MAP_BOARD.w, m.ry, MAP_BOARD.y - MAP_BOARD.h / 2, MAP_BOARD.y + MAP_BOARD.h / 2));
  /** A scaled InfoBoard's panel (boardGeometry.ts): from the post tops to the top edge its rows need. */
  const infoBox = (id: string, stop: Stop, b: Spot, title: string, lines: readonly string[], scale: number) =>
    projectBox(stop, panel(id, b, INFO_BOARD.width * scale, b.ry, INFO_BOARD.postH * scale, infoBoardTop(infoBoardRows(title, lines)) * scale));
  /** A scaled Signpost's face (boardGeometry.ts): the board's left end to the arrow's tip, off-centre on its post. */
  const signBox = (id: string, stop: Stop, l: Spot, scale: number) => {
    const f = SIGNPOST_FACE;
    return projectBox(stop, panel(id, l, (f.x1 - f.x0) * scale, l.ry, f.y0 * scale, f.y1 * scale, ((f.x0 + f.x1) / 2) * scale));
  };

  /** A mini's screen, info board, link sign and map board as screen-space boxes from its tour stop. */
  const miniBoxes = (id: string, L: (typeof minis)[number][1]): Record<"screen" | "info board" | "link sign" | "map board", Box> => {
    const stop = tourStopFor(byId[id]);
    const p = projectById(id);
    const scr = L.screen;
    return {
      screen: projectBox(stop, panel(id, scr, scr.w, 0, scr.y - scr.h / 2, scr.y + scr.h / 2)),
      "info board": infoBox(id, stop, L.info, p.title, miniBoardLines(p), MINI_BOARD_SCALE),
      "link sign": signBox(id, stop, L.link, MINI_SIGN_SCALE),
      "map board": mapBox(id, stop, L.map),
    };
  };
  /** The plaza's district sign (the plank face, PLAZA.sign) and its map board from the plaza's tour stop. */
  const plazaBoxes = (): Record<"district sign" | "map board", Box> => {
    const stop = tourStopFor(byId["web-plaza"]);
    const g = PLAZA.sign;
    return {
      "district sign": projectBox(stop, panel("web-plaza", g, g.w, g.ry, g.y - g.h / 2, g.y + g.h / 2)),
      "map board": mapBox("web-plaza", stop, PLAZA.map),
    };
  };

  /** The 8 world corners of an island-local box (centre, size, tilt rx about x as PropBlocks draws it). */
  const boxCorners = (id: string, b: { x: number; y: number; z: number; sx: number; sy: number; sz: number; rx?: number }): Vec3[] => {
    const [fx, fy, fz] = islandFrame(byId[id]);
    const c = Math.cos(b.rx ?? 0), s = Math.sin(b.rx ?? 0);
    const out: Vec3[] = [];
    for (const dx of [-b.sx / 2, b.sx / 2]) for (const dy of [-b.sy / 2, b.sy / 2]) for (const dz of [-b.sz / 2, b.sz / 2]) {
      out.push({ x: fx + b.x + dx, y: fy + b.y + dy * c - dz * s, z: fz + b.z + dy * s + dz * c });
    }
    return out;
  };
  /** LiveScreen's bezel reaches this far past the face on every side. */
  const BEZEL = SCREEN_BEZEL.rim;
  /**
   * What hangs over a mini's screen, as boxes: the POS awning (stripes and valance) and the badge standing on it. Being
   * above the screen, their screen-space boxes overlap its box while missing the face, so they get an exact test below.
   */
  const overhead: Record<string, { what: string; corners: Vec3[] }[]> = {
    "pos-monosuko": [
      ...awningParts().map((p) => ({ what: `awning ${p.kind} ${p.i}`, corners: boxCorners("pos-monosuko", p) })),
      { what: "badge", corners: boxCorners("pos-monosuko", { ...MONOSUKO.logo, sx: 2 * MONOSUKO.logo.r, sy: 2 * MONOSUKO.logo.r, sz: BADGE_DEPTH }) },
    ],
  };
  /** A point in the view's plane, x and y in the same unit (projectBox's x is divided by its 16:9 aspect). */
  const flat = (stop: Stop, q: Vec3) => {
    const b = projectBox(stop, [q]);
    return { x: (b.x0 * 16) / 9, y: b.y0 };
  };
  /** How far `q` lies above the line from `l` to `r` (l left of r), in half frame heights. */
  const above = (l: { x: number; y: number }, r: { x: number; y: number }, q: { x: number; y: number }) =>
    ((r.x - l.x) * (q.y - l.y) - (r.y - l.y) * (q.x - l.x)) / Math.hypot(r.x - l.x, r.y - l.y);
  /** The least clearance between an overhead corner and the screen's top edge: ~1.5 px at 720 tall, ~2 px at 940. */
  const OVERHEAD_CLEAR = 0.004;

  it("show each mini's screen whole in its stop: no board in front of it, nothing over it hanging into it (desktop and portrait)", () => {
    for (const [id, L] of minis) {
      const { screen, ...fronts } = miniBoxes(id, L);
      expect(reach(screen), `${id} screen inside the frame`).toBeLessThan(0.95);
      for (const [what, box] of Object.entries(fronts)) {
        if (box.depth >= screen.depth) continue;
        expect(overlap(box, screen), `${id}: ${what} covers the screen`).toBeLessThan(0.01);
      }
      // the screen (with its bezel) lies below the line through its projected top edge: everything overhead stays above it
      const scr = L.screen;
      const [fx, fy, fz] = islandFrame(byId[id]);
      const edge = [-1, 1].map((s) => ({ x: fx + scr.x + s * (scr.w / 2 + BEZEL), y: fy + scr.y + scr.h / 2 + BEZEL, z: fz + scr.z }));
      const desktop = tourStopFor(byId[id]);
      for (const [view, stop] of [["desktop", desktop], ["portrait", portraitStop(byId[id], desktop)]] as const) {
        const [l, r] = edge.map((q) => flat(stop, q));
        for (const part of overhead[id] ?? []) {
          const least = Math.min(...part.corners.map((q) => above(l, r, flat(stop, q))));
          expect(least, `${id} (${view}): the ${part.what} hangs into the screen`).toBeGreaterThan(OVERHEAD_CLEAR);
        }
      }
    }
  });

  it("keep each Web & Apps board and sign in view: none mostly hidden behind another or behind the screen", () => {
    const views: [string, Record<string, Box>][] = [["web-plaza", plazaBoxes()], ...minis.map(([id, L]): [string, Record<string, Box>] => [id, miniBoxes(id, L)])];
    for (const [id, boxes] of views) {
      for (const [what, box] of Object.entries(boxes)) {
        if (what === "screen") continue;
        if (what === "map board" || what === "district sign") expect(reach(box), `${id} ${what} inside the frame`).toBeLessThan(0.98);
        for (const [other, b] of Object.entries(boxes)) {
          if (other === what || b.depth >= box.depth) continue;
          expect(overlap(b, box), `${id}: the ${other} hides the ${what}`).toBeLessThan(what === "link sign" ? 0.3 : 0.25);
        }
      }
    }
  });
});

/*
 * Map boards (shared/MapBoard.tsx) stand low near each island's arrival point. From either tour view of their stop they
 * must not cover what the stop shows, the island's screen, its info board, its link sign or a bounce pad, beyond a
 * sliver; and the line from their closeup camera (desktop and phone) to the face must be clear of the island's props.
 * The star islands' link signs, kept inside the island with their whole face, must not cover what the stop shows either
 * (the Web & Apps signs have their own rule above).
 */
describe("map boards in the tour views and their closeups (all nine islands)", () => {
  type Pt = { x: number; y: number };
  type Quad = Vec3[];
  const MAPS: Record<string, Spot> = {
    hero: HERO.map, gtid: GTID.map, "petak-umpet": PETAK.map, "orbit-store": ORBIT.map, "ezra-bot": EZRA.map,
    "web-plaza": PLAZA.map, "pos-monosuko": MONOSUKO.map, "bee-furniture-crm": BEE.map, pedulipasal: PEDULI.map,
  };
  /** The share of an item's area (in the view) a map board in front of it may cover: a sliver along an edge. */
  const MAP_COVER = 0.01;

  /**
   * An upright rectangle's corners in order, in world space: centre (x, z) island-local, `w` wide along its turn ry,
   * from y0 to y1 above the grass, slid `dx` along its width and `back` behind its face.
   */
  const upright = (id: string, c: { x: number; z: number }, ry: number, w: number, y0: number, y1: number, dx = 0, back = 0): Quad => {
    const [fx, fy, fz] = islandFrame(byId[id]);
    const at = (s: number, y: number) => ({
      x: fx + c.x + Math.cos(ry) * s - Math.sin(ry) * back,
      y: fy + y,
      z: fz + c.z - Math.sin(ry) * s - Math.cos(ry) * back,
    });
    return [at(dx - w / 2, y0), at(dx + w / 2, y0), at(dx + w / 2, y1), at(dx - w / 2, y1)];
  };
  const slabQuad = (id: string, s: Slab): Quad => upright(id, s, s.ry ?? 0, s.sx, s.y - s.sy / 2, s.y + s.sy / 2);
  const signQuad = (id: string, l: Spot, scale: number): Quad => {
    const f = SIGNPOST_FACE;
    return upright(id, l, l.ry, (f.x1 - f.x0) * scale, f.y0 * scale, f.y1 * scale, ((f.x0 + f.x1) / 2) * scale);
  };
  /** A bounce pad's top: a PAD_SIZE square turned to face its pair, its plate ~0.1 up (crossings/BouncePad.tsx). */
  const padQuads = (id: string): Quad[] =>
    layout.crossings.flatMap((c) => {
      if (c.kind !== "bouncePads" || (c.from !== id && c.to !== id)) return [];
      const pads = padPair(c, byId[c.from], byId[c.to]);
      const pad = c.from === id ? pads.a : pads.b;
      const yaw = Math.atan2(pads.b.x - pads.a.x, pads.b.z - pads.a.z);
      const h = PAD_SIZE / 2;
      return [[[-h, -h], [h, -h], [h, h], [-h, h]].map(([u, v]) => ({
        x: pad.x + u * Math.cos(yaw) + v * Math.sin(yaw),
        y: pad.y + 0.1,
        z: pad.z - u * Math.sin(yaw) + v * Math.cos(yaw),
      }))];
    });
  const stats = (id: string) => projectById(id).stats ?? [];
  const priceBoard = (): Quad => {
    const g = GTID.board; // Gtid.tsx PriceBoard: a frame 0.16 larger than the face, its centre 0.4 under the face's
    const cy = g.y + g.h / 2 - 0.4;
    return upright("gtid", g, g.ry, g.w + 0.16, cy - (g.h + 0.16) / 2, cy + (g.h + 0.16) / 2);
  };
  const botScreen = (): Quad => {
    const s = EZRA.screen; // EzraBot.tsx SCREEN_GEO: a frame 0.14 larger than the face, its centre 0.2 under the face's
    const cy = s.y + s.h / 2 - 0.2;
    return upright("ezra-bot", s, s.ry, s.w + 0.14, cy - (s.h + 0.14) / 2, cy + (s.h + 0.14) / 2);
  };
  /** What each island's map board must leave in view. */
  const items = (id: string): { what: string; quad: Quad }[] => {
    const pads = padQuads(id).map((quad) => ({ what: "bounce pad", quad }));
    const mini = (L: typeof MONOSUKO | typeof BEE | typeof PEDULI) => [
      { what: "screen", quad: slabQuad(id, screenSlab(L.screen)) },
      { what: "info board", quad: slabQuad(id, miniInfoPanel(id, L.info)) },
      { what: "link sign", quad: signQuad(id, L.link, MINI_SIGN_SCALE) },
    ];
    const full = (at: Spot, title: string) => ({ what: "info board", quad: slabQuad(id, infoSlab(at, title, stats(id), 1)) });
    switch (id) {
      case "hero": return [{ what: "info board", quad: slabQuad(id, infoSlab(HERO.info, worldCopy.location, [worldCopy.heroLine], 1)) }];
      case "gtid": return [{ what: "screen", quad: priceBoard() }, full(GTID.info, GTID.info.title), { what: "link sign", quad: signQuad(id, GTID.link, 1) }];
      case "petak-umpet": return [full(PETAK.info, PETAK.info.title), { what: "link sign", quad: signQuad(id, PETAK.link, 1) }];
      case "orbit-store": return [full(ORBIT.info, ORBIT.info.title), { what: "link sign", quad: signQuad(id, ORBIT.link, 1) }, ...pads];
      case "ezra-bot": return [{ what: "screen", quad: botScreen() }, full(EZRA.info, EZRA.info.title), { what: "link sign", quad: signQuad(id, EZRA.link, 1) }, ...pads];
      case "web-plaza": return [{ what: "district sign", quad: slabQuad(id, districtSign()) }];
      case "pos-monosuko": return mini(MONOSUKO);
      case "bee-furniture-crm": return mini(BEE);
      case "pedulipasal": return mini(PEDULI);
      default: throw new Error(`no items for ${id}`);
    }
  };
  /** The map board's bezel and the post below it. */
  const mapQuads = (id: string): Quad[] => {
    const m = MAPS[id];
    const w = MAP_BOARD.w + 2 * SCREEN_BEZEL.rim;
    const h = MAP_BOARD.h + 2 * SCREEN_BEZEL.rim;
    const bottom = MAP_BOARD.y - h / 2;
    return [upright(id, m, m.ry, w, bottom, bottom + h), upright(id, m, m.ry, MAP_POST.w, 0, bottom, 0, MAP_POST.back)];
  };

  /** A stop's view basis: forward, right and up unit vectors, and the half-height slope of the frame. */
  const basis = (stop: { camera: Vec3; target: Vec3 }) => {
    const f = { x: stop.target.x - stop.camera.x, y: stop.target.y - stop.camera.y, z: stop.target.z - stop.camera.z };
    const fl = Math.hypot(f.x, f.y, f.z);
    f.x /= fl; f.y /= fl; f.z /= fl;
    const rl = Math.hypot(f.z, f.x);
    const r = { x: -f.z / rl, y: 0, z: f.x / rl };
    const u = { x: r.y * f.z - r.z * f.y, y: r.z * f.x - r.x * f.z, z: r.x * f.y - r.y * f.x };
    return { f, r, u, t: Math.tan(((TOUR_FOV / 2) * Math.PI) / 180) };
  };
  /** A world point seen from a stop: in half frame heights (the aspect cancels in area shares), with its depth. */
  const seen = (stop: { camera: Vec3; target: Vec3 }, q: Vec3) => {
    const { f, r, u, t } = basis(stop);
    const v = { x: q.x - stop.camera.x, y: q.y - stop.camera.y, z: q.z - stop.camera.z };
    const depth = v.x * f.x + v.y * f.y + v.z * f.z;
    return { x: (v.x * r.x + v.z * r.z) / (depth * t), y: (v.x * u.x + v.y * u.y + v.z * u.z) / (depth * t), depth };
  };
  /** The depth at which the camera ray through view point p meets the plane of the flat quad q (corners in order). */
  const rayDepth = (stop: { camera: Vec3; target: Vec3 }, p: Pt, q: Quad) => {
    const { f, r, u, t } = basis(stop);
    const d = { x: f.x + (p.x * r.x + p.y * u.x) * t, y: f.y + p.y * u.y * t, z: f.z + (p.x * r.z + p.y * u.z) * t };
    const e1 = { x: q[1].x - q[0].x, y: q[1].y - q[0].y, z: q[1].z - q[0].z };
    const e2 = { x: q[3].x - q[0].x, y: q[3].y - q[0].y, z: q[3].z - q[0].z };
    const n = { x: e1.y * e2.z - e1.z * e2.y, y: e1.z * e2.x - e1.x * e2.z, z: e1.x * e2.y - e1.y * e2.x };
    const c = stop.camera;
    return (n.x * (q[0].x - c.x) + n.y * (q[0].y - c.y) + n.z * (q[0].z - c.z)) / (n.x * d.x + n.y * d.y + n.z * d.z);
  };
  const area = (poly: Pt[]) => Math.abs(poly.reduce((s, p, i) => s + p.x * poly[(i + 1) % poly.length].y - poly[(i + 1) % poly.length].x * p.y, 0)) / 2;
  /** The part of polygon `subject` inside the convex polygon `clip` (Sutherland–Hodgman). */
  const clipTo = (subject: Pt[], clip: Pt[]): Pt[] => {
    const signed = clip.reduce((s, p, i) => s + p.x * clip[(i + 1) % clip.length].y - clip[(i + 1) % clip.length].x * p.y, 0);
    const c = signed < 0 ? [...clip].reverse() : clip;
    let out = subject;
    for (let i = 0; i < c.length && out.length; i++) {
      const a = c[i], b = c[(i + 1) % c.length];
      const side = (p: Pt) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
      const input = out;
      out = [];
      for (let j = 0; j < input.length; j++) {
        const p = input[j], q = input[(j + 1) % input.length];
        const sp = side(p), sq = side(q);
        const cut = () => ({ x: p.x + ((q.x - p.x) * sp) / (sp - sq), y: p.y + ((q.y - p.y) * sp) / (sp - sq) });
        if (sq >= 0) {
          if (sp < 0) out.push(cut());
          out.push(q);
        } else if (sp >= 0) out.push(cut());
      }
    }
    return out;
  };
  const centroid = (poly: Pt[]) => ({ x: poly.reduce((s, p) => s + p.x, 0) / poly.length, y: poly.reduce((s, p) => s + p.y, 0) / poly.length });

  /**
   * The share of each item a front piece (a map board, by default) covers in the desktop and portrait views of its stop:
   * where the two overlap in the view, whichever the camera ray through the overlap meets first is in front (two flat
   * panels that stand close and turned differently can't be ordered by their average depth).
   */
  type View = { camera: Vec3; target: Vec3 };
  const coverage = (front: (id: string, stop: View) => Quad[] | undefined = mapQuads, shown: typeof items = items) =>
    layout.islands.flatMap((p) => {
      const desktop = tourStopFor(p);
      return ([["desktop", desktop], ["portrait", portraitStop(p, desktop)]] as const).flatMap(([view, stop]) => {
        const pieces = front(p.id, stop);
        if (!pieces) return [];
        return shown(p.id).map(({ what, quad }) => {
          const item = quad.map((pt) => seen(stop, pt));
          const covered = pieces.reduce((sum, piece) => {
            const both = clipTo(item, piece.map((pt) => seen(stop, pt)));
            if (both.length < 3) return sum;
            const c = centroid(both);
            return rayDepth(stop, c, piece) < rayDepth(stop, c, quad) ? sum + area(both) : sum;
          }, 0);
          return { id: p.id, view, what, share: covered / area(item) };
        });
      });
    });

  it("keep every map board off its island's screen, info board, link sign and bounce pads in both tour views", () => {
    const covered = coverage().filter((c) => c.share > MAP_COVER).map((c) => `${c.id} (${c.view}): the map board covers ${(c.share * 100).toFixed(0)}% of the ${c.what}`);
    expect(covered).toEqual([]);
  });

  /** A star island's link sign: its face and its post. */
  const starSign = (id: string): Quad[] | undefined => {
    const l = ({ gtid: GTID.link, "petak-umpet": PETAK.link, "orbit-store": ORBIT.link, "ezra-bot": EZRA.link } as Record<string, Spot | undefined>)[id];
    return l && [signQuad(id, l, 1), upright(id, l, l.ry, SIGNPOST.postW, 0, SIGNPOST.postH)];
  };

  const MINIS = { "pos-monosuko": MONOSUKO, "bee-furniture-crm": BEE, pedulipasal: PEDULI } as const;
  const isMini = (id: string): id is keyof typeof MINIS => id in MINIS;
  /** A mini's solid props as the faces that look at a stop's camera. */
  const solidFaces = (id: string, stop: View): Quad[] | undefined => {
    const solids = SOLIDS[id];
    if (!solids || !isMini(id)) return undefined;
    const [fx, fy, fz] = islandFrame(byId[id]);
    const cam = new THREE.Vector3(stop.camera.x - fx, stop.camera.y - fy, stop.camera.z - fz);
    return solids.flatMap(({ box }) =>
      facesOf(box)
        .filter((f) => f.normal.dot(cam.clone().sub(f.centre)) > 0)
        .map((f) => f.corners.map((c) => ({ x: fx + c.x, y: fy + c.y, z: fz + c.z }))),
    );
  };
  /** A mini's boards and signs: its info board, link sign and map board. */
  const miniBoards = (id: string): { what: string; quad: Quad }[] => {
    if (!isMini(id)) return [];
    const L = MINIS[id];
    return [
      { what: "info board", quad: slabQuad(id, miniInfoPanel(id, L.info)) },
      { what: "link sign", quad: signQuad(id, L.link, MINI_SIGN_SCALE) },
      { what: "map board", quad: mapQuads(id)[0] },
    ];
  };

  /** Whether the convex polygon `poly` (corners in order) holds view point p. */
  const holds = (poly: Pt[], p: Pt) => {
    let sign = 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const side = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
      if (side === 0) continue;
      if (sign === 0) sign = Math.sign(side);
      else if (Math.sign(side) !== sign) return false;
    }
    return true;
  };
  /**
   * The share of each item that front pieces cover, sampled on a 40 × 40 grid across the item in the view: where pieces
   * overlap each other (a tree's blocks, a box's faces) a point counts once.
   */
  const sampledCoverage = (front: (id: string, stop: View) => Quad[] | undefined, shown: typeof items) =>
    layout.islands.flatMap((p) => {
      const desktop = tourStopFor(p);
      return ([["desktop", desktop], ["portrait", portraitStop(p, desktop)]] as const).flatMap(([view, stop]) => {
        const pieces = front(p.id, stop)?.map((quad) => ({ quad, poly: quad.map((pt) => seen(stop, pt)) }));
        if (!pieces) return [];
        return shown(p.id).map(({ what, quad }) => {
          const [a, b, , d] = quad;
          let hit = 0;
          const N = 40;
          for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
            const u = (i + 0.5) / N, v = (j + 0.5) / N;
            const q = { x: a.x + (b.x - a.x) * u + (d.x - a.x) * v, y: a.y + (b.y - a.y) * u + (d.y - a.y) * v, z: a.z + (b.z - a.z) * u + (d.z - a.z) * v };
            const pt = seen(stop, q);
            if (pieces.some((piece) => holds(piece.poly, pt) && rayDepth(stop, pt, piece.quad) < pt.depth)) hit++;
          }
          return { id: p.id, view, what, share: hit / (N * N) };
        });
      });
    });

  it("keep every mini island's boards and signs clear of the solid props in front of them in both tour views", () => {
    const covered = sampledCoverage(solidFaces, miniBoards)
      .filter((c) => c.share > MAP_COVER)
      .map((c) => `${c.id} (${c.view}): solid props cover ${(c.share * 100).toFixed(0)}% of the ${c.what}`);
    expect(covered).toEqual([]);
  });

  it("keep every star island's link sign off its screen, info board and bounce pads in both tour views", () => {
    const shown = (id: string) => items(id).filter((i) => i.what !== "link sign");
    const covered = coverage(starSign, shown).filter((c) => c.share > MAP_COVER).map((c) => `${c.id} (${c.view}): the link sign covers ${(c.share * 100).toFixed(0)}% of the ${c.what}`);
    expect(covered).toEqual([]);
  });

  /** A board's barrier columns (layouts.ts boardSpan: its centre line sampled every half block). */
  const spanColumns = (c: { x: number; z: number }, half: number, ry: number) => {
    const n = Math.ceil((2 * half) / 0.5);
    const out: string[] = [];
    for (let i = 0; i <= n; i++) {
      const s = -half + (2 * half * i) / n;
      out.push(`${Math.round(c.x + s * Math.cos(ry))},${Math.round(c.z - s * Math.sin(ry))}`);
    }
    return out;
  };
  /**
   * The thin panels on an island other than its map board (boards, signs and screens on posts), with the barrier
   * columns they stand in: a closeup line is tested against the panels themselves, other props against their cells.
   */
  const panelsOf = (id: string): { quad: Quad; columns: string[] }[] => {
    const columnsOf = (slabs: Slab[]) => slabs.flatMap((sl) => slabCells(sl)).map(([x, , z]) => `${x},${z}`);
    const info = (at: Spot, title: string, lines: readonly string[], scale = 1) => ({
      quad: slabQuad(id, infoSlab(at, title, lines, scale)),
      columns: columnsOf([infoSlab(at, title, lines, scale)]),
    });
    const link = (l: Spot, scale = 1) => [
      { quad: signQuad(id, l, scale), columns: columnsOf(signSlabs(l, scale)) },
      { quad: upright(id, l, l.ry, SIGNPOST.postW * scale, 0, SIGNPOST.postH * scale), columns: [] },
    ];
    const g = GTID.board, s = EZRA.screen, sign = PETAK.sign;
    const mini = (L: typeof MONOSUKO | typeof BEE | typeof PEDULI) => {
      const pr = projectById(id);
      return [info(L.info, pr.title, miniBoardLines(pr), MINI_BOARD_SCALE), ...link(L.link, MINI_SIGN_SCALE)];
    };
    switch (id) {
      case "hero": return [info(HERO.info, worldCopy.location, [worldCopy.heroLine])];
      case "gtid": return [{ quad: priceBoard(), columns: spanColumns(g, g.w / 2 - 0.3, g.ry) }, info(GTID.info, GTID.info.title, stats(id)), ...link(GTID.link)];
      case "petak-umpet": return [
        // PetakUmpet.tsx: the title sign's panel from SIGN_BOTTOM (0.55) up
        { quad: upright(id, sign, sign.ry, sign.w, 0.55, 0.55 + sign.h), columns: spanColumns(sign, sign.w / 2 - 0.3, sign.ry) },
        info(PETAK.info, PETAK.info.title, stats(id)), ...link(PETAK.link),
      ];
      case "orbit-store": return [info(ORBIT.info, ORBIT.info.title, stats(id)), ...link(ORBIT.link)];
      case "ezra-bot": return [{ quad: botScreen(), columns: spanColumns(s, s.w / 2 - 0.25, s.ry) }, info(EZRA.info, EZRA.info.title, stats(id)), ...link(EZRA.link)];
      case "web-plaza": return [{ quad: slabQuad(id, districtSign()), columns: spanColumns(PLAZA.sign, PLAZA.sign.w / 2 - 0.1, PLAZA.sign.ry) }];
      case "pos-monosuko": return mini(MONOSUKO);
      case "bee-furniture-crm": return mini(BEE);
      case "pedulipasal": return mini(PEDULI);
      default: throw new Error(`no panels for ${id}`);
    }
  };
  /** Whether the segment a→b crosses the planar quad q (its corners in order). */
  const crosses = (a: Vec3, b: Vec3, q: Quad): boolean => {
    const e1 = { x: q[1].x - q[0].x, y: q[1].y - q[0].y, z: q[1].z - q[0].z };
    const e2 = { x: q[3].x - q[0].x, y: q[3].y - q[0].y, z: q[3].z - q[0].z };
    const n = { x: e1.y * e2.z - e1.z * e2.y, y: e1.z * e2.x - e1.x * e2.z, z: e1.x * e2.y - e1.y * e2.x };
    const d = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const den = n.x * d.x + n.y * d.y + n.z * d.z;
    if (Math.abs(den) < 1e-12) return false;
    const t = (n.x * (q[0].x - a.x) + n.y * (q[0].y - a.y) + n.z * (q[0].z - a.z)) / den;
    if (t < 0 || t > 1) return false;
    const r = { x: a.x + d.x * t - q[0].x, y: a.y + d.y * t - q[0].y, z: a.z + d.z * t - q[0].z };
    const u = (r.x * e1.x + r.y * e1.y + r.z * e1.z) / (e1.x ** 2 + e1.y ** 2 + e1.z ** 2);
    const v = (r.x * e2.x + r.y * e2.y + r.z * e2.z) / (e2.x ** 2 + e2.y ** 2 + e2.z ** 2);
    return u >= 0 && u <= 1 && v >= 0 && v <= 1;
  };

  it("keep the line from each map board's closeup camera to its face clear of the island's props, on desktop and phone", () => {
    const blocked = new Set<string>();
    for (const p of layout.islands) {
      const m = MAPS[p.id];
      const [fx, fy, fz] = islandFrame(p);
      const panels = panelsOf(p.id);
      const own = mapSlabs(m).flatMap((sl) => slabCells(sl, 2)).map(([x, , z]) => `${x},${z}`);
      const boardColumns = new Set([...own, ...panels.flatMap((b) => b.columns)]);
      // the other props' visible columns: every row of a column that stands on the grass and holds no board
      const ground = new Set(groundCells(p.id).map(([x, , z]) => `${x},${z}`));
      const props = new Set(FOOTPRINTS[p.id].filter(([x, , z]) => ground.has(`${x},${z}`) && !boardColumns.has(`${x},${z}`)).map((c) => c.join(",")));
      const centre = { x: fx + m.x, y: fy + MAP_BOARD.y, z: fz + m.z };
      const normal = { x: Math.sin(m.ry), y: 0, z: Math.cos(m.ry) };
      const face = [...upright(p.id, m, m.ry, MAP_BOARD.w, MAP_BOARD.y - MAP_BOARD.h / 2, MAP_BOARD.y + MAP_BOARD.h / 2), centre];
      for (const [w, h] of [[1280, 720], [520, 940]]) {
        const aspect = w / h;
        const inset = CLOSEUP_HUD_PX / h;
        const limit = closeupPanLimit(MAP_BOARD, aspect, TOUR_FOV, inset);
        for (const pan of [-limit, 0, limit]) {
          const { camera } = closeupPose(centre, normal, MAP_BOARD, aspect, TOUR_FOV, undefined, { inset, pan });
          for (const q of face) {
            const len = Math.hypot(q.x - camera.x, q.y - camera.y, q.z - camera.z);
            // up to the near plane, CLOSEUP_NEAR_MARGIN in front of the face
            const end = (len - CLOSEUP_NEAR_MARGIN) / len;
            const near = { x: camera.x + (q.x - camera.x) * end, y: camera.y + (q.y - camera.y) * end, z: camera.z + (q.z - camera.z) * end };
            if (panels.some((b) => crosses(camera, near, b.quad))) blocked.add(`${p.id} (${w}x${h}): a board between the closeup camera and the map board`);
            for (let d = 0; d <= len - CLOSEUP_NEAR_MARGIN; d += 0.02) {
              const t = d / len;
              const cell = [
                Math.floor(camera.x + (q.x - camera.x) * t - fx + 0.5),
                Math.floor(camera.y + (q.y - camera.y) * t - fy),
                Math.floor(camera.z + (q.z - camera.z) * t - fz + 0.5),
              ].join(",");
              if (props.has(cell)) {
                blocked.add(`${p.id} (${w}x${h}): prop cell (${cell}) between the closeup camera and the map board`);
                break;
              }
            }
          }
        }
      }
    }
    expect([...blocked]).toEqual([]);
  });
});
