import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { CAP_GEOMETRY, CAP_ON_HEAD_Y, GRAD_COLORS, REGALIA_GEOMETRY } from "./graduation";

/** Every vertex colour of a baked geometry, as hex strings. */
const colours = (g: THREE.BufferGeometry) => {
  const c = g.getAttribute("color");
  const out = new Set<string>();
  const tmp = new THREE.Color();
  for (let i = 0; i < c.count; i++) out.add(`#${tmp.setRGB(c.getX(i), c.getY(i), c.getZ(i)).getHexString()}`);
  return out;
};

describe("graduation outfit", () => {
  it("uses Ezra's chosen colours: royal-blue cap and ribbon, black cord, orange collar, bronze medal", () => {
    expect(GRAD_COLORS).toEqual({ cap: "#1f4fc4", cord: "#1b1e24", collar: "#f26a1b", collarEdge: "#1b1e24", medal: "#a8907e", ribbon: "#1f4fc4" });
    expect(colours(CAP_GEOMETRY)).toEqual(new Set([GRAD_COLORS.cap, GRAD_COLORS.cord]));
    expect(colours(REGALIA_GEOMETRY)).toEqual(new Set([GRAD_COLORS.collar, GRAD_COLORS.collarEdge, GRAD_COLORS.medal, GRAD_COLORS.ribbon]));
  });

  it("sits the cap over his hair (top ~0.65 above the head pivot) with the board level above it", () => {
    CAP_GEOMETRY.computeBoundingBox();
    const box = CAP_GEOMETRY.boundingBox!;
    expect(CAP_ON_HEAD_Y + 0.18).toBeGreaterThan(0.65); // the skull cap's top clears the hair
    expect(CAP_ON_HEAD_Y + box.max.y).toBeLessThan(0.8);
    expect(box.max.x - box.min.x).toBeGreaterThan(0.75); // the square board, wider than his head (0.5)
  });

  it("hangs the tassel on his right (model −x), beside the face", () => {
    const pos = CAP_GEOMETRY.getAttribute("position");
    let lowest = { x: 0, y: Infinity };
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) < lowest.y) lowest = { x: pos.getX(i), y: pos.getY(i) };
    expect(lowest.x).toBeLessThan(-0.3);
    expect(CAP_ON_HEAD_Y + lowest.y).toBeLessThan(0.35); // down to about eye level (eyes at ~0.19–0.24)
  });

  it("puts the medal in front of the collar, at chest height", () => {
    REGALIA_GEOMETRY.computeBoundingBox();
    const box = REGALIA_GEOMETRY.boundingBox!;
    expect(box.max.z).toBeCloseTo(0.211, 2); // the medal's face, in front of the collar band (0.182)
    expect(box.min.y).toBeGreaterThan(0.95);
    expect(box.max.y).toBeLessThan(1.4);
  });
});
