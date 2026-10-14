import { MONOSUKO } from "../layouts";

/** One piece of the POS stall's awning, island-local (centre and size): a stripe of the canopy or the valance strip under its front edge. */
export interface AwningPart {
  /** The stripe it belongs to, 0 = left (PosMonosuko colours them green and off-white in turn). */
  i: number;
  kind: "stripe" | "valance";
  x: number; y: number; z: number;
  sx: number; sy: number; sz: number;
  /** Tilt about x, front edge down (PropBlock rx). */
  rx: number;
}

const THICK = 0.1;
const VALANCE_DEPTH = 0.05;
/** The valance reaches this far up into the stripe above it, so no seam shows between them. */
const VALANCE_TUCK = 0.02;

/**
 * The awning (MONOSUKO.awning) as boxes: each stripe is a THICK slab `len` long, centred at z and tilted `tilt` about
 * its centre so its top at the back edge is `top`; its valance hangs `valance` below the front edge. PosMonosuko draws
 * these boxes, and layouts.test.ts keeps every corner above the screen's top edge from both tour cameras.
 */
export function awningParts(): AwningPart[] {
  const a = MONOSUKO.awning;
  const stripeW = a.w / a.stripes;
  const drop = (a.len / 2) * Math.sin(a.tilt) + (THICK / 2) * Math.cos(a.tilt); // back top edge (or centre) down to the centre (or front bottom edge)
  const front = { y: a.top - 2 * drop, z: a.z + (a.len / 2) * Math.cos(a.tilt) };
  const out: AwningPart[] = [];
  for (let i = 0; i < a.stripes; i++) {
    const x = a.x - a.w / 2 + (i + 0.5) * stripeW;
    out.push({ i, kind: "stripe", x, y: a.top - drop, z: a.z, sx: stripeW, sy: THICK, sz: a.len, rx: a.tilt });
    out.push({ i, kind: "valance", x, y: front.y - a.valance / 2 + VALANCE_TUCK, z: front.z, sx: stripeW, sy: a.valance, sz: VALANCE_DEPTH, rx: 0 });
  }
  return out;
}
