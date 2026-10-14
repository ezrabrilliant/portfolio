import { mulberry32 } from "@/world/engine/gen/rng";
import { PEDULI } from "../layouts";
import { PALETTE, treeBlocks, type PropBlock } from "../shared/props";

const SPINES = ["#7a3b34", "#2f4a6b", "#4f6b45", "#8a6a3a", "#5b4a6b", "#a8a296", "#6b3a2e", "#3f5a73"];
export const BRASS = "#b8975a";
export const SCALES_Y = 1.26; // the beam's pivot above the grass, on its post

/**
 * Stone floor, four posts, the flat roof, the bookshelf of statute books, the scales' table and post, the plinth, the
 * tree: what PeduliPasal.tsx draws as blocks (layouts.test checks the boards and signs against them).
 */
export function pavilionBlocks(): PropBlock[] {
  const { pavilion, roof, shelf, scales, phone, tree } = PEDULI;
  const out: PropBlock[] = [];
  for (let x = pavilion.x0; x <= pavilion.x1; x++) for (let z = pavilion.z0; z <= pavilion.z1; z++) {
    out.push({ x, y: 0.06, z, c: PALETTE.stone[1], sy: 0.12 });
  }
  for (const x of [pavilion.x0 - 0.4, pavilion.x1 + 0.4]) for (const z of [pavilion.z0 - 0.4, pavilion.z1 + 0.4]) {
    // up to the lower roof slab's underside
    const top = roof[0].y - roof[0].sy / 2;
    out.push({ x, y: top / 2, z, c: PALETTE.wood, sx: 0.2, sy: top, sz: 0.2 });
  }
  const cx = (pavilion.x0 + pavilion.x1) / 2;
  const cz = (pavilion.z0 + pavilion.z1) / 2;
  out.push({ ...roof[0], x: cx, z: cz, c: "#6f6157" });
  out.push({ ...roof[1], x: cx, z: cz, c: "#83756a" });
  out.push({ x: shelf.x, y: shelf.h / 2, z: shelf.z, c: PALETTE.wood, sx: shelf.w, sy: shelf.h, sz: 0.5 });
  const r = mulberry32(88);
  for (let s = 0; s < 3; s++) {
    let x = shelf.x - shelf.w / 2 + 0.1;
    while (x < shelf.x + shelf.w / 2 - 0.25) {
      const w = 0.12 + r() * 0.1;
      const h = 0.42 + r() * 0.16;
      out.push({ x: x + w / 2, y: 0.3 + s * 0.68 + h / 2, z: shelf.z + 0.12, c: SPINES[Math.floor(r() * SPINES.length)], sx: w, sy: h, sz: 0.32 });
      x += w + 0.02;
    }
  }
  out.push({ x: scales.x, y: 0.55, z: scales.z, c: PALETTE.plank[0], sx: 0.9, sy: 0.1, sz: 0.7 });
  out.push({ x: scales.x, y: 0.25, z: scales.z, c: PALETTE.wood, sx: 0.12, sy: 0.5, sz: 0.12 });
  out.push({ x: scales.x, y: 0.62, z: scales.z, c: BRASS, sx: 0.3, sy: 0.05, sz: 0.2 });
  out.push({ x: scales.x, y: (0.62 + SCALES_Y) / 2, z: scales.z, c: BRASS, sx: 0.06, sy: SCALES_Y - 0.62, sz: 0.06 });
  out.push({ x: phone.x, y: phone.plinth / 2, z: phone.z, c: PALETTE.stone[0], sx: phone.plinthW, sy: phone.plinth, sz: phone.plinthD });
  out.push(...treeBlocks(tree.x, tree.z, tree.h, tree.seed));
  return out;
}

/** The phone's body (PeduliPasal.tsx rounds its corners), standing on the plinth: as a box. */
export function phoneBody(): PropBlock {
  const { phone } = PEDULI;
  return { x: phone.x, y: phone.plinth + phone.h / 2, z: phone.z, c: "#1b1c20", sx: phone.w, sy: phone.h, sz: phone.d };
}
