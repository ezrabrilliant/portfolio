import { describe, expect, it } from "vitest";
import type { Interactable } from "@/world/engine/interaction/registry";
import { GLINT, glintPoint, glinting } from "./glints";

const item = (id: string, x: number, enabled = true): Interactable => ({
  id, island: "i", label: id, position: { x, y: 1.9, z: 0 }, hitbox: { min: { x: x - 1, y: 1, z: -0.5 }, max: { x: x + 1, y: 3, z: 0.5 } },
  radius: 2.5, onActivate: () => {}, enabled: () => enabled,
});

describe("glints", () => {
  it("picks the nearest usable things within reach, at most a few", () => {
    const items = [item("a", 1), item("b", 3), item("c", 4), item("d", 4.5), item("far", 20), item("off", 0.5, false)];
    const g = glinting(items, { x: 0, y: 1, z: 0 });
    expect(g.map((x) => x.item.id)).toEqual(["a", "b", "c"]);
    expect(g.length).toBe(GLINT.max);
  });

  it("sheds from the hitbox's top half", () => {
    const p = glintPoint(item("a", 0), [0.5, 0, 0.5]);
    expect(p).toEqual({ x: 0, y: 2, z: 0 });
  });
});
