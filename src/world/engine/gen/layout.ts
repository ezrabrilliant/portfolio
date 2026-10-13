import type { District, WorldProject } from "@/config/schema";
import { hashString } from "@/world/engine/gen/rng";
import type { Vec3, Vec3i } from "@/world/engine/types";

export type IslandKind = "hero" | "star" | "mini";
export interface IslandPlacement {
  id: string; kind: IslandKind; district: District | "hero";
  origin: Vec3i; radius: number; depth: number; seed: number;
}
export type CrossingKind = "bridge" | "bouncePads" | "minecart";
export interface Crossing { kind: CrossingKind; from: string; to: string; a: Vec3; b: Vec3 }
export interface WorldLayout { islands: IslandPlacement[]; crossings: Crossing[]; tourOrder: string[] }

type Anchor = { origin: Vec3i; radius: number; depth: number };

export const STAR_ANCHORS: Record<string, Anchor> = {
  hero: { origin: { x: 0, y: 0, z: 0 }, radius: 6, depth: 6 },
  gtid: { origin: { x: 22, y: 2, z: -8 }, radius: 9, depth: 7 },
  "petak-umpet": { origin: { x: 44, y: 3, z: -2 }, radius: 9, depth: 7 },
  "orbit-store": { origin: { x: 64, y: 10, z: -18 }, radius: 8, depth: 6 },
  "ezra-bot": { origin: { x: 84, y: 14, z: -12 }, radius: 8, depth: 6 },
};

export const TOUR_ORDER: readonly string[] = ["hero", "gtid", "petak-umpet", "orbit-store", "ezra-bot"];

export const DISTRICT_HUBS: Record<District, { origin: Vec3i; radius: number }> = {
  game: { origin: STAR_ANCHORS.gtid.origin, radius: STAR_ANCHORS.gtid.radius },
  discord: { origin: STAR_ANCHORS["orbit-store"].origin, radius: STAR_ANCHORS["orbit-store"].radius },
  web: { origin: { x: 66, y: 4, z: 22 }, radius: 6 },
};

export const MINI_RADIUS = 4;
export const MINI_DEPTH = 4;
const GOLDEN_ANGLE = 2.39996;

export function chooseCrossing(from: IslandPlacement, to: IslandPlacement): CrossingKind {
  if (from.district !== "hero" && to.district !== "hero" && from.district !== to.district) return "minecart";
  return Math.abs(to.origin.y - from.origin.y) > 2 ? "bouncePads" : "bridge";
}

/** Point on `from`'s rim toward `to`, at 0.75 × radius (always on grass: the rim never dips below 0.8 × radius). */
export function edgeAnchor(from: IslandPlacement, to: IslandPlacement): Vec3 {
  const dx = to.origin.x - from.origin.x;
  const dz = to.origin.z - from.origin.z;
  const len = Math.hypot(dx, dz) || 1;
  const reach = from.radius * 0.75;
  return { x: from.origin.x + (dx / len) * reach, y: from.origin.y + 1, z: from.origin.z + (dz / len) * reach };
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

function overlaps(island: IslandPlacement, origin: Vec3i, radius: number): boolean {
  const d = Math.hypot(island.origin.x - origin.x, island.origin.z - origin.z);
  return d < (island.radius + radius) * 1.25 + 3;
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

  const slots: Record<District, number> = { game: 0, discord: 0, web: 0 };
  for (const p of projects) {
    if (islands.some((i) => i.id === p.id)) continue;
    const hub = DISTRICT_HUBS[p.district];
    let origin = satelliteOrigin(hub.origin, hub.radius, slots[p.district]++);
    for (let guard = 0; guard < 64 && islands.some((i) => overlaps(i, origin, MINI_RADIUS)); guard++) {
      origin = satelliteOrigin(hub.origin, hub.radius, slots[p.district]++);
    }
    islands.push({ id: p.id, kind: "mini", district: p.district, origin, radius: MINI_RADIUS, depth: MINI_DEPTH, seed: hashString(p.id) });
  }

  const byId = new Map(islands.map((i) => [i.id, i]));
  const tourOrder = TOUR_ORDER.filter((id) => byId.has(id));
  const crossings: Crossing[] = [];
  for (let i = 0; i + 1 < tourOrder.length; i++) {
    const a = byId.get(tourOrder[i])!;
    const b = byId.get(tourOrder[i + 1])!;
    crossings.push({ kind: chooseCrossing(a, b), from: a.id, to: b.id, a: edgeAnchor(a, b), b: edgeAnchor(b, a) });
  }
  return { islands, crossings, tourOrder };
}
