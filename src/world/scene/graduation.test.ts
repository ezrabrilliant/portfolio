import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { LEG, poseFor } from "./ezra/anim";
import {
  CAP_GEOMETRY,
  CAP_ON_HEAD_Y,
  EZRA_FIT,
  GOWN_GEOMETRY,
  GRAD_COLORS,
  SKIRT_GEOMETRY,
  SLEEVE_GEOMETRY,
} from "./graduation";

const hex = (c: THREE.Color) => `#${c.getHexString()}`;

/** Every vertex colour of a baked geometry, as hex strings. */
const colours = (g: THREE.BufferGeometry) => {
  const c = g.getAttribute("color");
  const out = new Set<string>();
  const tmp = new THREE.Color();
  for (let i = 0; i < c.count; i++) out.add(hex(tmp.setRGB(c.getX(i), c.getY(i), c.getZ(i))));
  return out;
};

/** Bounding box of a baked geometry's vertices, or only of those painted `colour` (and passing `keep`). */
const boxOf = (g: THREE.BufferGeometry, colour?: string, keep?: (v: THREE.Vector3) => boolean) => {
  const pos = g.getAttribute("position");
  const col = g.getAttribute("color");
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    if (colour && hex(c.setRGB(col.getX(i), col.getY(i), col.getZ(i))) !== colour) continue;
    v.fromBufferAttribute(pos, i);
    if (keep && !keep(v)) continue;
    box.expandByPoint(v);
  }
  return box;
};

const K = GRAD_COLORS;
/** The gown body's own extent (the only royal blue in the gown geometry: the ribbon is a deeper blue). */
const gownBody = () => boxOf(GOWN_GEOMETRY, K.gown);
const SIDES = [
  { side: "left", s: 1 },
  { side: "right", s: -1 },
] as const;

describe("graduation outfit", () => {
  it("uses Ezra's chosen colours: royal-blue cap and gown, black cord and trim, orange hood band, bronze medal", () => {
    expect(GRAD_COLORS).toEqual({
      cap: "#1f4fc4",
      gown: "#1f4fc4",
      cord: "#1b1e24",
      collar: "#f26a1b",
      collarEdge: "#1b1e24",
      cuff: "#1b1e24",
      facing: "#1b1e24",
      medal: "#a8907e",
      ribbon: "#173b93",
    });
    expect(colours(CAP_GEOMETRY)).toEqual(new Set([K.cap, K.cord]));
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
});

describe("graduation gown", () => {
  it("is the royal blue of the cap, with the orange hood band, black edging and facing, and the bronze medal", () => {
    expect(K.gown).toBe(K.cap);
    expect(K.ribbon).not.toBe(K.gown); // a ribbon in the gown's own blue would vanish on it
    expect(colours(GOWN_GEOMETRY)).toEqual(new Set([K.gown, K.collar, K.collarEdge, K.facing, K.medal, K.ribbon]));
    for (const { side } of SIDES) {
      expect(colours(SLEEVE_GEOMETRY[side])).toEqual(new Set([K.gown, K.cuff]));
      expect(colours(SKIRT_GEOMETRY[side])).toEqual(new Set([K.gown, K.facing]));
    }
  });

  it("wraps his tee and hips, and no more than a few centimetres wider than his body", () => {
    const { torso, hips } = EZRA_FIT;
    const gown = gownBody();
    expect(gown.max.x).toBeGreaterThan(torso.halfW);
    expect(gown.min.x).toBeLessThan(-torso.halfW);
    expect(gown.max.z).toBeGreaterThan(torso.halfD);
    expect(gown.min.z).toBeLessThan(-torso.halfD);
    expect(gown.max.y).toBeGreaterThan(torso.top);
    expect(gown.min.y).toBeLessThan(hips.bottom);
    expect(gown.max.x - gown.min.x).toBeLessThan(2 * torso.halfW + 0.08);
    expect(gown.max.z - gown.min.z).toBeLessThan(2 * torso.halfD + 0.08);
  });

  it("wears the medal over the hood band, and the band over the gown, at chest height", () => {
    const { torso } = EZRA_FIT;
    const gown = gownBody();
    const band = boxOf(GOWN_GEOMETRY, K.collar);
    const medal = boxOf(GOWN_GEOMETRY, K.medal);
    expect(band.max.z).toBeGreaterThan(gown.max.z);
    expect(medal.max.z).toBeGreaterThan(band.max.z);
    expect(medal.min.y).toBeGreaterThan(torso.bottom);
    expect(medal.max.y).toBeLessThan(torso.top);
    expect(Math.abs(medal.max.x + medal.min.x)).toBeLessThan(1e-6); // centred
    // the band crosses the shoulders and runs down the back too (the hood)
    expect(band.min.z).toBeLessThan(gown.min.z);
  });

  it("runs a thin black facing down the middle of the front, from the hood's V to the skirt", () => {
    const gown = gownBody();
    const band = boxOf(GOWN_GEOMETRY, K.collar);
    const facing = boxOf(GOWN_GEOMETRY, K.facing, (v) => Math.abs(v.x) < 0.016 && v.z > gown.max.z);
    expect(facing.isEmpty()).toBe(false);
    expect(facing.min.y).toBeLessThan(gown.min.y + 0.05); // to the gown body's hem, where the skirt's facing takes over
    expect(facing.max.y).toBeGreaterThan(band.min.y - 0.08); // up to the V's black edging, just under its orange point
    expect(facing.max.y).toBeLessThan(band.min.y + 0.05); // not over the medal
  });

  it("drops the skirt from under the gown body to mid-shin: below the hips, above the shoes", () => {
    const kneeY = LEG.hipY - LEG.knee;
    const soleY = kneeY - LEG.shin;
    const gown = gownBody();
    for (const { side } of SIDES) {
      const skirt = boxOf(SKIRT_GEOMETRY[side]);
      const hem = LEG.hipY + skirt.min.y;
      expect(hem).toBeLessThan(EZRA_FIT.hips.bottom);
      expect(hem).toBeLessThan(kneeY);
      expect(hem).toBeGreaterThan(soleY + EZRA_FIT.shoe); // the shoes and a little of the shins show
      expect(Math.abs(hem - (kneeY + soleY) / 2)).toBeLessThan(0.06);
      expect(LEG.hipY + skirt.max.y).toBeGreaterThan(gown.min.y + 0.05); // tucked up under the gown body: no gap
    }
  });

  it("rides on each leg, from the gown's centre line to its side, so no walk or run swing pushes a leg through it", () => {
    const { thigh } = EZRA_FIT;
    const gown = gownBody();
    for (const { side, s } of SIDES) {
      const skirt = boxOf(SKIRT_GEOMETRY[side]);
      // in the leg's own space, around the thigh (and the shin below it, which shares its axis while walking)
      expect(skirt.min.x).toBeLessThan(-thigh.half);
      expect(skirt.max.x).toBeGreaterThan(thigh.half);
      expect(skirt.min.z).toBeLessThan(-thigh.half);
      expect(skirt.max.z).toBeGreaterThan(thigh.half);
      expect(skirt.max.y).toBeGreaterThan(thigh.top);
      // the two halves meet on the centre line and end flush with the gown body's sides
      const inner = s * LEG.hipX + (s > 0 ? skirt.min.x : skirt.max.x);
      const outer = s * LEG.hipX + (s > 0 ? skirt.max.x : skirt.min.x);
      expect(Math.abs(inner)).toBeLessThan(0.005);
      expect(Math.abs(outer - (s > 0 ? gown.max.x : gown.min.x))).toBeLessThan(0.02);
      expect(skirt.max.z).toBeLessThan(gown.max.z + 0.02);
    }
    // walk and run never bend the knee, so the shin stays on the thigh's axis inside the skirt
    for (const anim of ["walk", "run"] as const)
      for (let phase = 0; phase < 2 * Math.PI; phase += 0.3) {
        const pose = poseFor(anim, 0, phase, { standUp: 0, reduced: false });
        expect([pose.kneeL, pose.kneeR]).toEqual([0, 0]);
      }
  });

  it("gives each arm a wide sleeve down to the wrist, ending in a broad black cuff, with the hand showing", () => {
    const { arm } = EZRA_FIT;
    for (const { side, s } of SIDES) {
      const g = SLEEVE_GEOMETRY[side];
      const sleeve = boxOf(g);
      const cuff = boxOf(g, K.cuff);
      const blue = boxOf(g, K.gown);
      expect(cuff.min.y).toBeCloseTo(sleeve.min.y, 6); // it ends in black
      expect(blue.min.y).toBeGreaterThan(cuff.min.y);
      expect(cuff.max.y - cuff.min.y).toBeGreaterThan(0.06); // a broad band, not a line
      const hand = arm.hand + sleeve.min.y; // skin below the cuff
      expect(hand).toBeGreaterThan(0.08);
      expect(hand).toBeLessThan(0.15);
      // over the tee's sleeve, from the shoulder pivot's top down
      expect(sleeve.max.y).toBeGreaterThan(arm.top);
      expect(sleeve.min.x).toBeLessThan(-arm.halfW);
      expect(sleeve.max.x).toBeGreaterThan(arm.halfW);
      expect(sleeve.min.z).toBeLessThan(-arm.halfD);
      expect(sleeve.max.z).toBeGreaterThan(arm.halfD);
      // wider than the arm, but not a balloon, and it never reaches into his chest
      const sx = s * EZRA_FIT.shoulder.x;
      const outer = s > 0 ? sx + sleeve.max.x : -(sx + sleeve.min.x);
      const inner = s > 0 ? sx + sleeve.min.x : -(sx + sleeve.max.x);
      expect(outer).toBeLessThan(EZRA_FIT.shoulder.x + arm.halfW + 0.09);
      expect(inner).toBeGreaterThan(EZRA_FIT.torso.halfW - 0.01);
      expect(sleeve.max.z - sleeve.min.z).toBeLessThan(2 * arm.halfD + 0.1);
    }
  });
});
