import type { Crossing, IslandPlacement, WorldLayout } from "@/world/engine/gen/layout";
import type { Vec3 } from "@/world/engine/types";
import type { BlockName } from "@/world/engine/voxel/blocks";
import { VIEW_F } from "@/world/scene/islands/types";

/** The crossing the year milestones stand along (spec §7.1): the tour's first bridge. */
export const MILESTONE_BRIDGE = { from: "hero", to: "gtid" } as const;
/** Blocks beside the bridge axis, on the side away from the stepping stones. */
export const MILESTONE_SIDE = 2.2;
/** Blocks from a bridge head onto its island. */
export const MILESTONE_INLAND = 1.2;
/** Blocks from the bridge axis to the centre of a middle milestone's own floating stone (3 × 3, a block clear of the deck). */
export const MID_STONE_SIDE = 4;
/** Pillar height above its ground; collision covers rows 0..1. */
export const PILLAR_H = 1.7;

/** Scroll weight of the tour's flight along the milestone bridge (the others weigh 1): "the camera slows slightly while passing". */
export const MILESTONE_LEG_TRAVEL = 1.3;

export interface MilestoneSpot { year: number; pos: Vec3; ry: number; ownStone: boolean }

/** Heading every plaque faces: back toward the tour camera (−VIEW_F). */
export const PLAQUE_RY = Math.atan2(-VIEW_F.x, -VIEW_F.z);

const centre = (x: number, y: number, z: number): Vec3 => ({ x: Math.floor(x) + 0.5, y, z: Math.floor(z) + 0.5 });

/**
 * Where each year's pillar stands (feet centre, on a block centre). The first year stands on `from` beside the bridge
 * head, the last on `to`, any between on their own floating stones beside the bridge, spread evenly along it; all on
 * the side away from the stepping stones (steppingStones offsets along +(−uz, ux)). `pos.y` is the walking surface the
 * pillar stands on: an own stone's top is the deck's walking height at that point.
 */
export function milestoneSpots(bridge: Crossing, from: IslandPlacement, to: IslandPlacement, years: readonly number[]): MilestoneSpot[] {
  const dx = bridge.b.x - bridge.a.x;
  const dz = bridge.b.z - bridge.a.z;
  const len = Math.hypot(dx, dz) || 1;
  const u = { x: dx / len, z: dz / len };
  const away = { x: u.z, z: -u.x }; // −(−uz, ux): opposite the stepping stones
  const n = years.length;
  return years.map((year, i) => {
    if (i === 0) {
      const pos = centre(bridge.a.x - u.x * MILESTONE_INLAND + away.x * MILESTONE_SIDE, from.origin.y + 1, bridge.a.z - u.z * MILESTONE_INLAND + away.z * MILESTONE_SIDE);
      return { year, pos, ry: PLAQUE_RY, ownStone: false };
    }
    if (i === n - 1) {
      const pos = centre(bridge.b.x + u.x * MILESTONE_INLAND + away.x * MILESTONE_SIDE, to.origin.y + 1, bridge.b.z + u.z * MILESTONE_INLAND + away.z * MILESTONE_SIDE);
      return { year, pos, ry: PLAQUE_RY, ownStone: false };
    }
    const t = i / (n - 1);
    const y = Math.round(bridge.a.y + (bridge.b.y - bridge.a.y) * t);
    const pos = centre(bridge.a.x + dx * t + away.x * MID_STONE_SIDE, y, bridge.a.z + dz * t + away.z * MID_STONE_SIDE);
    return { year, pos, ry: PLAQUE_RY, ownStone: true };
  });
}

/** The milestone spots for this layout ([] when it has no hero → GTID bridge). */
export function milestoneSpotsFor(layout: WorldLayout, years: readonly number[]): MilestoneSpot[] {
  const bridge = layout.crossings.find((c) => c.from === MILESTONE_BRIDGE.from && c.to === MILESTONE_BRIDGE.to && c.kind === "bridge");
  const from = layout.islands.find((i) => i.id === MILESTONE_BRIDGE.from);
  const to = layout.islands.find((i) => i.id === MILESTONE_BRIDGE.to);
  return bridge && from && to ? milestoneSpots(bridge, from, to, years) : [];
}

/** buildTourPath's per-leg travel weights for this layout: MILESTONE_LEG_TRAVEL on the milestone bridge's leg, 1 elsewhere. */
export function tourTravelWeights(layout: WorldLayout): number[] {
  return layout.tourOrder.slice(1).map((to, i) => (layout.tourOrder[i] === MILESTONE_BRIDGE.from && to === MILESTONE_BRIDGE.to ? MILESTONE_LEG_TRAVEL : 1));
}

export interface WorldCell { x: number; y: number; z: number; block: BlockName }

/**
 * World cells a milestone occupies: an own stone's 3 × 3 slab one row under its top plus a keel block under its middle
 * (real stone, meshed with the nearest island's terrain), then the pillar's two barrier rows.
 */
export function milestoneCells(spot: MilestoneSpot): WorldCell[] {
  const x = Math.floor(spot.pos.x);
  const z = Math.floor(spot.pos.z);
  const y = Math.round(spot.pos.y);
  const out: WorldCell[] = [];
  if (spot.ownStone) {
    for (let ix = -1; ix <= 1; ix++) for (let iz = -1; iz <= 1; iz++) out.push({ x: x + ix, y: y - 1, z: z + iz, block: "stone" });
    out.push({ x, y: y - 2, z, block: "stone" });
  }
  out.push({ x, y, z, block: "barrier" }, { x, y: y + 1, z, block: "barrier" });
  return out;
}
