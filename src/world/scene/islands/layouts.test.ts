import { describe, expect, it } from "vitest";
import { buildLayout } from "@/world/engine/gen/layout";
import { generateIsland } from "@/world/engine/gen/islandGen";
import { DEFAULT_PARAMS, characterCollides, createCharacter, stepCharacter } from "@/world/engine/physics/character";
import { worldCopy, worldProjects } from "@/config/portfolio";
import type { Vec3 } from "@/world/engine/types";
import { PAD_SIZE, SIGN_OFFSET, SIGN_WIDTH, STATION_SIZE, padPair, railEnds } from "@/world/scene/crossings/geometry";
import {
  BEE, BODY_ROWS, EZRA, FOOTPRINTS, GTID, HERO, INFO_HALF_SPAN, MAP_BOARD, MAP_HALF_SPAN, MINI_ANCHOR_CLEARANCE,
  MINI_BOARD_SCALE, MINI_SIGN_SCALE, MONOSUKO, ORBIT, PEDULI, PETAK, PLAZA, SLIVER, beeRoofPlanks, bubbleSlabs,
  crownSlabs, footprintOf, reaches, screenSlab, type Slab,
} from "./layouts";
import { TOUR_FOV, portraitStop, tourStopFor } from "./framing";
import { awningParts } from "./monosuko/awning";
import { INFO_BOARD, SCREEN_BEZEL, SIGNPOST_FACE, infoBoardTop } from "./shared/boardGeometry";
import { islandFrame } from "./shared/local";
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
      for (const [x, , z] of groundCells(id)) expect(Math.hypot(x, z), `${id} (${x},${z})`).toBeLessThanOrEqual(r);
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
    { id: "gtid", what: "info board", at: GTID.info, half: INFO_HALF_SPAN, ry: GTID.info.ry, top: infoTop("gtid.pro", stats("gtid")) },
    { id: "petak-umpet", what: "title sign", at: PETAK.sign, half: PETAK.sign.w / 2 - 0.3, ry: PETAK.sign.ry, top: 0.55 + PETAK.sign.h }, // PetakUmpet.tsx SIGN_BOTTOM 0.55
    { id: "petak-umpet", what: "info board", at: PETAK.info, half: INFO_HALF_SPAN, ry: PETAK.info.ry, top: infoTop("Roblox", stats("petak-umpet")) },
    { id: "orbit-store", what: "info board", at: ORBIT.info, half: INFO_HALF_SPAN, ry: ORBIT.info.ry, top: infoTop("Orbit Store", stats("orbit-store")) },
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

/*
 * Overhead: Ezra's box is 1.8 tall and a jump lifts it ~1.46 more, so on the grass his head reaches ~3.27. Wherever he
 * can stand under a roof, screen, crown or bubble whose underside is lower, a barrier row must stop his head at that
 * underside, or at the first row above his body (BODY_ROWS) when the visual hangs lower than that. He can also step
 * onto a one-row barrier (stepHeight 1): from that ledge the same holds one row up, and he must not stand inside a prop.
 */
describe("overhead visuals on the Web & Apps islands and Ezra Bot", () => {
  type Spot = { x: number; z: number; ry: number };
  type Visual = { what: string; slab: Slab };
  const H = DEFAULT_PARAMS.height;
  const HALF = DEFAULT_PARAMS.width / 2;

  /** An InfoBoard's panel (boardGeometry.ts) as a slab: from its post tops to the top edge its rows need. */
  const infoPanel = (at: Spot, title: string, lines: readonly string[], scale: number): Slab => {
    const y0 = INFO_BOARD.postH * scale;
    const y1 = infoBoardTop(infoBoardRows(title, lines)) * scale;
    return { x: at.x, y: (y0 + y1) / 2, z: at.z, sx: INFO_BOARD.width * scale, sy: y1 - y0, sz: 0, ry: at.ry };
  };
  /** A map board's bezel (shared/MapBoard.tsx: a LiveScreen MAP_BOARD.y up, turned by ry). */
  const mapPanel = (m: Spot): Slab => {
    const back = SCREEN_BEZEL.depth / 2;
    const s = screenSlab({ x: m.x, y: MAP_BOARD.y, z: m.z, w: MAP_BOARD.w, h: MAP_BOARD.h });
    return { ...s, x: m.x - Math.sin(m.ry) * back, z: m.z - Math.cos(m.ry) * back, ry: m.ry };
  };
  const miniInfo = (id: string, at: Spot): Visual => {
    const p = projectById(id);
    return { what: "info board", slab: infoPanel(at, p.title, miniBoardLines(p), MINI_BOARD_SCALE) };
  };
  const pv = PEDULI.pavilion;
  const grill = MONOSUKO.grill;
  const robot = EZRA.robot;
  /**
   * Everything on these islands that Ezra's head could rise into. Signposts and lamps stay out: their faces and lanterns
   * end within SLIVER above BODY_ROWS (a full-size sign face at 2.1, a lamp cap at 1.98), where no barrier row can sit.
   */
  const visuals: Record<string, Visual[]> = {
    "web-plaza": [
      ...crownSlabs(PLAZA.tree).map((slab) => ({ what: "tree crown", slab })),
      { what: "district sign", slab: { x: PLAZA.sign.x, y: PLAZA.sign.y, z: PLAZA.sign.z, sx: PLAZA.sign.w, sy: PLAZA.sign.h, sz: 0, ry: PLAZA.sign.ry } },
      { what: "map board", slab: mapPanel(PLAZA.map) },
    ],
    "pos-monosuko": [
      ...awningParts().map((slab) => ({ what: "awning", slab })),
      { what: "screen", slab: screenSlab(MONOSUKO.screen) },
      { what: "badge", slab: { x: MONOSUKO.logo.x, y: MONOSUKO.logo.y, z: MONOSUKO.logo.z, sx: 2 * MONOSUKO.logo.r, sy: 2 * MONOSUKO.logo.r, sz: BADGE_DEPTH } },
      // on the counter top, its row 0's top
      { what: "grill", slab: { x: grill.x, y: (1 + grill.top) / 2, z: grill.z, sx: grill.w, sy: grill.top - 1, sz: grill.d } },
      miniInfo("pos-monosuko", MONOSUKO.info),
      { what: "map board", slab: mapPanel(MONOSUKO.map) },
    ],
    "bee-furniture-crm": [
      ...beeRoofPlanks().map((slab) => ({ what: "shed roof", slab })),
      { what: "screen", slab: screenSlab(BEE.screen) },
      miniInfo("bee-furniture-crm", BEE.info),
      { what: "map board", slab: mapPanel(BEE.map) },
    ],
    pedulipasal: [
      ...PEDULI.roof.map((s) => ({ what: "pavilion roof", slab: { ...s, x: (pv.x0 + pv.x1) / 2, z: (pv.z0 + pv.z1) / 2 } })),
      ...crownSlabs(PEDULI.tree).map((slab) => ({ what: "tree crown", slab })),
      miniInfo("pedulipasal", PEDULI.info),
      { what: "map board", slab: mapPanel(PEDULI.map) },
    ],
    "ezra-bot": [
      ...bubbleSlabs().map((slab) => ({ what: "chat bubbles", slab })),
      // the robot from its feet to past anything a jump reaches (its antenna ends ~3.9 up)
      { what: "robot", slab: { x: robot.x, y: 2, z: robot.z, sx: robot.w, sy: 4, sz: robot.d } },
      { what: "info board", slab: infoPanel(EZRA.info, EZRA.info.title, projectById("ezra-bot").stats ?? [], 1) },
      { what: "map board", slab: mapPanel(EZRA.map) },
    ],
  };

  /** A jump's rise on open ground through the real physics: ≈ 1.46 at its 120 Hz substeps (jumpSpeed² / 2g = 1.50). */
  const JUMP = (() => {
    const s = createCharacter({ x: 0.5, y: 0, z: 0.5 });
    let top = 0;
    for (let f = 0; f < 90; f++) {
      stepCharacter(s, { moveX: 0, moveZ: 0, run: false, jump: f === 0 }, 1 / 60, { isSolid: (_x, y) => y < 0, killY: -10 });
      top = Math.max(top, s.pos.y);
    }
    return top;
  })();

  /** Samples per block: Ezra's box (half 0.3) sits flush on a cell edge (k + 0.5) with its centre on this grid. */
  const STEP = 10;

  /**
   * Every spot Ezra can stand on, reached from the island's crossing heads: walking, dropping off an edge, and stepping
   * (or jumping, which rises < 2) one row up onto a barrier column. Each with the height his head rises to in a jump:
   * the lowest barrier row over his box above his body, or the jump's top.
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
    return [...seen].map((s) => {
      const [i, k, y] = s.split(",").map(Number);
      const px = i / STEP, pz = k / STEP;
      let ceiling = Infinity;
      for (const [x, z] of columns(px, pz)) {
        for (let r = y + BODY_ROWS; r < ceiling; r++) {
          if (solid(x, r, z)) ceiling = r;
          if (r > y + 6) break;
        }
      }
      return { px, pz, y, peak: Math.min(y + H + JUMP, ceiling) };
    });
  }

  /** Where Ezra's head rises into a visual, or a ledge stands him inside one: "<island>: <what> at (cell)" → how far. */
  function gaps(id: string): Map<string, number> {
    const found = new Map<string, number>();
    const note = (key: string, by: number) => found.set(key, Math.max(found.get(key) ?? 0, by));
    for (const { px, pz, y, peak } of footing(id)) {
      for (const { what, slab } of visuals[id]) {
        const f = footprintOf(slab);
        if (!reaches(f, px, pz, HALF - SLIVER)) continue;
        const at = `(${Math.round(px)},${Math.round(pz)})${y > 0 ? ` on a ledge ${y} up` : ""}`;
        if (y > 0 && f.y0 < y + H && f.y1 > y) note(`${id}: stands inside the ${what} at ${at}`, Math.min(f.y1, y + H) - Math.max(f.y0, y));
        if (f.y1 <= y + BODY_ROWS + SLIVER || f.y0 >= peak) continue;
        const over = peak - Math.max(f.y0, y + BODY_ROWS);
        if (over > 1e-9) note(`${id}: head rises into the ${what} at ${at}`, over);
      }
    }
    return found;
  }

  /**
   * Gaps no barrier closes without breaking a placement rule above (their ceiling cell lies in a crossing's clearance
   * ring or over its furniture), or that wait on a scheduled visual change. Listed by the cell Ezra's box is centred
   * in, with how far his head rises in, so a new gap, a deeper one or a closed one all show up here.
   */
  const OPEN = [
    { id: "web-plaza", what: "tree crown", at: ["(-3,-2)", "(-3,-1)", "(-4,-1)", "(-4,-2)"], upTo: 0.27 }, // corner block over (−3, −2), 1.55 from the minecart anchor
    { id: "pos-monosuko", what: "screen", at: ["(2,-2)", "(-2,-2)"], upTo: 1.27 }, // ends over (±2, −2): 1.62 / 1.12 from the bridge anchors, (−2, −2) on a rope post
    { id: "bee-furniture-crm", what: "shed roof", at: ["(-2,0)"], upTo: 0.69 }, // front-left eave over (−2, 0), 1.14 from the POS bridge anchor
    { id: "ezra-bot", what: "chat bubbles", at: ["(3,0)", "(3,1)", "(4,0)", "(4,1)"], upTo: 1.27 }, // right half over the minecart station
    // the lower slab overhangs its barrier cells by 0.2–0.3, 3.20 up: raising the roof ~0.15 is scheduled
    { id: "pedulipasal", what: "pavilion roof", at: ["(-1,0)", "(-1,-1)", "(-1,-2)", "(-1,-3)", "(0,0)", "(1,0)", "(2,0)", "(0,-3)", "(1,-3)", "(2,-3)", "(3,-3)"], upTo: 0.07 },
  ];

  it("never let a jump put Ezra's head into what hangs overhead, nor a ledge stand him inside a prop", () => {
    const found = new Map(OVERHEAD_ISLANDS.flatMap((id) => [...gaps(id)]));
    const open = new Map<string, number>(OPEN.flatMap((g) => g.at.map((c) => [`${g.id}: head rises into the ${g.what} at ${c}`, g.upTo])));
    const unexpected = [...found].filter(([k, by]) => !(by <= (open.get(k) ?? -1))).map(([k, by]) => `${k} by ${by.toFixed(2)}`);
    expect(unexpected).toEqual([]);
    expect([...open.keys()].filter((k) => !found.has(k)), "closed: drop it from OPEN").toEqual([]);
  });

  it("hang every ceiling-only barrier column under the visual it caps, from its underside's row up to its top", () => {
    const loose: string[] = [];
    for (const id of OVERHEAD_ISLANDS) {
      const ground = new Set(groundCells(id).map(([x, , z]) => `${x},${z}`));
      for (const [x, y, z] of FOOTPRINTS[id]) {
        if (ground.has(`${x},${z}`)) continue;
        const capped = visuals[id].some(({ slab }) => {
          const f = footprintOf(slab);
          return reaches(f, x, z, 0.5 - SLIVER) && y >= Math.max(BODY_ROWS, Math.floor(f.y0)) && y < f.y1;
        });
        if (!capped) loose.push(`${id} (${x},${y},${z})`);
      }
    }
    expect(loose).toEqual([]);
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
