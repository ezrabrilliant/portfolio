import { describe, expect, it } from "vitest";
import type * as THREE from "three";
import { EZRA_HEAD, EZRA_REACH } from "@/world/engine/physics/ezraModel";
import { CAP_GEOMETRY, CAP_ON_HEAD_Y } from "../graduation";
import { EZRA_GEOMETRY } from "./geometry";

/** The highest vertex of a baked geometry, above its pivot. */
const topOf = (g: THREE.BufferGeometry) => {
  const pos = g.getAttribute("position");
  let top = -Infinity;
  for (let i = 0; i < pos.count; i++) top = Math.max(top, pos.getY(i));
  return top;
};

// the clearance rules (scene/islands/layouts) read EZRA_REACH: it must be where the meshes really end
describe("Ezra's reach (engine/physics/ezraModel.ts) is where his meshes end", () => {
  it("the head's hair tops out at hairTop", () => {
    expect(topOf(EZRA_GEOMETRY.head)).toBeCloseTo(EZRA_REACH.hairTop - EZRA_HEAD.pivot, 6); // float32 vertices
  });

  it("the mortarboard, worn on the head, tops out at capTop", () => {
    expect(EZRA_HEAD.pivot + CAP_ON_HEAD_Y + topOf(CAP_GEOMETRY)).toBeCloseTo(EZRA_REACH.capTop, 6);
  });
});
