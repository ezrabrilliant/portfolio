import { describe, expect, it } from "vitest";
import { blockId } from "@/world/engine/voxel/blocks";
import { VoxelGrid } from "@/world/engine/voxel/grid";
import { createBall, kickBall, stepBall } from "./ball";

const ground = () => {
  const g = new VoxelGrid();
  for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) g.set(x, 0, z, blockId("grass"));
  for (let y = 1; y <= 2; y++) for (let z = -6; z <= 6; z++) g.set(5, y, z, blockId("stone"));
  return g;
};

describe("the plaza ball", () => {
  const g = ground();
  const w = { isSolid: g.isSolid, killY: -20 };

  it("settles on the grass", () => {
    const b = createBall({ x: 0.5, y: 3, z: 0.5 });
    for (let i = 0; i < 240; i++) stepBall(b, w, 1 / 60);
    expect(b.pos.y).toBeGreaterThan(1);
    expect(b.pos.y).toBeLessThan(1.3);
    expect(b.onGround).toBe(true);
  });

  it("is kicked away when Ezra runs into it, and only then", () => {
    const b = createBall({ x: 0.5, y: 1.25, z: 0.5 });
    expect(kickBall(b, { x: 0.5, y: 1, z: 0 }, { x: 0, y: 0, z: 0 })).toBe(false);
    expect(kickBall(b, { x: 0.5, y: 1, z: 0.9 }, { x: 0, y: 0, z: 4 })).toBe(false); // moving away from it
    expect(kickBall(b, { x: 0.5, y: 1, z: 0.1 }, { x: 0, y: 0, z: 4 })).toBe(true);
    expect(b.vel.z).toBeGreaterThan(4);
    expect(b.vel.y).toBeGreaterThan(0);
  });

  it("bounces off a wall instead of passing through", () => {
    const b = createBall({ x: 3.5, y: 1.25, z: 0.5 });
    b.vel.x = 6;
    for (let i = 0; i < 120; i++) stepBall(b, w, 1 / 60);
    expect(b.pos.x).toBeLessThan(5 - 0.2);
  });

  it("reports a fall off the world", () => {
    const b = createBall({ x: 20, y: 1, z: 20 });
    let fell = null;
    for (let i = 0; i < 200 && !fell; i++) fell = stepBall(b, w, 1 / 60);
    expect(fell).toBe("fell");
  });
});

describe("the plaza ball in the built world", () => {
  it("rests at home on the plaza, clear of every prop", async () => {
    const { buildLayout } = await import("@/world/engine/gen/layout");
    const { worldProjects } = await import("@/config/portfolio");
    const { buildWorld } = await import("@/world/engine/worldBuild");
    const { ISLANDS } = await import("@/world/scene/islands");
    const { islandColliders } = await import("@/world/scene/islands/colliders");
    const { worldOf } = await import("@/world/scene/islands/shared/local");
    const layout = buildLayout(worldProjects);
    const built = buildWorld(layout, layout.islands.map((p) => (g: VoxelGrid) => ISLANDS[p.id]?.stamp?.(g, p)), layout.islands.flatMap((p) => islandColliders(p.id, p)));
    const plaza = layout.islands.find((i) => i.id === "web-plaza")!;
    const home = worldOf(plaza, 1.6, 0.25, 1.6);
    const b = createBall(home);
    for (let i = 0; i < 240; i++) stepBall(b, { isSolid: built.grid.isSolid, props: built.props, killY: -60 }, 1 / 60);
    expect(Math.hypot(b.pos.x - home.x, b.pos.z - home.z)).toBeLessThan(0.05);
    expect(b.pos.y).toBeCloseTo(home.y, 1);
  });
});
