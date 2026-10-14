import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Ezra's graduation outfit, from his photos (Petra Christian University's 90th graduation, 5 September 2026, Business
 * Information Systems): a royal-blue mortarboard with a black cord and tassel, an orange collar band with a thin black
 * inner edge, and a bronze medal on a royal-blue ribbon, all worn over his usual black tee.
 */
export const GRAD_COLORS = {
  /** the photos read ≈ #0b44b5 under stage light; a touch lighter so it stays royal blue in the warm world light */
  cap: "#1f4fc4",
  cord: "#1b1e24",
  collar: "#f26a1b",
  collarEdge: "#1b1e24",
  medal: "#a8907e",
  ribbon: "#1f4fc4",
} as const;

/** Height of the cap's base (its skull cap's bottom) above Ezra's head pivot: just under his hair top (~0.65). */
export const CAP_ON_HEAD_Y = 0.49;

interface Piece {
  size: readonly [number, number, number];
  at: readonly [number, number, number];
  color: string;
  /** rotation (radians) about z, applied before the move */
  rz?: number;
  /** rotation about y, applied before the move */
  ry?: number;
  /** a disc facing +z instead of a box: size = [diameter, thickness, unused] */
  disc?: boolean;
  radius?: number;
}

/** Bakes pieces into one non-indexed, vertex-coloured geometry: one draw call for the whole part. */
function bake(pieces: readonly Piece[]): THREE.BufferGeometry {
  const c = new THREE.Color();
  const parts = pieces.map((p) => {
    let g: THREE.BufferGeometry;
    if (p.disc) {
      const cyl = new THREE.CylinderGeometry(p.size[0] / 2, p.size[0] / 2, p.size[1], 20);
      g = cyl.toNonIndexed();
      cyl.dispose();
      g.rotateX(Math.PI / 2);
    } else {
      const [w, h, d] = p.size;
      g = new RoundedBoxGeometry(w, h, d, 2, Math.min(p.radius ?? 0.01, Math.min(w, h, d) * 0.3));
    }
    if (p.ry) g.rotateY(p.ry);
    if (p.rz) g.rotateZ(p.rz);
    g.translate(p.at[0], p.at[1], p.at[2]);
    c.set(p.color);
    const n = g.attributes.position.count;
    const rgb = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) rgb.set([c.r, c.g, c.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(rgb, 3));
    return g;
  });
  const merged = mergeGeometries(parts);
  for (const g of parts) g.dispose();
  if (!merged) throw new Error("graduation: could not merge the outfit geometry");
  return merged;
}

const K = GRAD_COLORS;

/**
 * The mortarboard, its base at the origin (model space: faces +z, Ezra's right is −x): skull cap, square board, centre
 * button, the cord running to the board's right edge and down to a tassel that hangs beside his face.
 */
export const CAP_GEOMETRY = bake([
  { size: [0.6, 0.18, 0.54], at: [0, 0.09, 0], color: K.cap, radius: 0.04 },
  { size: [0.78, 0.035, 0.78], at: [0, 0.1975, 0], color: K.cap, radius: 0.012 },
  { size: [0.07, 0.025, 0.07], at: [0, 0.2275, 0], color: K.cord },
  // from the button to the edge at (−0.39, 0.12): a 0.408 cord turned 0.2985 rad about y
  { size: [0.408, 0.012, 0.018], at: [-0.195, 0.221, 0.06], color: K.cord, ry: 0.2985 },
  { size: [0.014, 0.22, 0.014], at: [-0.395, 0.105, 0.12], color: K.cord },
  { size: [0.05, 0.2, 0.05], at: [-0.395, -0.105, 0.12], color: K.cord, radius: 0.015 },
]);

const side = (s: 1 | -1): Piece[] => [
  // the collar band: a V from each shoulder down to the chest (it meets at y 1.0), with a thin black inner edge
  { size: [0.075, 0.381, 0.02], at: [s * 0.095, 1.165, 0.172], color: K.collar, rz: -s * 0.522 },
  { size: [0.022, 0.34, 0.021], at: [s * 0.053, 1.189, 0.1725], color: K.collarEdge, rz: -s * 0.522 },
  { size: [0.075, 0.022, 0.34], at: [s * 0.2, 1.341, 0], color: K.collar },
  { size: [0.075, 0.24, 0.02], at: [s * 0.19, 1.21, -0.172], color: K.collar },
  // the medal ribbon: from beside the neck down to the medal, over the shoulder and round the back of the neck
  { size: [0.03, 0.218, 0.012], at: [s * 0.0465, 1.235, 0.19], color: K.ribbon, rz: -s * 0.265 },
  { size: [0.03, 0.025, 0.3], at: [s * 0.085, 1.355, 0.04], color: K.ribbon },
];

/** Collar band and medal, in Ezra's body space (feet at the origin; the tee's front is at z 0.16, its top at 1.33). */
export const REGALIA_GEOMETRY = bake([
  ...side(1),
  ...side(-1),
  { size: [0.17, 0.03, 0.012], at: [0, 1.36, -0.11], color: K.ribbon },
  { size: [0.12, 0.022, 0], at: [0, 1.08, 0.2], color: K.medal, disc: true },
]);

/** One material for both parts (vertex colours), a little smoother than the clothes. */
export const GRAD_MATERIAL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
