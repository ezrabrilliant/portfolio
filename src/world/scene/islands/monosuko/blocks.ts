import { MONOSUKO } from "../layouts";
import { PALETTE, type PropBlock } from "../shared/props";
import { awningParts } from "./awning";

const POS_GREEN = "#1f7a4d";
const AWNING_WHITE = "#efede6";
/** The chicken pieces' centre (0.08 tall) on the grate, on the counter top (1.0); the grill's smoke rises from it. */
export const GRILL_TOP = MONOSUKO.grill.top - 0.04;

/**
 * Stone floor, plank back wall, back posts, counter, the green-and-white awning, the grill, table and stools: what
 * PosMonosuko.tsx draws as blocks (layouts.test checks the boards and signs against them).
 */
export function stallBlocks(): PropBlock[] {
  const { stall, grill, table } = MONOSUKO;
  const out: PropBlock[] = [];
  for (let x = stall.x0; x <= stall.x1; x++) for (let z = stall.wallZ; z <= stall.counterZ + 1; z++) {
    out.push({ x, y: 0.06, z, c: PALETTE.stone[0], sy: 0.12 });
  }
  for (let x = stall.x0; x <= stall.x1; x++) for (let row = 0; row < stall.wallRows; row++) {
    out.push({ x, y: row + 0.5, z: stall.wallZ - 0.3, c: PALETTE.plank[0], sz: 0.2 });
  }
  out.push({ x: 0, y: 0.44, z: stall.counterZ + 0.05, c: PALETTE.plank[1], sx: 3.0, sy: 0.88, sz: 0.7 }); // counter
  out.push({ x: 0, y: 0.94, z: stall.counterZ + 0.05, c: PALETTE.wood, sx: 3.3, sy: 0.12, sz: 0.9 }); // counter top
  // the awning over the screen (MONOSUKO.awning; layouts.test keeps it clear of the screen in both tour views)
  const awning = awningParts();
  for (const p of awning) {
    out.push({ x: p.x, y: p.y, z: p.z, sx: p.sx, sy: p.sy, sz: p.sz, rx: p.rx, c: p.i % 2 ? AWNING_WHITE : POS_GREEN });
  }
  // the posts stand outside the screen's ends, behind its plane, up to the middle of the awning's slab above them
  const stripe = awning.find((p) => p.kind === "stripe");
  const { posts } = MONOSUKO;
  for (const [x, z] of [[-posts.x, posts.zLeft], [posts.x, posts.zRight]]) {
    const top = stripe ? stripe.y - (z - stripe.z) * Math.tan(stripe.rx) : MONOSUKO.awning.top;
    out.push({ x, y: top / 2, z, c: PALETTE.wood, sx: 0.2, sy: top, sz: 0.2 });
  }
  // a tabletop charcoal grill with chicken pieces on the counter's right end
  out.push({ x: grill.x, y: 1.15, z: grill.z, c: "#4a4d52", sx: grill.w, sy: 0.3, sz: grill.d });
  out.push({ x: grill.x, y: 1.31, z: grill.z, c: "#2b2d30", sx: 0.62, sy: 0.03, sz: 0.38 });
  for (const [dx, dz] of [[-0.18, -0.06], [0.02, 0.06], [0.2, -0.04]] as const) {
    out.push({ x: grill.x + dx, y: GRILL_TOP, z: grill.z + dz, c: "#8a4a22", sx: 0.18, sy: 0.08, sz: 0.12 });
  }
  out.push({ x: table.x, y: 0.6, z: table.z, c: PALETTE.plank[0], sx: 1.0, sy: 0.08, sz: 0.7 });
  out.push({ x: table.x, y: 0.28, z: table.z, c: PALETTE.wood, sx: 0.12, sy: 0.56, sz: 0.12 });
  for (const dx of [-0.75, 0.75]) {
    out.push({ x: table.x + dx, y: 0.4, z: table.z, c: PALETTE.wood, sx: 0.36, sy: 0.08, sz: 0.36 });
    out.push({ x: table.x + dx, y: 0.18, z: table.z, c: PALETTE.woodDark, sx: 0.1, sy: 0.36, sz: 0.1 });
  }
  return out;
}
