import { describe, expect, it } from "vitest";
import { milestones, worldProjects } from "@/config/portfolio";
import { createFollowCam, updateFollowCam } from "@/world/engine/camera/followCam";
import { buildLayout } from "@/world/engine/gen/layout";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { createCharacter, stepCharacter } from "@/world/engine/physics/character";
import type { Vec3 } from "@/world/engine/types";
import { buildWorld } from "@/world/engine/worldBuild";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import { pullIn } from "./camera/pullIn";
import { stampCrossings } from "./crossings/stamp";
import { portraitStop, tourStopFor } from "./islands/framing";
import { FOOTPRINTS } from "./islands/layouts";
import { stampCells } from "./islands/shared/local";
import { stampMilestones } from "./milestones/stamp";
import { dropStart, followLineClear, landingColumn } from "./modes";
import { arrivalSpot } from "./travel";

// The real world's collision, as World.tsx builds it: terrain, every island's prop footprint, crossings, milestones.
const layout = buildLayout(worldProjects);
const built = buildWorld(layout, [
  ...layout.islands.map((p) => (grid: VoxelGrid) => FOOTPRINTS[p.id] && stampCells(grid, p, FOOTPRINTS[p.id])),
  (grid: VoxelGrid) => stampCrossings(grid, layout),
  (grid: VoxelGrid) => stampMilestones(grid, layout, milestones.map((m) => m.year)),
]);
const isSolid = built.grid.isSolid;
const hero = layout.islands.find((i) => i.id === "hero")!;
const heroStop = tourStopFor(hero);
const STILL = { orbitX: 0, orbitY: 0, zoom: 0 };
const DT = 1 / 30;

/**
 * Play's entry as PlayerController and PlayCamera run it: Ezra drops from dropStart onto the column, the follow camera
 * starts at the tour camera (`eye`) with its yaw toward it, eases toward its goal each frame and is pulled in front of
 * any block between it and his head. Returns how far the camera ends from his head (the follow distance is 7).
 */
function settledCameraDistance(p: IslandPlacement, aim: Vec3, eye: Vec3): number {
  const col = landingColumn(isSolid, p, aim, eye);
  const s = createCharacter(dropStart(p, col));
  s.sinceGround = 1;
  const cam = { ...createFollowCam(), yaw: Math.atan2(eye.x - s.pos.x, eye.z - s.pos.z) };
  const at = { ...eye };
  let head = s.pos;
  for (let f = 0; f < 150; f++) {
    stepCharacter(s, { moveX: 0, moveZ: 0, run: false, jump: false }, DT, { isSolid, killY: -100 });
    const { position, lookAt } = updateFollowCam(cam, s.pos, 0, false, DT, STILL);
    const k = 1 - Math.exp(-6 * DT);
    at.x += (position.x - at.x) * k;
    at.y += (position.y - at.y) * k;
    at.z += (position.z - at.z) * k;
    Object.assign(at, pullIn(lookAt, at, isSolid));
    head = lookAt;
  }
  return Math.hypot(at.x - head.x, at.y - head.y, at.z - head.z);
}

/** The tour camera is a hair off its stop from one page load to the next (scroll rounding): a few fixed offsets. */
const JITTER: Vec3[] = [
  { x: 0, y: 0, z: 0 },
  { x: 0.08, y: -0.05, z: 0.03 },
  { x: -0.06, y: 0.07, z: -0.09 },
  { x: 0.03, y: 0.09, z: 0.08 },
  { x: -0.09, y: -0.08, z: 0.05 },
  { x: 0.05, y: 0.02, z: -0.07 },
];

describe("where Play puts Ezra: the Play camera settles at its full distance (never trapped at his head)", () => {
  for (const id of layout.tourOrder) {
    const p = layout.islands.find((i) => i.id === id)!;
    const landscape = tourStopFor(p);
    for (const [view, stop] of [["desktop", landscape], ["phone", portraitStop(p, landscape)]] as const) {
      it(`${id} (${view}): drops from the tour stop and from a far camera, and a fast travel's arrival`, () => {
        for (const j of JITTER) {
          const eye = { x: stop.camera.x + j.x, y: stop.camera.y + j.y, z: stop.camera.z + j.z };
          expect(settledCameraDistance(p, stop.target, eye), `drop, eye offset ${JSON.stringify(j)}`).toBeCloseTo(7, 6);
        }
        // a tour camera far off (the hero's stop, where the page opens): Play's camera starts toward it although it
        // sees no cell of this island
        const far = id === "hero" ? stop.camera : (view === "desktop" ? heroStop : portraitStop(hero, heroStop)).camera;
        expect(settledCameraDistance(p, stop.target, far), "drop, camera far").toBeCloseTo(7, 6);
        // a fast travel cuts the camera straight to behind him (PlayCamera's teleport cut): its line must be clear
        const { pos } = arrivalSpot(isSolid, p, stop);
        expect(followLineClear(isSolid, pos, stop.camera), "travel").toBe(true);
      });
    }
  }
});
