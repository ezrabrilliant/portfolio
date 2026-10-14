import type { District, WorldProject } from "@/config/schema";
import { generateIsland, type IslandShape } from "@/world/engine/gen/islandGen";
import { hashString } from "@/world/engine/gen/rng";
import type { Vec3, Vec3i } from "@/world/engine/types";

export type IslandKind = "hero" | "star" | "mini" | "hub";
export interface IslandPlacement {
  id: string; kind: IslandKind; district: District | "hero";
  origin: Vec3i; radius: number; depth: number; seed: number;
}
export type CrossingKind = "bridge" | "bouncePads" | "minecart";
export interface Crossing { kind: CrossingKind; from: string; to: string; a: Vec3; b: Vec3 }
export interface WorldLayout { islands: IslandPlacement[]; crossings: Crossing[]; tourOrder: string[] }

type Anchor = { origin: Vec3i; radius: number; depth: number };
type Disc = Pick<IslandPlacement, "origin" | "radius">;

export const STAR_ANCHORS: Record<string, Anchor> = {
  hero: { origin: { x: 0, y: 0, z: 0 }, radius: 6, depth: 6 },
  gtid: { origin: { x: 22, y: 2, z: -8 }, radius: 9, depth: 7 },
  "petak-umpet": { origin: { x: 44, y: 3, z: -2 }, radius: 9, depth: 7 },
  "orbit-store": { origin: { x: 64, y: 10, z: -18 }, radius: 8, depth: 6 },
  "ezra-bot": { origin: { x: 84, y: 14, z: -12 }, radius: 8, depth: 6 },
};

/** The hero and the star islands, in tour order (the tour continues with the web plaza and its chain). */
export const STAR_TOUR: readonly string[] = ["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot"];

/** The Web & Apps district's plaza: an island with no project, emitted when any web project exists. */
export const WEB_PLAZA_ID = "web-plaza";
export const HUB_RADIUS = 5;
export const HUB_DEPTH = 5;

export const DISTRICT_HUBS: Record<District, { origin: Vec3i; radius: number }> = {
  game: { origin: STAR_ANCHORS.gtid.origin, radius: STAR_ANCHORS.gtid.radius },
  discord: { origin: STAR_ANCHORS["orbit-store"].origin, radius: STAR_ANCHORS["orbit-store"].radius },
  // the tour continues to the right: 36 blocks past Ezra Bot along CHAIN_DIR and 2 further from the camera, 6 lower
  // (the Ezra Bot → plaza rail is 31.5 blocks, at most 24° steep, and its station clears Ezra Bot's screen board)
  web: { origin: { x: 120, y: 8, z: -6 }, radius: HUB_RADIUS },
};

export const MINI_RADIUS = 4;
export const MINI_DEPTH = 4;
const GOLDEN_ANGLE = 2.39996;

/**
 * Screen-right of the tour: the island framings (scene/islands/framing.ts) look from the front-left, their camera →
 * target headings 10–20° off −z, and their right vectors average 11.9° from +x toward +z. The engine must not import
 * the scene, so it keeps this 12° copy; islands/framing.test.ts checks it stays within 3° of the framings' average.
 */
const CHAIN_YAW = (12 * Math.PI) / 180;
/** The web chain (and the plaza after Ezra Bot) advances along the tour's screen-right, unit length. */
export const CHAIN_DIR: { x: number; z: number } = { x: Math.cos(CHAIN_YAW), z: Math.sin(CHAIN_YAW) };
/** The tour's screen-forward (into the screen): the depth axis of the chain's zigzag. */
const CHAIN_FWD = { x: CHAIN_DIR.z, z: -CHAIN_DIR.x };
/** Height of each chain island above the hub, per chain index (repeats): consecutive steps stay ≤ 2 → bridges. */
export const CHAIN_HEIGHTS: readonly number[] = [1, 2, 1];
/** Depth offset (blocks along the tour forward) of chain island i from the chain axis: 3 nearer the camera for even i, 3 further for odd. */
export const CHAIN_DEPTH = 3;
/** Bridge length between consecutive chain islands' edge anchors, in blocks (3D distance). */
export const CHAIN_BRIDGE = { min: 6, max: 9 } as const;
/** How far past the overlap clearance the ideal centre lies (blocks): rounding to whole columns stays inside the window. */
const CHAIN_SLACK = 0.5;

export function chooseCrossing(from: IslandPlacement, to: IslandPlacement): CrossingKind {
  if (from.district !== "hero" && to.district !== "hero" && from.district !== to.district) return "minecart";
  return Math.abs(to.origin.y - from.origin.y) > 2 ? "bouncePads" : "bridge";
}

/**
 * Point on `from`'s rim toward `to`, at 0.75 × radius, on the walkable surface. The generator centres an island on
 * its origin column (origin + 0.5); the hero and star islands keep their Phase 1 anchors, measured from the origin
 * corner (their wide rims never dip below 0.8 × radius), while the small Web & Apps islands (hub, minis) measure from
 * the true centre, or a radius-4 rim misses the bridge end on its −x / −z side.
 */
export function edgeAnchor(from: IslandPlacement, to: IslandPlacement): Vec3 {
  const dx = to.origin.x - from.origin.x;
  const dz = to.origin.z - from.origin.z;
  const len = Math.hypot(dx, dz) || 1;
  const reach = from.radius * 0.75;
  const c = from.kind === "hub" || from.kind === "mini" ? 0.5 : 0;
  return { x: from.origin.x + c + (dx / len) * reach, y: from.origin.y + 1, z: from.origin.z + c + (dz / len) * reach };
}

export function satelliteOrigin(hub: Vec3i, hubRadius: number, index: number): Vec3i {
  const angle = 0.6 + index * GOLDEN_ANGLE;
  const dist = hubRadius * 1.25 + 9 + (index % 2) * 3;   // always clears the hub's own overlap margin
  return {
    x: Math.round(hub.x + Math.cos(angle) * dist),
    y: hub.y + ((index % 3) - 1) * 2,
    z: Math.round(hub.z + Math.sin(angle) * dist),
  };
}

/** Closest centre distance two islands may have: (r1 + r2) × 1.25 + 3 (the generator wobbles rims out to 1.2 × r). */
function clearance(r1: number, r2: number): number {
  return (r1 + r2) * 1.25 + 3;
}

function overlaps(island: Disc, origin: Vec3i, radius: number): boolean {
  const d = Math.hypot(island.origin.x - origin.x, island.origin.z - origin.z);
  return d < clearance(island.radius, radius);
}

/** 3D length of the bridge between two islands' edge anchors (both lie on the centre line, 0.75 × radius in). */
function bridgeLength(a: Disc, b: Disc): number {
  const d = Math.hypot(b.origin.x - a.origin.x, b.origin.z - a.origin.z);
  return Math.hypot(d - 0.75 * (a.radius + b.radius), b.origin.y - a.origin.y);
}

/** Half the width of the ground a bridge end needs under it: Ezra's 0.6-wide feet plus a little. */
const FOOT = 0.35;

/** True when every column under a foot centred on the edge anchor `from` → `to` is grass of `from`'s island. */
function endOnGrass(from: IslandPlacement, shape: IslandShape, to: IslandPlacement): boolean {
  const p = edgeAnchor(from, to);
  for (const dx of [-FOOT, FOOT]) {
    for (const dz of [-FOOT, FOOT]) {
      if (shape.surface(Math.floor(p.x + dx) - from.origin.x, Math.floor(p.z + dz) - from.origin.z) === null) return false;
    }
  }
  return true;
}

/** The grass top of an island (the generator's top layer does not depend on the depth). */
const topOf = (radius: number, seed: number): IslandShape => generateIsland({ radius, depth: 1, seed });

/**
 * Origins for the web district's minis, in config order, as a chain from the hub: each island one plank bridge
 * (CHAIN_BRIDGE, 6–9 blocks between edge anchors) past the previous one, CHAIN_HEIGHTS above the hub (so every
 * step is ≤ 2 blocks and chooseCrossing picks a bridge), advancing along CHAIN_DIR and alternately CHAIN_DEPTH
 * nearer to and further from the tour camera, so the chain zigzags to the right and never doubles back. Each origin is
 * the whole column nearest the ideal point that keeps the bridge in its window, moves forward and overlaps
 * nothing in `taken` or earlier in the chain; given the islands' `seeds` (chain order), both ends of its bridge
 * must also land on grass (a radius-4 rim can dip under the 0.75 × radius anchor). Deterministic.
 */
export function webChain(
  hub: IslandPlacement, radii: readonly number[], taken: readonly IslandPlacement[], seeds?: readonly number[],
): Vec3i[] {
  const placed: Disc[] = taken.map((t) => ({ origin: t.origin, radius: t.radius }));
  const out: Vec3i[] = [];
  let prev: IslandPlacement = hub;
  let prevTop: IslandShape | null = seeds ? topOf(hub.radius, hub.seed) : null;
  radii.forEach((radius, i) => {
    const top = seeds ? topOf(radius, seeds[i]) : null;
    const y = hub.origin.y + CHAIN_HEIGHTS[i % CHAIN_HEIGHTS.length];
    const depth = i % 2 === 0 ? -CHAIN_DEPTH : CHAIN_DEPTH;
    // aim at the nominal depth from where the previous island really is (whole columns drift a little)
    const prevDepth = (prev.origin.x - hub.origin.x) * CHAIN_FWD.x + (prev.origin.z - hub.origin.z) * CHAIN_FWD.z;
    const step = depth - prevDepth;
    const want = clearance(prev.radius, radius) + CHAIN_SLACK;
    const along = Math.sqrt(Math.max(0, want * want - step * step));
    const ideal = {
      x: prev.origin.x + CHAIN_DIR.x * along + CHAIN_FWD.x * step,
      z: prev.origin.z + CHAIN_DIR.z * along + CHAIN_FWD.z * step,
    };
    let best: Vec3i | null = null;
    let bestD = Infinity;
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        const origin = { x: Math.round(ideal.x) + dx, y, z: Math.round(ideal.z) + dz };
        const len = bridgeLength(prev, { origin, radius });
        if (len < CHAIN_BRIDGE.min || len > CHAIN_BRIDGE.max) continue;
        if ((origin.x - prev.origin.x) * CHAIN_DIR.x + (origin.z - prev.origin.z) * CHAIN_DIR.z <= 0) continue;
        if (placed.some((p) => overlaps(p, origin, radius))) continue;
        const next: IslandPlacement = { ...hub, id: `chain-${i}`, kind: "mini", origin, radius };
        if (prevTop && top && !(endOnGrass(prev, prevTop, next) && endOnGrass(next, top, prev))) continue;
        const d = (origin.x - ideal.x) ** 2 + (origin.z - ideal.z) ** 2;
        if (d < bestD) {
          best = origin;
          bestD = d;
        }
      }
    }
    if (!best) throw new Error(`webChain: no free column for chain island ${i}`);
    out.push(best);
    placed.push({ origin: best, radius });
    prev = { ...hub, id: `chain-${i}`, kind: "mini", origin: best, radius };
    prevTop = top;
  });
  return out;
}

export function buildLayout(projects: readonly WorldProject[]): WorldLayout {
  const islands: IslandPlacement[] = [];
  const hero = STAR_ANCHORS.hero;
  islands.push({ id: "hero", kind: "hero", district: "hero", origin: { ...hero.origin }, radius: hero.radius, depth: hero.depth, seed: hashString("hero") });

  for (const p of projects) {
    const anchor = p.tier === "star" ? (STAR_ANCHORS[p.id] as Anchor | undefined) : undefined;
    if (!anchor) continue;
    islands.push({ id: p.id, kind: "star", district: p.district, origin: { ...anchor.origin }, radius: anchor.radius, depth: anchor.depth, seed: hashString(p.id) });
  }

  // the Web & Apps plaza, then its minis chained from it in config order
  const placedIds = new Set(islands.map((i) => i.id));
  const webMinis = projects.filter((p) => p.district === "web" && !placedIds.has(p.id));
  let hub: IslandPlacement | null = null;
  if (projects.some((p) => p.district === "web")) {
    hub = { id: WEB_PLAZA_ID, kind: "hub", district: "web", origin: { ...DISTRICT_HUBS.web.origin }, radius: HUB_RADIUS, depth: HUB_DEPTH, seed: hashString(WEB_PLAZA_ID) };
    islands.push(hub);
    const origins = webChain(hub, webMinis.map(() => MINI_RADIUS), islands, webMinis.map((p) => hashString(p.id)));
    webMinis.forEach((p, i) => {
      islands.push({ id: p.id, kind: "mini", district: "web", origin: origins[i], radius: MINI_RADIUS, depth: MINI_DEPTH, seed: hashString(p.id) });
    });
  }

  // minis of the other districts: golden-angle satellites around their district hub (not on the tour)
  const slots: Record<District, number> = { game: 0, discord: 0, web: 0 };
  for (const p of projects) {
    if (islands.some((i) => i.id === p.id)) continue;
    const dh = DISTRICT_HUBS[p.district];
    let origin = satelliteOrigin(dh.origin, dh.radius, slots[p.district]++);
    for (let guard = 0; guard < 64 && islands.some((i) => overlaps(i, origin, MINI_RADIUS)); guard++) {
      origin = satelliteOrigin(dh.origin, dh.radius, slots[p.district]++);
    }
    islands.push({ id: p.id, kind: "mini", district: p.district, origin, radius: MINI_RADIUS, depth: MINI_DEPTH, seed: hashString(p.id) });
  }

  const byId = new Map(islands.map((i) => [i.id, i]));
  const tourOrder = [
    ...STAR_TOUR.filter((id) => byId.has(id)),
    ...(hub ? [hub.id, ...webMinis.map((p) => p.id)] : []),
  ];
  const crossings: Crossing[] = [];
  for (let i = 0; i + 1 < tourOrder.length; i++) {
    const a = byId.get(tourOrder[i])!;
    const b = byId.get(tourOrder[i + 1])!;
    crossings.push({ kind: chooseCrossing(a, b), from: a.id, to: b.id, a: edgeAnchor(a, b), b: edgeAnchor(b, a) });
  }
  return { islands, crossings, tourOrder };
}
