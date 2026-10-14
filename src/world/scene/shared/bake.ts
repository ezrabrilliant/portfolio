import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/*
 * Vertex-colour baking for the world's static voxel models: each piece gets one colour, then the pieces merge into one
 * geometry, which draws in a single call with a `vertexColors` material. Models are baked once, when their module loads
 * or a memo builds them. Nothing here runs per frame.
 */

const tint = new THREE.Color();

/** Gives every vertex of `g` the colour `colour` (its `color` attribute) and returns `g`. */
export function paint<G extends THREE.BufferGeometry>(g: G, colour: THREE.ColorRepresentation): G {
  tint.set(colour);
  const rgb = new Float32Array(g.getAttribute("position").count * 3);
  for (let i = 0; i < rgb.length; i += 3) {
    rgb[i] = tint.r;
    rgb[i + 1] = tint.g;
    rgb[i + 2] = tint.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(rgb, 3));
  return g;
}

/**
 * Merges `pieces` into one geometry and disposes them, whether or not the merge works. The pieces must be alike: all
 * indexed or none, with the same attributes. `label` names the model in the error thrown when they are not.
 */
export function mergeBaked(pieces: THREE.BufferGeometry[], label: string): THREE.BufferGeometry {
  const merged = mergeGeometries(pieces);
  for (const g of pieces) g.dispose();
  if (!merged) throw new Error(`could not merge ${label}: its pieces must all be indexed or none, with the same attributes`);
  return merged;
}

/** A rounded box (non-indexed). The corner radius is capped at 30 % of its thinnest side, so thin slabs keep square edges. */
export function roundedBox(w: number, h: number, d: number, radius: number): THREE.BufferGeometry {
  return new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, Math.min(w, h, d) * 0.3));
}

/** [width, height, depth, x, y, z, colour, corner radius?]: one box of a baked model, centred on (x, y, z). */
export type BakeBox = readonly [number, number, number, number, number, number, string, number?];

/**
 * Bakes `boxes` into one vertex-coloured geometry. A box with a corner radius (its own, else `radius`) is a
 * `roundedBox`; without one it is a plain, indexed BoxGeometry. Don't mix the two in one model, or the merge throws.
 */
export function bakeBoxes(boxes: readonly BakeBox[], label: string, { radius }: { radius?: number } = {}): THREE.BufferGeometry {
  return mergeBaked(
    boxes.map(([w, h, d, x, y, z, colour, r = radius]) =>
      paint((r === undefined ? new THREE.BoxGeometry(w, h, d) : roundedBox(w, h, d, r)).translate(x, y, z), colour),
    ),
    label,
  );
}
