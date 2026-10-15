import { ORBIT } from "../layouts";
import { PALETTE, type PropBlock } from "../shared/props";

export function stallBlocks(): PropBlock[] {
  const out: PropBlock[] = [];
  for (const [x, z] of [[-1.45, -0.9], [1.45, -0.9], [-1.45, 0.9], [1.45, 0.9]] as const) {
    out.push({ x, y: 1.4, z, c: PALETTE.wood, sx: 0.2, sy: 2.8, sz: 0.2 });
  }
  out.push({ x: 0, y: 0.5, z: 0.45, c: PALETTE.plank[0], sx: 2.9, sy: 1.0, sz: 0.9 }); // counter
  out.push({ x: 0, y: 1.06, z: 0.45, c: PALETTE.wood, sx: 3.2, sy: 0.13, sz: 1.1 }); // counter top
  for (let i = 0; i < 6; i++) {
    out.push({ x: -1.375 + i * 0.55, y: 2.92, z: 0, c: i % 2 ? PALETTE.white : PALETTE.blue, sx: 0.55, sy: 0.12, sz: 2.5, rx: 0.32 }); // awning
  }
  for (const x of [-1.45, 1.45]) out.push({ x, y: 3.12, z: -0.9, c: PALETTE.wood, sx: 0.18, sy: 0.95, sz: 0.18 });
  out.push({ x: 0, y: 3.6, z: -0.9, c: PALETTE.wood, sx: 3.1, sy: 0.18, sz: 0.2 }); // sign beam
  for (const x of [-0.75, 0.75]) out.push({ x, y: 3.9, z: -0.9, c: PALETTE.wood, sx: 0.16, sy: 0.5, sz: 0.16 });
  for (const c of ORBIT.crates) out.push({ x: c.x, y: c.stack + c.s / 2, z: c.z, c: PALETTE.crate[0], sx: c.s, sy: c.s, sz: c.s, ry: c.ry });
  out.push({ x: -0.35, y: 1.83, z: 0.57, c: "#efeee9", sx: 1.3, sy: 1.5, sz: 0.08 }); // QRIS board backing
  // thermal printer at the counter's front edge: the receipt (ORBIT.receipt, z 1.03) leaves its slot and hangs past the counter
  out.push({ x: 0.95, y: 1.32, z: 0.74, c: "#2b2f36", sx: 0.7, sy: 0.4, sz: 0.55 });
  out.push({ x: 0.95, y: 1.18, z: 1.012, c: PALETTE.blue, sx: 0.72, sy: 0.06, sz: 0.02 }); // printer stripe, behind the paper
  out.push({ x: 0.95, y: 1.44, z: 1.02, c: "#111317", sx: 0.5, sy: 0.03, sz: 0.01 }); // paper slot
  return out;
}
