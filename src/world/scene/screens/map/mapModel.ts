import { generateIsland } from "@/world/engine/gen/islandGen";
import { CHAIN_DIR, type CrossingKind, type IslandPlacement, type WorldLayout } from "@/world/engine/gen/layout";
import { islandTitle } from "@/world/scene/islands/shared/project";
import type { HitRegion } from "../types";

/** The map canvas in drawing units (LiveScreen renders it at SCREEN_SCALE): 16:10, the board's 1.5 × 0.9375 face. */
export const MAP_LOGICAL = { w: 480, h: 300 } as const;
/** Where the islands are drawn: under the title row, above the button bar. */
export const MAP_AREA = { x: 12, y: 30, w: 456, h: 222 } as const;
/** Room kept above and below the islands inside MAP_AREA for their names, and at its sides. */
const LABEL_ROOM = 15;
const SIDE_ROOM = 22;
/** Names are drawn at 9.5 px: this many drawing units per character is a safe width estimate (about 0.52 em). */
export const LABEL_CHAR_W = 4.95;
/** Air kept on each side of a name when names are placed. */
const LABEL_GAP = 4;
/** The button bar: previous, "Travel to …", next. The board's arrow keys and Enter press these (MapBoard.tsx). */
export const MAP_BUTTONS = {
  prev: { x: 12, y: 260, w: 44, h: 30 },
  go: { x: 64, y: 260, w: 352, h: 30 },
  next: { x: 424, y: 260, w: 44, h: 30 },
} as const;
export type MapButton = keyof typeof MAP_BUTTONS;

export interface MapPoint { x: number; y: number }
export interface MapIsland {
  id: string;
  name: string;
  /** centre and rim on the canvas */
  c: MapPoint;
  outline: MapPoint[];
  /** where the name goes: centred on x, baseline y */
  label: MapPoint;
  region: HitRegion;
}
export interface MapLink { kind: CrossingKind; a: MapPoint; b: MapPoint }
export interface MapModel { islands: MapIsland[]; links: MapLink[]; here: number; scale: number }

/** The tour framings' forward (CHAIN_DIR is their screen-right): further from the tour camera is further along it. */
const MAP_UP = { x: CHAIN_DIR.z, z: -CHAIN_DIR.x };

/**
 * Top-down projection that reads like the tour: u runs along the framings' screen-right (CHAIN_DIR, the way the tour
 * travels), v along their forward (away from the camera). On the canvas u grows to the right and v grows upward.
 */
export function projectTopDown(p: { x: number; z: number }): { u: number; v: number } {
  return { u: p.x * CHAIN_DIR.x + p.z * CHAIN_DIR.z, v: p.x * MAP_UP.x + p.z * MAP_UP.z };
}

/** Convex hull (monotone chain) of points, counter-clockwise. */
function hull(pts: { u: number; v: number }[]): { u: number; v: number }[] {
  const p = [...pts].sort((a, b) => a.u - b.u || a.v - b.v);
  const cross = (o: { u: number; v: number }, a: { u: number; v: number }, b: { u: number; v: number }) =>
    (a.u - o.u) * (b.v - o.v) - (a.v - o.v) * (b.u - o.u);
  const lower: typeof p = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: typeof p = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** An island's outline from above, in map coordinates: the convex hull of its real grass top's block corners. */
export function islandOutline(p: IslandPlacement): { u: number; v: number }[] {
  const top = generateIsland({ radius: p.radius, depth: p.depth, seed: p.seed }).cells.filter((c) => c.y === 0);
  const corners = top.flatMap((c) =>
    [[0, 0], [1, 0], [0, 1], [1, 1]].map(([dx, dz]) => projectTopDown({ x: p.origin.x + c.x + dx, z: p.origin.z + c.z + dz })),
  );
  return hull(corners);
}

/** Everything on a map but its own island: the same for every board of one layout. */
type MapBase = Omit<MapModel, "here"> & { index: Map<string, number> };
const bases = new WeakMap<WorldLayout, MapBase>();

/**
 * Builds the map from the live layout: islands in tour order (others after), their outlines, crossings and hit regions.
 * The islands, names and links depend only on the layout, so they are built once per layout and shared by every board
 * (nine boards regenerate each island's outline once, not nine times); only `here` differs. Treat them as read-only.
 */
export function buildMapModel(layout: WorldLayout, here: string): MapModel {
  let base = bases.get(layout);
  if (!base) {
    base = mapBase(layout);
    bases.set(layout, base);
  }
  return { islands: base.islands, links: base.links, scale: base.scale, here: Math.max(0, base.index.get(here) ?? 0) };
}

function mapBase(layout: WorldLayout): MapBase {
  const ordered = [
    ...layout.tourOrder.map((id) => layout.islands.find((i) => i.id === id)).filter((p): p is IslandPlacement => !!p),
    ...layout.islands.filter((p) => !layout.tourOrder.includes(p.id)),
  ];
  const rims = ordered.map(islandOutline);
  const all = rims.flat();
  const u0 = Math.min(...all.map((q) => q.u));
  const u1 = Math.max(...all.map((q) => q.u));
  const v0 = Math.min(...all.map((q) => q.v));
  const v1 = Math.max(...all.map((q) => q.v));
  const innerW = MAP_AREA.w - 2 * SIDE_ROOM;
  const innerH = MAP_AREA.h - 2 * LABEL_ROOM;
  const scale = Math.min(innerW / (u1 - u0), innerH / (v1 - v0));
  const ox = MAP_AREA.x + (MAP_AREA.w - (u1 - u0) * scale) / 2;
  const oy = MAP_AREA.y + LABEL_ROOM + (innerH - (v1 - v0) * scale) / 2;
  const toCanvas = (q: { u: number; v: number }): MapPoint => ({ x: ox + (q.u - u0) * scale, y: oy + (v1 - q.v) * scale });

  const centres = ordered.map((p) => toCanvas(projectTopDown({ x: p.origin.x + 0.5, z: p.origin.z + 0.5 })));
  const vOf = ordered.map((p) => projectTopDown({ x: p.origin.x + 0.5, z: p.origin.z + 0.5 }).v);
  const outlines = rims.map((r) => r.map(toCanvas));
  // a name goes above its island when the island sits further back than its tour neighbours, else below; a name that
  // would overlap an earlier one first slides sideways a little, then tries the other side
  type Box = { x0: number; x1: number; y0: number; y1: number };
  const placed: Box[] = [];
  const clash = (b: Box) => placed.some((o) => b.x0 < o.x1 && o.x0 < b.x1 && b.y0 < o.y1 && o.y0 < b.y1);
  const labels = ordered.map((p, i) => {
    const near = [vOf[i - 1], vOf[i + 1]].filter((v): v is number => v !== undefined);
    const prefer = near.length > 0 && vOf[i] > near.reduce((a, b) => a + b, 0) / near.length;
    const top = Math.min(...outlines[i].map((q) => q.y));
    const bottom = Math.max(...outlines[i].map((q) => q.y));
    const w = islandTitle(p.id).length * LABEL_CHAR_W;
    const at = (above: boolean, dx: number) => {
      const x = Math.min(MAP_AREA.x + MAP_AREA.w - w / 2 - 2, Math.max(MAP_AREA.x + w / 2 + 2, centres[i].x + dx));
      const y = above ? top - 4 : bottom + 11;
      // LABEL_GAP of air on each side: two names never touch ("POS MonosukoPeduliPasal")
      return { x, y, box: { x0: x - w / 2 - LABEL_GAP, x1: x + w / 2 + LABEL_GAP, y0: y - 9, y1: y + 2 } };
    };
    const tries = [at(prefer, 0), at(prefer, 12), at(prefer, -12), at(!prefer, 0), at(!prefer, 12), at(!prefer, -12)];
    const l = tries.find((c) => !clash(c.box)) ?? tries[0];
    placed.push(l.box);
    return l;
  });

  const islands = ordered.map((p, i): MapIsland => {
    const outline = outlines[i];
    const c = centres[i];
    // a square around the centre, never reaching half way to another island's centre (so no two overlap)
    const reach = Math.max(...outline.map((q) => Math.hypot(q.x - c.x, q.y - c.y)));
    const gap = Math.min(...centres.filter((_, j) => j !== i).map((o) => Math.max(Math.abs(o.x - c.x), Math.abs(o.y - c.y))));
    const half = Math.max(4, Math.min(reach + 4, gap / 2 - 1));
    const x0 = Math.max(MAP_AREA.x, c.x - half);
    const y0 = Math.max(MAP_AREA.y, c.y - half);
    const x1 = Math.min(MAP_AREA.x + MAP_AREA.w, c.x + half);
    const y1 = Math.min(MAP_AREA.y + MAP_AREA.h, c.y + half);
    return {
      id: p.id,
      name: islandTitle(p.id),
      c,
      outline,
      label: { x: labels[i].x, y: labels[i].y },
      region: { x: x0, y: y0, w: x1 - x0, h: y1 - y0, action: "go", arg: i },
    };
  });

  const index = new Map(ordered.map((p, i) => [p.id, i]));
  const links = layout.crossings
    .filter((c) => index.has(c.from) && index.has(c.to))
    .map((c): MapLink => ({ kind: c.kind, a: toCanvas(projectTopDown(c.a)), b: toCanvas(projectTopDown(c.b)) }));
  return { islands, links, scale, index };
}

/** Every hit region on the map: one per island (action "go", arg = island index), then the three buttons. */
export function mapRegions(model: MapModel): HitRegion[] {
  return [
    ...model.islands.map((i) => i.region),
    { ...MAP_BUTTONS.prev, action: "prev" },
    { ...MAP_BUTTONS.go, action: "go" },
    { ...MAP_BUTTONS.next, action: "next" },
  ];
}

/** The island `dir` steps from `from` in tour order, wrapping round. */
export function stepIsland(model: MapModel, from: number, dir: 1 | -1): number {
  const n = model.islands.length;
  return (((from + dir) % n) + n) % n;
}

/** Where the cursor starts: the next stop after the board's own island. */
export function initialCursor(model: MapModel): number {
  return stepIsland(model, model.here, 1);
}

/** The button a key presses on a map board in closeup (arrows step the cursor, Enter travels), or null. */
export function mapKeyButton(code: string): MapButton | null {
  if (code === "ArrowLeft" || code === "ArrowUp") return "prev";
  if (code === "ArrowRight" || code === "ArrowDown") return "next";
  if (code === "Enter" || code === "NumpadEnter") return "go";
  return null;
}
