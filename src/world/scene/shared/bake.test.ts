import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { bakeBoxes, mergeBaked, paint, roundedBox } from "./bake";

const YELLOW = "#e3b23c";
const DARK = "#2b2420";

/** The colour attribute of vertex i, as a hex string. */
const colourAt = (g: THREE.BufferGeometry, i: number) => {
  const c = g.getAttribute("color");
  return `#${new THREE.Color().setRGB(c.getX(i), c.getY(i), c.getZ(i)).getHexString()}`;
};

/** Calls `fn`, returning the geometries it disposed (by spying on BufferGeometry.dispose). */
const disposedBy = (fn: () => void) => {
  const spy = vi.spyOn(THREE.BufferGeometry.prototype, "dispose");
  try {
    fn();
  } catch {
    // the caller checks the throw separately; here only the disposals count
  }
  const disposed = spy.mock.contexts as THREE.BufferGeometry[];
  spy.mockRestore();
  return disposed;
};

afterEach(() => vi.restoreAllMocks());

describe("paint", () => {
  it("gives every vertex the colour, as a 3-wide colour attribute, and returns the geometry", () => {
    const box = new THREE.BoxGeometry(1, 2, 3);
    expect(paint(box, YELLOW)).toBe(box);
    const colour = box.getAttribute("color");
    expect(colour.itemSize).toBe(3);
    expect(colour.count).toBe(box.getAttribute("position").count);
    for (let i = 0; i < colour.count; i++) expect(colourAt(box, i)).toBe(YELLOW);
  });
});

describe("bakeBoxes", () => {
  // two boxes either side of x = 0, so each vertex's side says which box (and colour) it came from
  const boxes = [
    [0.4, 0.4, 0.4, -1, 0, 0, YELLOW],
    [0.4, 0.4, 0.4, 1, 0, 0, DARK],
  ] as const;

  it("paints every vertex its own box's colour", () => {
    for (const g of [bakeBoxes(boxes, "two sharp boxes"), bakeBoxes(boxes, "two rounded boxes", { radius: 0.05 })]) {
      const pos = g.getAttribute("position");
      expect(g.getAttribute("color").count).toBe(pos.count);
      for (let i = 0; i < pos.count; i++) expect(colourAt(g, i)).toBe(pos.getX(i) < 0 ? YELLOW : DARK);
    }
  });

  it("bakes plain indexed boxes unless a radius is given, then rounded non-indexed ones", () => {
    const sharp = bakeBoxes(boxes, "two sharp boxes");
    expect(sharp.index?.count).toBe(2 * 36);
    expect(sharp.getAttribute("position").count).toBe(2 * 24);
    const rounded = bakeBoxes(boxes, "two rounded boxes", { radius: 0.05 });
    expect(rounded.index).toBeNull();
    expect(rounded.getAttribute("position").count).toBe(2 * roundedBox(0.4, 0.4, 0.4, 0.05).getAttribute("position").count);
  });

  it("lets a box's own radius override the default", () => {
    const own = bakeBoxes([[0.4, 0.4, 0.4, 0, 0, 0, YELLOW, 0.01]], "one box", { radius: 0.1 });
    const expected = roundedBox(0.4, 0.4, 0.4, 0.01);
    expect(Array.from(own.getAttribute("position").array)).toEqual(Array.from(expected.getAttribute("position").array));
  });

  it("disposes every box it built, and keeps the merged geometry", () => {
    let merged: THREE.BufferGeometry | undefined;
    const disposed = disposedBy(() => {
      merged = bakeBoxes(boxes, "two sharp boxes");
    });
    expect(disposed).toHaveLength(boxes.length);
    expect(disposed).not.toContain(merged);
  });
});

describe("mergeBaked", () => {
  it("merges the pieces in order and disposes them", () => {
    const pieces = [paint(new THREE.BoxGeometry(1, 1, 1), YELLOW), paint(new THREE.BoxGeometry(1, 1, 1), DARK)];
    const seen: THREE.BufferGeometry[] = [];
    for (const g of pieces) g.addEventListener("dispose", () => seen.push(g));
    const merged = mergeBaked(pieces, "two boxes");
    expect(seen).toEqual(pieces);
    expect(merged.getAttribute("position").count).toBe(48);
    expect(colourAt(merged, 0)).toBe(YELLOW);
    expect(colourAt(merged, 47)).toBe(DARK);
  });

  it("names the model in the error when the pieces cannot merge, and still disposes them", () => {
    vi.spyOn(console, "error").mockImplementation(() => {}); // three logs why the merge failed
    const indexed = paint(new THREE.BoxGeometry(1, 1, 1), YELLOW);
    const flat = paint(new THREE.BoxGeometry(1, 1, 1).toNonIndexed(), DARK);
    const seen: THREE.BufferGeometry[] = [];
    for (const g of [indexed, flat]) g.addEventListener("dispose", () => seen.push(g));
    expect(() => mergeBaked([indexed, flat], "the test robot's head")).toThrow(/the test robot's head/);
    expect(seen).toEqual([indexed, flat]);
  });
});

describe("roundedBox", () => {
  it("caps the corner radius at 30 % of the thinnest side", () => {
    const thin = roundedBox(1, 1, 0.1, 0.5);
    const capped = new RoundedBoxGeometry(1, 1, 0.1, 2, 0.03);
    expect(Array.from(thin.getAttribute("position").array)).toEqual(Array.from(capped.getAttribute("position").array));
  });
});
