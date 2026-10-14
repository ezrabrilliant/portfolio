import { createFollowCam, updateFollowCam } from "@/world/engine/camera/followCam";
import type { TourStop } from "@/world/engine/camera/tourPath";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { CharacterInput } from "@/world/engine/physics/character";
import type { IsSolid, Vec3 } from "@/world/engine/types";
import { pullIn } from "./camera/pullIn";

export type EnterKind = "standUp" | "drop";

export function enterKind(activeIsland: string, seated: boolean): EnterKind {
  return seated && activeIsland === "hero" ? "standUp" : "drop";
}

/** Feet height of the drop start above the island's grass row. */
const DROP = 16;

/** Ezra falls from 15 blocks above the island's surface: over its centre column, or over `column` (see landingColumn). */
export function dropStart(p: IslandPlacement, column?: { x: number; z: number }): Vec3 {
  return { x: column?.x ?? p.origin.x + 0.5, y: p.origin.y + DROP, z: column?.z ?? p.origin.z + 0.5 };
}

/**
 * Where a drop onto island `p` lands: the centre of the cell nearest `aim` with grass floor under it and its four
 * neighbours (no rim landings) and nothing solid from the floor up past the drop start, so Ezra falls past no prop
 * and stands on open ground. Given the camera's `eye`, it prefers, in order: cells the eye can see Ezra standing on
 * (no solid block between the eye and his chest) where the follow camera starting toward the eye also has a clear line
 * to him (followLineClear), so he never lands hidden behind a house nor with a board between him and the Play camera;
 * then cells the eye can see; then, when the eye sees no free cell (a camera still far away or mid-flight), cells with
 * that clear line; then any cell. Falls back to the centre column if no cell qualifies.
 */
export function landingColumn(isSolid: IsSolid, p: IslandPlacement, aim: { x: number; z: number }, eye?: Vec3): { x: number; z: number } {
  const { x: ox, y: floor, z: oz } = p.origin;
  const reach = Math.ceil(p.radius * 1.25) + 1; // the island generator's extent
  const pick = (seen: Vec3 | undefined, follow: Vec3 | undefined) => {
    let best: { x: number; z: number } | null = null;
    let bestD = Infinity;
    for (let x = ox - reach; x <= ox + reach; x++) {
      for (let z = oz - reach; z <= oz + reach; z++) {
        const d = (x + 0.5 - aim.x) ** 2 + (z + 0.5 - aim.z) ** 2;
        if (d >= bestD) continue;
        if (!isSolid(x, floor, z) || !isSolid(x + 1, floor, z) || !isSolid(x - 1, floor, z) || !isSolid(x, floor, z + 1) || !isSolid(x, floor, z - 1)) continue;
        let clear = true;
        for (let y = floor + 1; clear && y <= floor + DROP + 2; y++) clear = !isSolid(x, y, z);
        if (!clear) continue;
        if (seen && !sees(isSolid, seen, x + 0.5, floor + 1 + CHEST, z + 0.5)) continue;
        if (follow && !followLineClear(isSolid, { x: x + 0.5, y: floor + 1, z: z + 0.5 }, follow)) continue;
        best = { x: x + 0.5, z: z + 0.5 };
        bestD = d;
      }
    }
    return best;
  };
  const tiered = eye && (pick(eye, eye) || pick(eye, undefined) || pick(undefined, eye));
  return tiered || pick(undefined, undefined) || { x: ox + 0.5, z: oz + 0.5 };
}

/** The follow camera as Play starts (PlayCamera's createFollowCam): its default pitch and distance. */
const ENTRY_CAM = createFollowCam();
const NO_ORBIT = { orbitX: 0, orbitY: 0, zoom: 0 };
/**
 * Yaw and pitch offsets (radians) the line must also be clear at: the tour camera sits a hair off its stop from one
 * page load to the next (scroll rounding), and a line that only grazes a board then flips between clear and blocked.
 * Once pullIn has pulled the camera in front of a board, it stays there.
 */
const LINE_MARGIN = [
  [0, 0],
  [0.05, 0],
  [-0.05, 0],
  [0, 0.05],
  [0, -0.05],
] as const;

/**
 * True when the follow camera at its entry pitch and distance, on the side of `eye`, has a clear line to Ezra standing
 * at `feet`, with a margin (LINE_MARGIN): no solid block between his head and the camera, so pullIn leaves the camera
 * where it belongs instead of clamping it into the back of his head (an info board 1.5 out did that to a drop at 1.24).
 * Play starts with the camera toward the tour camera (PlayCamera's entry yaw), and a fast travel cuts it behind Ezra,
 * who faces away from that camera: both are the `eye` side.
 */
export function followLineClear(isSolid: IsSolid, feet: Vec3, eye: { x: number; z: number }): boolean {
  const yaw = Math.atan2(eye.x - feet.x, eye.z - feet.z);
  return LINE_MARGIN.every(([dYaw, dPitch]) => {
    const cam = { ...ENTRY_CAM, yaw: yaw + dYaw, pitch: ENTRY_CAM.pitch + dPitch };
    const { position, lookAt } = updateFollowCam(cam, feet, 0, false, 0, NO_ORBIT);
    const at = pullIn(lookAt, position, isSolid);
    return at.x === position.x && at.y === position.y && at.z === position.z;
  });
}

/** Chest height above the feet: what the camera must see for Ezra to read as standing there. */
const CHEST = 1;
/** Sight-line sample spacing, in blocks. */
const SIGHT_STEP = 0.3;

/** True when no solid block lies on the segment from `eye` to (x, y, z). */
function sees(isSolid: IsSolid, eye: Vec3, x: number, y: number, z: number): boolean {
  const dx = x - eye.x, dy = y - eye.y, dz = z - eye.z;
  const n = Math.ceil(Math.hypot(dx, dy, dz) / SIGHT_STEP);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (isSolid(eye.x + dx * t, eye.y + dy * t, eye.z + dz * t)) return false;
  }
  return true;
}

/**
 * Where a tour camera would watch `pos` from: the camera of the stop whose look target is nearest, moved by `pos`'s
 * offset from that target. Feed it to nearestTrackProgress to resume the tour framed on Ezra (his own position finds
 * the nearest camera, which is often a crossing camera of the next leg, since stop cameras sit ~30 blocks back).
 */
export function watchPoint(stops: readonly TourStop[], pos: Vec3): Vec3 {
  let s = stops[0];
  let bestD = Infinity;
  for (const stop of stops) {
    const d = (stop.target.x - pos.x) ** 2 + (stop.target.z - pos.z) ** 2;
    if (d < bestD) {
      bestD = d;
      s = stop;
    }
  }
  return { x: s.camera.x + pos.x - s.target.x, y: s.camera.y + pos.y - s.target.y, z: s.camera.z + pos.z - s.target.z };
}

/**
 * While Ezra drops into Play (runtime.dropping), movement and jump are ignored until he lands, like a bounce arc
 * (spec §7): the key that started Play is usually still held, and with air control it would carry him ~4 blocks
 * past the landing column onto a prop. Mutates and returns `input` (called every frame, so no allocation).
 */
export function holdDropInput(input: CharacterInput, dropping: boolean): CharacterInput {
  if (dropping) {
    input.moveX = 0;
    input.moveZ = 0;
    input.jump = false;
  }
  return input;
}

/**
 * Movement during the hero stand-up stretch ends the stretch: the controls answer the first push of the stick or W at
 * once (on a phone the press that enters Play is already a drag) instead of ignoring it for STAND_UP_SECONDS.
 */
export function cutsStandUp(standUp: number, move: { x: number; z: number }): boolean {
  return standUp > 0 && Math.hypot(move.x, move.z) > 0.05;
}

/**
 * The island Ezra stands on in Play: the one whose centre column is nearest (x, z), if (x, z) lies within its radius;
 * null between islands. PlayerController feeds it to setActiveIsland, so arrivals (Ezra Bot's reply, Orbit's receipt,
 * GTID's sparkles) fire by walking, not only from the tour. Called every grounded frame: no allocation.
 */
export function islandUnder(islands: readonly IslandPlacement[], x: number, z: number): IslandPlacement | null {
  let best: IslandPlacement | null = null;
  let bestD = Infinity;
  for (const p of islands) {
    const d = (x - p.origin.x - 0.5) ** 2 + (z - p.origin.z - 0.5) ** 2;
    if (d <= p.radius * p.radius && d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}
