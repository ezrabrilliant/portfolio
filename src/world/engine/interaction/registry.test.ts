import { describe, expect, it } from "vitest";
import { createRegistry, type Interactable } from "@/world/engine/interaction/registry";

function item(id: string, x: number, z: number, extra: Partial<Interactable> = {}): Interactable {
  return {
    id, island: "gtid", label: id, position: { x, y: 1, z },
    hitbox: { min: { x: x - 0.5, y: 0.5, z: z - 0.5 }, max: { x: x + 0.5, y: 1.5, z: z + 0.5 } },
    radius: 2.5, onActivate: () => {}, ...extra,
  };
}

describe("registry bookkeeping", () => {
  it("registers, looks up, filters by island and unregisters", () => {
    const r = createRegistry();
    const off = r.register(item("a", 0, 0));
    r.register(item("b", 5, 0, { island: "orbit-store" }));
    expect(r.all().map((i) => i.id).sort()).toEqual(["a", "b"]);
    expect(r.get("a")?.label).toBe("a");
    expect(r.onIsland("orbit-store").map((i) => i.id)).toEqual(["b"]);
    off();
    expect(r.get("a")).toBeUndefined();
  });

  it("a stale unregister does not remove a re-registered item", () => {
    const r = createRegistry();
    const off = r.register(item("a", 0, 0));
    r.register(item("a", 1, 0));
    off();
    expect(r.get("a")?.position.x).toBe(1);
  });
});

describe("nearest", () => {
  const facingX = { x: 1, y: 0, z: 0 };

  it("picks the closest enabled item in front and within reach", () => {
    const r = createRegistry();
    r.register(item("far", 2.2, 0));
    r.register(item("near", 1.2, 0.2));
    r.register(item("behind", -1, 0));
    r.register(item("off", 1, 0, { enabled: () => false }));
    r.register(item("out-of-reach", 4, 0));
    expect(r.nearest({ x: 0, y: 1, z: 0 }, facingX)?.id).toBe("near");
  });

  it("ignores items behind the player", () => {
    const r = createRegistry();
    r.register(item("behind", -1, 0));
    expect(r.nearest({ x: 0, y: 1, z: 0 }, facingX)).toBeNull();
  });

  it("accepts an item standing on the player regardless of facing", () => {
    const r = createRegistry();
    r.register(item("here", 0.1, 0.1));
    expect(r.nearest({ x: 0, y: 1, z: 0 }, { x: -1, y: 0, z: 0 })?.id).toBe("here");
  });
});

describe("raycast", () => {
  it("returns the first box the ray hits", () => {
    const r = createRegistry();
    r.register(item("front", 3, 0));
    r.register(item("back", 6, 0));
    expect(r.raycast({ x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 })?.id).toBe("front");
  });

  it("misses when pointing away or at disabled items", () => {
    const r = createRegistry();
    r.register(item("front", 3, 0));
    r.register(item("disabled", 0, 3, { enabled: () => false }));
    expect(r.raycast({ x: 0, y: 1, z: 0 }, { x: -1, y: 0, z: 0 })).toBeNull();
    expect(r.raycast({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 })).toBeNull();
  });

  it("handles rays parallel to an axis that start inside the slab", () => {
    const r = createRegistry();
    r.register(item("box", 0, 4));
    expect(r.raycast({ x: 0.2, y: 1, z: 0 }, { x: 0, y: 0, z: 1 })?.id).toBe("box");
  });
});
