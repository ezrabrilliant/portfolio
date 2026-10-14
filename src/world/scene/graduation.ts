import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { EZRA_CAP, EZRA_FIT } from "@/world/engine/physics/ezraModel";
import { LEG } from "./ezra/anim";

/**
 * Ezra's graduation outfit, from his photos (Petra Christian University's 90th graduation, 5 September 2026, Business
 * Information Systems): a royal-blue mortarboard with a black cord and tassel, and a royal-blue gown with wide sleeves
 * ending in broad black cuffs, an orange hood band edged in black on both sides that crosses the shoulders to a V on the
 * chest and on the back, a thin black facing down the front, and a bronze medal on a deeper blue ribbon. In the photos
 * the gown reaches his ankles; here it ends at mid-shin, so his shoes and a little of his legs show and his stride still
 * reads at the size the world shows him.
 */
export const GRAD_COLORS = {
  /** the photos read ≈ #0b44b5 under stage light; a touch lighter so it stays royal blue in the warm world light */
  cap: "#1f4fc4",
  /** the gown is the cap's blue */
  gown: "#1f4fc4",
  cord: "#1b1e24",
  collar: "#f26a1b",
  collarEdge: "#1b1e24",
  cuff: "#1b1e24",
  facing: "#1b1e24",
  medal: "#a8907e",
  /** a deeper royal blue than the gown, so the ribbon still reads lying on it (as in photo 1) */
  ribbon: "#173b93",
} as const;

/** Height of the cap's base (its skull cap's bottom) above Ezra's head pivot: just under his hair top (~0.65). */
export const CAP_ON_HEAD_Y = EZRA_CAP.base;

/** Ezra's body measurements (engine/physics/ezraModel.ts): Ezra.tsx builds his model from them and the gown is cut to them. */
export { EZRA_FIT };

/**
 * The gown body: a little outside the tee and the hips, from the shoulders (just under the head, at 1.36) to just
 * below the hips, where the skirt halves take over. The skirt's hem falls at mid-shin.
 */
const GOWN = { halfW: 0.3, halfD: 0.18, top: 1.34, bottom: 0.55, hem: 0.21 } as const;

/** The gown body pops on about this height (his chest), so it blooms outward instead of growing up from his feet. */
export const GOWN_POP_Y = 1.0;

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
  /** a flat slab of this outline (x, y points around it) instead of a box, size[2] thick along z: for exact mitres */
  outline?: readonly (readonly [number, number])[];
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
    } else if (p.outline) {
      const shape = new THREE.Shape(p.outline.map(([x, y]) => new THREE.Vector2(x, y)));
      g = new THREE.ExtrudeGeometry(shape, { depth: p.size[2], bevelEnabled: false });
      g.translate(0, 0, -p.size[2] / 2);
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
 * button (EZRA_CAP), the cord running to the board's right edge and down to a tassel that hangs beside his face.
 */
const { skull, board, button } = EZRA_CAP;
export const CAP_GEOMETRY = bake([
  { size: [skull.w, skull.h, skull.d], at: [0, skull.h / 2, 0], color: K.cap, radius: 0.04 },
  { size: [board.size, board.h, board.size], at: [0, board.y, 0], color: K.cap, radius: 0.012 },
  { size: [button.size, button.h, button.size], at: [0, button.y, 0], color: K.cord },
  // from the button to the edge at (−0.39, 0.12): a 0.408 cord turned 0.2985 rad about y
  { size: [0.408, 0.012, 0.018], at: [-0.195, 0.221, 0.06], color: K.cord, ry: 0.2985 },
  { size: [0.014, 0.22, 0.014], at: [-0.395, 0.105, 0.12], color: K.cord },
  { size: [0.05, 0.2, 0.05], at: [-0.395, -0.105, 0.12], color: K.cord, radius: 0.015 },
]);

/**
 * The hood band's V: each arm leans `lean` (radians) from upright, its centre line meeting the gown's centre line at
 * y `y0` and running `length` up to the shoulder. The orange is `width` wide, with a black `edge` on each side.
 */
const V = { lean: 0.522, y0: 1.0, length: 0.381, width: 0.075, edge: 0.022 } as const;
/** How far a black edge's centre sits from the orange band's centre line (half the band plus half the edge). */
const EDGE_OFF = V.width / 2 + V.edge / 2;

/**
 * A point of the V's arm on side s: `t` along its centre line from the gown's centre line, `k` across it (outward and
 * down positive). With `k` alone it gives where that line meets the centre line, so the two arms meet there in a clean
 * mitre.
 */
const vAt = (s: 1 | -1, k: number, t?: number): [number, number] => {
  const sin = Math.sin(V.lean);
  const cos = Math.cos(V.lean);
  if (t === undefined) return [0, V.y0 - k / sin];
  return [s * (t * sin + k * cos), V.y0 + t * cos - k * sin];
};

/**
 * One arm (side s) of the hood band's V, on the front (f = 1) or the back (f = −1): orange from the shoulder down to the
 * centre line, where it meets the other arm in a point, with a black edge on each side. The inner edges meet just above
 * the point, where the V opens; the outer edges meet just below it, where the front facing carries on down.
 */
const vArm = (s: 1 | -1, f: 1 | -1): Piece[] => {
  const z = f * (GOWN.halfD + 0.01);
  const ze = f * (GOWN.halfD + 0.0105);
  const [w, e, top] = [V.width / 2, V.edge, V.length];
  return [
    { outline: [vAt(s, w), vAt(s, w, top), vAt(s, -w, top), vAt(s, -w)], size: [0, 0, 0.02], at: [0, 0, z], color: K.collar },
    {
      outline: [vAt(s, -w), vAt(s, -w, top - 0.02), vAt(s, -w - e, top - 0.02), vAt(s, -w - e)],
      size: [0, 0, 0.021],
      at: [0, 0, ze],
      color: K.collarEdge,
    },
    { outline: [vAt(s, w + e), vAt(s, w + e, top), vAt(s, w, top), vAt(s, w)], size: [0, 0, 0.021], at: [0, 0, ze], color: K.collarEdge },
  ];
};

/** Side s of the hood band over the shoulder (edged in black), and of the medal ribbon. */
const side = (s: 1 | -1): Piece[] => [
  ...vArm(s, 1),
  ...vArm(s, -1),
  { size: [0.075, 0.022, 0.38], at: [s * 0.2, GOWN.top + 0.011, 0], color: K.collar },
  { size: [0.022, 0.024, 0.38], at: [s * (0.2 - EDGE_OFF), GOWN.top + 0.011, 0], color: K.collarEdge },
  { size: [0.022, 0.024, 0.38], at: [s * (0.2 + EDGE_OFF), GOWN.top + 0.011, 0], color: K.collarEdge },
  // the medal ribbon: from beside the neck down to the medal, over the band, and over the shoulder to the nape
  { size: [0.03, 0.218, 0.012], at: [s * 0.0465, 1.235, GOWN.halfD + 0.03], color: K.ribbon, rz: -s * 0.265 },
  { size: [0.03, 0.025, 0.325], at: [s * 0.085, 1.355, 0.0525], color: K.ribbon },
];

/**
 * The gown body, the hood band, the ribbon and the medal (one draw call), in Ezra's body space (feet at the origin; the
 * tee's front is at z 0.16, its top at 1.33).
 */
export const GOWN_GEOMETRY = bake([
  {
    size: [2 * GOWN.halfW, GOWN.top - GOWN.bottom, 2 * GOWN.halfD],
    at: [0, (GOWN.top + GOWN.bottom) / 2, 0],
    color: K.gown,
    radius: 0.035,
  },
  // the front facing: lies on the gown (2 mm proud), from the skirt up into the black tip where the band's outer edges meet
  { size: [0.03, 0.89 - GOWN.bottom - 0.01, 0.012], at: [0, (0.89 + GOWN.bottom + 0.01) / 2, GOWN.halfD + 0.002 - 0.006], color: K.facing },
  ...side(1),
  ...side(-1),
  { size: [0.17, 0.03, 0.012], at: [0, 1.36, -0.11], color: K.ribbon },
  { size: [0.12, 0.022, 0], at: [0, 1.08, GOWN.halfD + 0.04], color: K.medal, disc: true },
]);

/** The sleeve's inner side: just inside the gown body's side, over the tee sleeve (arm.halfW), never into the chest. */
const SLEEVE_IN = 0.095;
const SLEEVE_OUT = 0.16;
/** The black cuff's top and bottom below the shoulder pivot: it ends at the wrist, with the hand below it. */
const CUFF = { top: 0.355, end: 0.44 } as const;

/**
 * One wide sleeve (side s: 1 left, −1 right; one draw call), in the arm's shoulder-pivot space: royal blue from the
 * shoulder, ending in a broad black cuff at the wrist, a touch larger than the sleeve so it reads as a band.
 */
const sleeve = (s: 1 | -1) => {
  const top = 0.06;
  const mid = s * ((SLEEVE_OUT - SLEEVE_IN) / 2);
  return bake([
    { size: [SLEEVE_IN + SLEEVE_OUT, top + CUFF.top + 0.005, 0.26], at: [mid, (top - CUFF.top - 0.005) / 2, 0], color: K.gown, radius: 0.035 },
    {
      size: [SLEEVE_IN + SLEEVE_OUT + 0.005, CUFF.end - CUFF.top, 0.27],
      at: [mid + s * 0.0025, -(CUFF.top + CUFF.end) / 2, 0],
      color: K.cuff,
      radius: 0.02,
    },
  ]);
};

/** The sleeves, each hung on its arm so it swings with it. */
export const SLEEVE_GEOMETRY = { left: sleeve(1), right: sleeve(-1) } as const;

/**
 * One half of the skirt (side s; one draw call), in its leg's hip-pivot space (LEG): from the gown's centre line to its
 * side, tucked up under the gown body and down to the hem at mid-shin. Each half rides on its thigh, so the legs can
 * swing as far as they like without poking through; standing, the two halves meet as one skirt, and walking, the
 * gown opens along its front facing, which each half carries on its inner edge.
 */
const skirt = (s: 1 | -1) => {
  const top = GOWN.bottom + 0.12 - LEG.hipY;
  const bottom = GOWN.hem - LEG.hipY;
  const inner = -s * LEG.hipX;
  const outer = s * (GOWN.halfW - LEG.hipX);
  const y = (top + bottom) / 2;
  const radius = 0.03;
  // the facing fills the half's rounded inner front edge (2 mm proud of the face), so it is that corner rather than a
  // strip standing off it: a swung half shows no detached black line
  const back = GOWN.halfD - radius;
  const front = GOWN.halfD + 0.002;
  return bake([
    { size: [Math.abs(outer - inner), top - bottom, 2 * GOWN.halfD], at: [(outer + inner) / 2, y, 0], color: K.gown, radius },
    { size: [0.015, top - bottom, front - back], at: [inner + s * 0.0075, y, (front + back) / 2], color: K.facing },
  ]);
};

/** The skirt halves, each hung on its leg. */
export const SKIRT_GEOMETRY = { left: skirt(1), right: skirt(-1) } as const;

/** One material for the cap and the gown (vertex colours), a little smoother than the clothes. */
export const GRAD_MATERIAL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
