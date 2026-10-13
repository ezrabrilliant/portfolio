import { describe, expect, it } from "vitest";
import { worldProjects } from "@/config/portfolio";
import { buildLayout } from "@/world/engine/gen/layout";
import { createCharacter, stepCharacter, type CharacterInput } from "@/world/engine/physics/character";
import { buildWorld } from "@/world/engine/worldBuild";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import { axisFromKeys, cameraRelative } from "@/world/input/keyboard";
import { stampCrossings } from "./crossings/stamp";
import { tourStopFor } from "./islands/framing";
import { FOOTPRINTS } from "./islands/layouts";
import { stampCells } from "./islands/shared/local";
import { dropStart, holdDropInput, landingColumn } from "./modes";

describe("holdDropInput", () => {
  it("ignores movement and jump while Ezra drops into Play, in place (no allocation)", () => {
    const input: CharacterInput = { moveX: 0.6, moveZ: -0.8, run: true, jump: true };
    expect(holdDropInput(input, true)).toBe(input);
    expect(input).toEqual({ moveX: 0, moveZ: 0, run: true, jump: false });
  });

  it("passes input through once he has landed", () => {
    const input: CharacterInput = { moveX: 0.6, moveZ: -0.8, run: false, jump: true };
    expect(holdDropInput(input, false)).toBe(input);
    expect(input).toEqual({ moveX: 0.6, moveZ: -0.8, run: false, jump: true });
  });
});

// The real world's collision, as World.tsx builds it: island terrain, every island's prop footprint, crossings.
const layout = buildLayout(worldProjects);
const built = buildWorld(layout, [
  ...layout.islands.map((p) => (grid: VoxelGrid) => FOOTPRINTS[p.id] && stampCells(grid, p, FOOTPRINTS[p.id])),
  (grid: VoxelGrid) => stampCrossings(grid, layout),
]);
const isSolid = built.grid.isSolid;

describe("entering Play with the start key held (PlayerController's drop)", () => {
  const W = new Set(["KeyW"]);
  for (const id of layout.tourOrder) {
    it(`${id}: lands on the grass at landingColumn, then walks on`, () => {
      const p = layout.islands.find((i) => i.id === id)!;
      const stop = tourStopFor(p);
      const column = landingColumn(isSolid, p, stop.target, stop.camera);
      const s = createCharacter(dropStart(p, column));
      s.sinceGround = 1; // as enterPlay: past coyote time
      const camF = { x: stop.target.x - stop.camera.x, z: stop.target.z - stop.camera.z };
      const input: CharacterInput = { moveX: 0, moveZ: 0, run: false, jump: false };
      const frame = (dropping: boolean) => {
        const ax = axisFromKeys(W);
        const move = cameraRelative(ax.forward, ax.right, camF);
        input.moveX = move.x;
        input.moveZ = move.z;
        input.jump = false;
        stepCharacter(s, holdDropInput(input, dropping), 1 / 60, { isSolid, killY: -100 });
      };

      let dropping = true;
      for (let f = 0; f < 180 && dropping; f++) {
        frame(dropping);
        if (s.onGround) dropping = false;
      }
      expect(dropping, "landed").toBe(false);
      expect({ x: s.pos.x, z: s.pos.z }).toEqual(column);
      expect(s.pos.y).toBe(p.origin.y + 1);

      // landed: the held key now walks him on (on the hero island the title barrier stops him soon after)
      for (let f = 0; f < 10; f++) frame(false);
      expect(Math.hypot(s.pos.x - column.x, s.pos.z - column.z)).toBeGreaterThan(0.1);
    });
  }
});
