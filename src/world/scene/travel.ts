import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { IsSolid, Vec3 } from "@/world/engine/types";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { closeCloseup } from "./closeupState";
import { islandTop } from "./islands/types";
import { islandUnder, landingColumn } from "./modes";
import { scrollToIsland } from "./tour/scrollToIsland";

/** Seconds from the departure puff to the move (the screen fades out over the last FADE of them). */
export const TRAVEL_OUT = 0.35;
/** Seconds from the arrival puff until the fast travel ends (the screen fades back in). */
export const TRAVEL_IN = 0.35;
/** The fade that hides the camera cut at the move. */
const FADE = 0.2;

/**
 * Fast travel from a map board (spec §8). Tour: the closeup closes and the page scrolls to the island's stop (the one
 * in view too: it re-centres there). Play: the closeup closes and runtime.travel starts; PlayerController puffs Ezra
 * away, moves him to a landing column on `to` and puffs him back (stepTravel). Ignored while a travel runs, for unknown
 * ids, and (Play) for the island he is on: "You are here" leaves the map open.
 */
export function startTravel(to: string): void {
  if (runtime.travel || !runtime.layout.islands.some((i) => i.id === to)) return;
  if (useWorld.getState().mode !== "play") {
    closeCloseup();
    scrollToIsland(to);
    return;
  }
  const p = runtime.player.pos;
  if (islandUnder(runtime.layout.islands, p.x, p.z)?.id === to) return;
  closeCloseup();
  runtime.travel = { to, phase: "out", t: 0 };
}

export type TravelEvent = "vanish" | "arrive" | "done" | null;

/**
 * Advances a fast travel by `dt` (mutates it). "vanish" on its first step (puff, hide Ezra), "arrive" when the out phase
 * ends (move him, puff, show him), "done" when the in phase ends (clear runtime.travel).
 */
export function stepTravel(tr: { phase: "out" | "in"; t: number }, dt: number): TravelEvent {
  if (tr.phase === "out") {
    if (tr.t === 0) {
      tr.t = Math.max(dt, 1e-6);
      return "vanish";
    }
    tr.t += dt;
    if (tr.t < TRAVEL_OUT) return null;
    tr.phase = "in";
    tr.t = 0;
    return "arrive";
  }
  tr.t += dt;
  return tr.t >= TRAVEL_IN ? "done" : null;
}

/** Opacity of the screen fade during a fast travel: up over the out phase's last FADE seconds, down over the in phase. */
export function travelFade(tr: { phase: "out" | "in"; t: number }): number {
  if (tr.phase === "out") return Math.min(1, Math.max(0, (tr.t - (TRAVEL_OUT - FADE)) / FADE));
  return Math.max(0, 1 - tr.t / TRAVEL_IN);
}

/**
 * Where a fast travel lands on `island`: the landing column (modes.landingColumn: open ground, no prop overhead) nearest
 * its tour stop's look target that the stop's camera can see, feet on the walking surface, facing away from that
 * camera (as Play's drop does). Without a stop: nearest the island's centre, facing +z.
 */
export function arrivalSpot(isSolid: IsSolid, island: IslandPlacement, stop?: { camera: Vec3; target: Vec3 }): { pos: Vec3; heading: number } {
  const col = landingColumn(isSolid, island, stop?.target ?? islandTop(island), stop?.camera);
  const pos = { x: col.x, y: island.origin.y + 1, z: col.z };
  return { pos, heading: stop ? Math.atan2(pos.x - stop.camera.x, pos.z - stop.camera.z) : 0 };
}
