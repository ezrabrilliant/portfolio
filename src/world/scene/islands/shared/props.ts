import { mulberry32 } from "@/world/engine/gen/rng";

/** A decorative block in island-local coordinates (x/z = column centre, y = block centre). */
export interface PropBlock {
  x: number; y: number; z: number; c: string;
  sx?: number; sy?: number; sz?: number; rx?: number; ry?: number; rz?: number;
}

export const PALETTE = {
  wood: "#6b4f37",
  woodDark: "#5a4130",
  plank: ["#b98f62", "#ad8458"],
  roof: ["#b5674b", "#a85d43", "#bb6f52"],
  leaf: ["#6e8e57", "#7a9862", "#66854f", "#82a068"],
  crate: ["#a87f55", "#9c744c", "#b08659"],
  stone: ["#b5afa5", "#a9a399", "#bfb9af"],
  chart: ["#c4beb3", "#b8b2a7"],
  glass: "#c9d4d2",
  orange: "#FA5D19",
  blue: "#3D62F8",
  white: "#f4f3ef",
} as const;

export function pickColor(list: string | readonly string[], r: () => number): string {
  return typeof list === "string" ? list : list[Math.floor(r() * list.length)];
}

/** Blocky tree: h-block trunk, a 3x3x2 crown with random corners, one block on top. */
export function treeBlocks(x: number, z: number, h: number, seed: number): PropBlock[] {
  const r = mulberry32(seed);
  const out: PropBlock[] = [];
  for (let y = 0; y < h; y++) out.push({ x, y: y + 0.5, z, c: PALETTE.wood, sx: 0.7, sz: 0.7 });
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      for (let dy = 0; dy <= 1; dy++) {
        const corner = Math.abs(dx) + Math.abs(dz) === 2;
        if (corner && dy === 1 && r() < 0.65) continue;
        if (corner && dy === 0 && r() < 0.25) continue;
        out.push({ x: x + dx, y: h + dy + 0.5, z: z + dz, c: pickColor(PALETTE.leaf, r) });
      }
    }
  }
  out.push({ x, y: h + 2.5, z, c: pickColor(PALETTE.leaf, r) });
  return out;
}
