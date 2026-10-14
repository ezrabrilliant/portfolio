import { PLAZA } from "../layouts";
import { PALETTE, treeBlocks, type PropBlock } from "../shared/props";

/** The lanterns' centre above the grass (Plaza.tsx draws them, glowing, on the lamp posts). */
export const LANTERN_Y = 1.78;
// The sign's posts stand this far behind its plane, so their front face (0.09 − 0.1) stays behind the backing's front
// face (0.04): centred on the plane they poked 0.01 past the plank face and covered the W and the S of the lettering.
const SIGN_POST_BACK = 0.1;

/** The district sign: its two posts, a dark backing and the plank face (Plaza.tsx writes the lettering on it). */
export function districtSignBlocks(): PropBlock[] {
  const { sign } = PLAZA;
  const out: PropBlock[] = [];
  const signPostAt = (s: number) => ({
    x: sign.x + Math.cos(sign.ry) * s - Math.sin(sign.ry) * SIGN_POST_BACK,
    z: sign.z - Math.sin(sign.ry) * s - Math.cos(sign.ry) * SIGN_POST_BACK,
  });
  for (const s of [-(sign.w / 2 - 0.1), sign.w / 2 - 0.1]) {
    const p = signPostAt(s);
    out.push({ x: p.x, y: (sign.y + sign.h / 2) / 2, z: p.z, c: PALETTE.wood, sx: 0.18, sy: sign.y + sign.h / 2, sz: 0.18, ry: sign.ry });
  }
  out.push({ x: sign.x, y: sign.y, z: sign.z, c: PALETTE.woodDark, sx: sign.w + 0.12, sy: sign.h + 0.12, sz: 0.08, ry: sign.ry });
  const face = { x: sign.x + Math.sin(sign.ry) * 0.05, z: sign.z + Math.cos(sign.ry) * 0.05 };
  out.push({ x: face.x, y: sign.y, z: face.z, c: PALETTE.plank[0], sx: sign.w, sy: sign.h, sz: 0.06, ry: sign.ry });
  return out;
}

/**
 * The plaza's other props: the tree, the lamp posts and the flowers (layouts.test checks the boards and signs against
 * them). Plaza.tsx draws them with the district sign as one batch.
 */
export function plazaPropBlocks(): PropBlock[] {
  const out: PropBlock[] = [...treeBlocks(PLAZA.tree.x, PLAZA.tree.z, PLAZA.tree.h, PLAZA.tree.seed)];
  for (const l of PLAZA.lamps) {
    out.push({ x: l.x, y: 0.82, z: l.z, c: PALETTE.wood, sx: 0.16, sy: 1.64, sz: 0.16 });
    out.push({ x: l.x, y: LANTERN_Y + 0.17, z: l.z, c: PALETTE.woodDark, sx: 0.36, sy: 0.06, sz: 0.36 });
  }
  for (const f of PLAZA.flowers) {
    out.push({ x: f.x, y: 0.11, z: f.z, c: PALETTE.leaf[2], sx: 0.05, sy: 0.22, sz: 0.05 });
    out.push({ x: f.x, y: 0.26, z: f.z, c: f.c, sx: 0.2, sy: 0.1, sz: 0.2 });
  }
  return out;
}
