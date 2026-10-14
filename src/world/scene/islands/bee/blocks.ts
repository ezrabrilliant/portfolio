import { BEE, beeRoofPlanks, beeRoofY } from "../layouts";
import { PALETTE, type PropBlock } from "../shared/props";

const CHAIR = "#c79a62";
const CHAIR_DARK = "#a87b4c";
const STAND = "#2b2e33";

/**
 * Plank floor, back and left walls, posts, the sloped roof, the workbench with a half-built chair and a saw, the logs, the
 * monitor stand: what BeeCrm.tsx draws as blocks (layouts.test checks the boards and signs against them).
 */
export function shedBlocks(): PropBlock[] {
  const { shed, bench, logs, monitor, screen } = BEE;
  const out: PropBlock[] = [];
  for (let x = shed.x0; x <= shed.x1; x++) for (let z = shed.z0; z <= shed.z1; z++) out.push({ x, y: 0.06, z, c: PALETTE.plank[1], sy: 0.12 });
  for (let x = shed.x0; x <= shed.x1; x++) for (let row = 0; row < shed.rows; row++) {
    out.push({ x, y: row + 0.5, z: shed.z0 - 0.35, c: PALETTE.plank[0], sz: 0.2 }); // back wall
  }
  for (let z = shed.z0; z <= shed.z1; z++) for (let row = 0; row < shed.rows; row++) {
    // left wall: its top row stops at the roof line over the cell's front edge (a full row poked through the slope)
    const top = Math.min(row + 1, beeRoofY(z + 0.5));
    out.push({ x: shed.x0 - 0.35, y: (row + top) / 2, z, c: PALETTE.plank[0], sx: 0.2, sy: top - row });
  }
  out.push({ x: shed.x1 + 0.4, y: 1.55, z: shed.z0 - 0.35, c: PALETTE.wood, sx: 0.2, sy: 3.1, sz: 0.2 });
  out.push({ x: shed.x0 - 0.4, y: 1.35, z: shed.z1 + 0.4, c: PALETTE.wood, sx: 0.2, sy: 2.7, sz: 0.2 });
  out.push({ x: shed.x1 + 0.4, y: 1.35, z: shed.z1 + 0.4, c: PALETTE.wood, sx: 0.2, sy: 2.7, sz: 0.2 });
  for (const [i, p] of beeRoofPlanks().entries()) out.push({ ...p, c: PALETTE.roof[i % 3] });
  // workbench against the back wall
  out.push({ x: bench.x, y: 0.86, z: bench.z, c: PALETTE.plank[0], sx: 1.8, sy: 0.12, sz: 0.7 });
  for (const dx of [-0.8, 0.8]) for (const dz of [-0.25, 0.25]) out.push({ x: bench.x + dx, y: 0.4, z: bench.z + dz, c: PALETTE.wood, sx: 0.1, sy: 0.8, sz: 0.1 });
  // a half-built chair on it: seat, legs, two back posts and one rail (the second rail still missing). It stands on the
  // bench's right end, the part the desktop tour view sees between the sign's arrow and the monitor.
  const cx = bench.x + 0.45;
  out.push({ x: cx, y: 1.08, z: bench.z, c: CHAIR, sx: 0.5, sy: 0.06, sz: 0.46 });
  for (const dx of [-0.2, 0.2]) for (const dz of [-0.18, 0.18]) out.push({ x: cx + dx, y: 0.98, z: bench.z + dz, c: CHAIR_DARK, sx: 0.06, sy: 0.2, sz: 0.06 });
  for (const dx of [-0.2, 0.2]) out.push({ x: cx + dx, y: 1.36, z: bench.z - 0.2, c: CHAIR_DARK, sx: 0.06, sy: 0.5, sz: 0.06 });
  out.push({ x: cx, y: 1.5, z: bench.z - 0.2, c: CHAIR, sx: 0.5, sy: 0.08, sz: 0.05 });
  // hand saw hung on the back wall over the bench's left end (lying on the bench, the sign hid it in the desktop view):
  // blade and handle, tilted a little on their nail, just off the wall's front face (z0 − 0.25)
  const saw = { x: bench.x - 0.4, y: 1.35, z: shed.z0 - 0.23, tilt: 0.12 };
  out.push({ x: saw.x, y: saw.y, z: saw.z, c: "#9aa0a6", sx: 0.6, sy: 0.16, sz: 0.03, rz: saw.tilt });
  out.push({ x: saw.x - 0.33 * Math.cos(saw.tilt), y: saw.y - 0.33 * Math.sin(saw.tilt), z: saw.z + 0.01, c: PALETTE.wood, sx: 0.14, sy: 0.12, sz: 0.05, rz: saw.tilt });
  // log pile outside the left wall
  for (const [dx, y] of [[-0.18, 0.19], [0.18, 0.19], [0, 0.53]] as const) {
    out.push({ x: logs.x + dx, y, z: logs.z, c: dx === 0 ? "#86643f" : "#7a5a3c", sx: 0.36, sy: 0.36, sz: 0.9 });
  }
  // monitor stand: base and column up to the screen's bezel
  const bottom = screen.y - screen.h / 2;
  out.push({ x: monitor.x, y: 0.06, z: monitor.z, c: STAND, sx: 0.9, sy: 0.12, sz: 0.5 });
  out.push({ x: monitor.x, y: bottom / 2, z: screen.z - 0.2, c: STAND, sx: 0.14, sy: bottom, sz: 0.14 });
  return out;
}
