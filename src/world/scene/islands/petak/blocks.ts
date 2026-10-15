import { mulberry32 } from "@/world/engine/gen/rng";
import { PETAK } from "../layouts";
import { PALETTE, pickColor, type PropBlock } from "../shared/props";

export const KOLONG = 1.6; // open space under the house, on stilts
export const FLOOR = KOLONG + 0.25; // floor top
export const EAVE = FLOOR + 2.4; // top of the walls
export const WALL = 0.12; // wall thickness
export const BILIK = "#cbb07c"; // woven-bamboo wall tone
export const DARK = "#2e241c"; // the dark inside behind openings
export const RED = "#b5473a"; // the red of the merah-putih school uniform
export const CLOTH = "#f1ede4";

/** Island-local block from min/max bounds. */
export function box(xa: number, xb: number, ya: number, yb: number, za: number, zb: number, c: string, rot: Partial<PropBlock> = {}): PropBlock {
  return { x: (xa + xb) / 2, y: (ya + yb) / 2, z: (za + zb) / 2, sx: xb - xa, sy: yb - ya, sz: zb - za, c, ...rot };
}

/** Island-local point (lx, lz) of a prop standing at `at`, turned by ry (three's Y rotation). */
export function turn(at: { x: number; z: number }, ry: number, lx: number, lz: number) {
  return { x: at.x + lx * Math.cos(ry) + lz * Math.sin(ry), z: at.z - lx * Math.sin(ry) + lz * Math.cos(ry) };
}

/**
 * Sundanese rumah panggung: stilts on stone footings over an open kolong with stacked firewood, bilik walls in a
 * dark-wood frame, a framed door up a wooden stair, a barred window, and a long gable roof (ridge along x)
 * with crossed capit gunting boards at both ends.
 */
export function houseBlocks(): PropBlock[] {
  const { x0, z0, w, d } = PETAK.house;
  const X0 = x0 - 0.5;
  const X1 = x0 + w - 0.5;
  const Z0 = z0 - 0.5;
  const Z1 = z0 + d - 0.5;
  const cx = (X0 + X1) / 2;
  const cz = (Z0 + Z1) / 2;
  const out: PropBlock[] = [];

  // kolong: umpak stones, stilts, floor beams, floor
  for (const x of [X0 + 0.2, cx, X1 - 0.2]) {
    for (const z of [Z0 + 0.2, Z1 - 0.2]) {
      out.push(box(x - 0.22, x + 0.22, 0, 0.16, z - 0.22, z + 0.22, PALETTE.stone[1]));
      out.push(box(x - 0.13, x + 0.13, 0.16, KOLONG, z - 0.13, z + 0.13, PALETTE.wood));
    }
  }
  for (const z of [Z0 + 0.2, Z1 - 0.2]) out.push(box(X0 - 0.05, X1 + 0.05, KOLONG - 0.22, KOLONG, z - 0.1, z + 0.1, PALETTE.woodDark));
  out.push(box(X0 - 0.1, X1 + 0.1, KOLONG, FLOOR, Z0 - 0.1, Z1 + 0.1, PALETTE.plank[1]));
  // firewood stacked under the right half (4-3-2 logs)
  const logs = ["#7a5a3c", "#8e6b47", "#6f5035"];
  for (let row = 0; row < 3; row++) {
    const n = 4 - row;
    for (let i = 0; i < n; i++) {
      const z = cz + (i - (n - 1) / 2) * 0.2;
      out.push(box(-1.2, 0, row * 0.18, row * 0.18 + 0.18, z - 0.09, z + 0.09, logs[(row + i) % 3]));
    }
  }

  // walls: bilik panels; the front leaves openings for the door and the window
  const F = FLOOR;
  const E = EAVE;
  const dx0 = x0 + 1 - 0.4; // door above the stair
  const dx1 = x0 + 1 + 0.4;
  const wx0 = x0 + 2.4 - 0.45; // front window
  const wx1 = x0 + 2.4 + 0.45;
  const wy0 = F + 0.6;
  const wy1 = F + 1.4;
  const doorTop = F + 1.7;
  out.push(
    box(X0, X1, F, E, Z0, Z0 + WALL, BILIK),
    box(X0, X0 + WALL, F, E, Z0 + WALL, Z1 - WALL, BILIK),
    box(X1 - WALL, X1, F, E, Z0 + WALL, Z1 - WALL, BILIK),
    box(X0, dx0, F, E, Z1 - WALL, Z1, BILIK),
    box(dx0, dx1, doorTop, E, Z1 - WALL, Z1, BILIK),
    box(dx1, wx0, F, E, Z1 - WALL, Z1, BILIK),
    box(wx0, wx1, F, wy0, Z1 - WALL, Z1, BILIK),
    box(wx0, wx1, wy1, E, Z1 - WALL, Z1, BILIK),
    box(wx1, X1, F, E, Z1 - WALL, Z1, BILIK),
  );
  // door: recessed plank door in a dark frame
  out.push(
    box(dx0, dx1, F, doorTop, Z1 - WALL - 0.06, Z1 - WALL, "#4a3424"),
    box(dx0 - 0.1, dx0, F, doorTop + 0.12, Z1 - 0.02, Z1 + 0.06, PALETTE.woodDark),
    box(dx1, dx1 + 0.1, F, doorTop + 0.12, Z1 - 0.02, Z1 + 0.06, PALETTE.woodDark),
    box(dx0 - 0.1, dx1 + 0.1, doorTop, doorTop + 0.12, Z1 - 0.02, Z1 + 0.06, PALETTE.woodDark),
  );
  // front window: dark inside, three bars, sill and lintel
  out.push(box(wx0, wx1, wy0, wy1, Z1 - WALL - 0.04, Z1 - WALL, DARK));
  for (let i = 1; i <= 3; i++) {
    const x = wx0 + ((wx1 - wx0) * i) / 4;
    out.push(box(x - 0.03, x + 0.03, wy0, wy1, Z1 - 0.08, Z1 - 0.02, PALETTE.plank[0]));
  }
  out.push(
    box(wx0 - 0.08, wx1 + 0.08, wy0 - 0.08, wy0, Z1 - 0.02, Z1 + 0.08, PALETTE.woodDark),
    box(wx0 - 0.08, wx1 + 0.08, wy1, wy1 + 0.08, Z1 - 0.02, Z1 + 0.06, PALETTE.woodDark),
  );
  // side window on the left wall (shutter-dark with bars)
  out.push(box(X0 - 0.03, X0, wy0, wy1, cz - 0.4, cz + 0.4, DARK));
  for (let i = 1; i <= 3; i++) {
    const z = cz - 0.4 + (0.8 * i) / 4;
    out.push(box(X0 - 0.08, X0 - 0.03, wy0, wy1, z - 0.03, z + 0.03, PALETTE.plank[0]));
  }
  out.push(box(X0 - 0.1, X0, wy0 - 0.08, wy0, cz - 0.48, cz + 0.48, PALETTE.woodDark), box(X0 - 0.08, X0, wy1, wy1 + 0.08, cz - 0.48, cz + 0.48, PALETTE.woodDark));
  // frame: corner posts, a sill beam on the floor, wall plates under the roof
  for (const x of [X0, X1]) for (const z of [Z0, Z1]) out.push(box(x - 0.09, x + 0.09, F - 0.02, E + 0.02, z - 0.09, z + 0.09, PALETTE.wood));
  out.push(
    box(X0 - 0.06, dx0 - 0.1, F, F + 0.1, Z1 - 0.02, Z1 + 0.05, PALETTE.woodDark),
    box(dx1 + 0.1, X1 + 0.06, F, F + 0.1, Z1 - 0.02, Z1 + 0.05, PALETTE.woodDark),
    box(X0 - 0.09, X1 + 0.09, E - 0.12, E, Z1 - 0.02, Z1 + 0.07, PALETTE.woodDark),
    box(X0 - 0.09, X1 + 0.09, E - 0.12, E, Z0 - 0.07, Z0 + 0.02, PALETTE.woodDark),
    box(X0 - 0.07, X0 + 0.02, E - 0.12, E, Z0, Z1, PALETTE.woodDark),
    box(X1 - 0.02, X1 + 0.07, E - 0.12, E, Z0, Z1, PALETTE.woodDark),
  );

  // long gable roof: full-length layers stepping in only along z, a ridge beam, capit gunting at both ends
  const layers = 7;
  for (let k = 0; k < layers; k++) {
    out.push({ x: cx, y: E + 0.13 + k * 0.26, z: cz, sx: w + 1.2, sy: 0.26, sz: d + 1.4 - k * 0.62, c: PALETTE.roof[k % 3] });
  }
  const ridge = E + layers * 0.26;
  out.push({ x: cx, y: ridge + 0.08, z: cz, sx: w + 1.5, sy: 0.16, sz: 0.24, c: PALETTE.woodDark });
  for (const s of [-1, 1]) for (const r of [-0.62, 0.62]) out.push({ x: cx + s * (w / 2 + 0.5), y: ridge + 0.13, z: cz, sx: 0.09, sy: 1.0, sz: 0.1, rx: r, c: PALETTE.woodDark });

  // wooden stair (tangga) up to the door: two sloping stringers and four open treads, five equal rises
  const zTop = Z1 + 0.1; // past the floor's lip
  const run = 1.32;
  const slope = Math.atan2(F, run);
  for (const x of [dx0 - 0.02, dx1 + 0.02]) {
    out.push({ x, y: F / 2, z: zTop + run / 2, sx: 0.08, sy: 0.16, sz: Math.hypot(F, run), rx: slope, c: PALETTE.woodDark });
  }
  for (let i = 1; i <= 4; i++) {
    const y = F - (i * F) / 5;
    const z = zTop + (i * run) / 5;
    out.push(box(dx0, dx1, y - 0.07, y, z - 0.15, z + 0.15, PALETTE.plank[0]));
  }
  return out;
}

/** Banana tree (pohon pisang): pseudo-stem, six drooping leaves, a young rolled leaf, a bunch and its heart. */
export function bananaBlocks(): PropBlock[] {
  const { x, z, h } = PETAK.banana;
  const out: PropBlock[] = [
    box(x - 0.17, x + 0.17, 0, h * 0.55, z - 0.17, z + 0.17, "#7f8a4d"),
    box(x - 0.15, x + 0.15, h * 0.55, h, z - 0.15, z + 0.15, "#93a05c"),
    box(x - 0.06, x + 0.06, h, h + 0.8, z - 0.06, z + 0.06, "#9cbd6e"),
    box(x + 0.18, x + 0.44, h - 0.6, h - 0.18, z - 0.02, z + 0.24, "#7f9a3a"),
    box(x + 0.25, x + 0.39, h - 0.85, h - 0.6, z + 0.04, z + 0.18, "#6e3b4c"),
  ];
  const len = 1.5;
  for (let i = 0; i < 6; i++) {
    const a = 0.32 + 0.12 * (i % 2); // droop
    const t = 0.3 + (i * Math.PI) / 3; // heading
    out.push({
      x: x + (len / 2) * Math.cos(a) * Math.cos(t),
      y: h + 0.1 - (len / 2) * Math.sin(a),
      z: z - (len / 2) * Math.cos(a) * Math.sin(t),
      sx: len, sy: 0.05, sz: 0.42, ry: t, rz: -a,
      c: PALETTE.leaf[i % 4],
    });
  }
  return out;
}

/** Gentong (clay water jar, the game's hiding jar) with a wooden lid and a coconut-shell dipper. */
export function gentongBlocks(): PropBlock[] {
  const { x, z } = PETAK.gentong;
  const clay = ["#a8603f", "#a05a3b"];
  // [width, bottom, top]: foot, swelling belly, shoulder, neck, rim
  const rings: [number, number, number][] = [
    [0.52, 0, 0.08], [0.7, 0.08, 0.2], [0.82, 0.2, 0.36], [0.9, 0.36, 0.6],
    [0.84, 0.6, 0.74], [0.7, 0.74, 0.84], [0.5, 0.84, 0.95], [0.6, 0.95, 1.02],
  ];
  const out = rings.map(([s, ya, yb], i) => box(x - s / 2, x + s / 2, ya, yb, z - s / 2, z + s / 2, clay[i % 2]));
  out.push(
    { ...box(x - 0.26, x + 0.26, 1.02, 1.07, z - 0.26, z + 0.26, PALETTE.woodDark), ry: 0.25 },
    box(x - 0.1, x + 0.1, 1.07, 1.17, z - 0.12, z + 0.08, "#5c4030"),
    { x: x + 0.2, y: 1.12, z: z + 0.05, sx: 0.36, sy: 0.04, sz: 0.04, ry: 0.6, c: "#5c4030" },
  );
  return out;
}

/** Jemuran: a clothesline on two posts with a red-and-white school uniform drying on it. */
export function jemuranBlocks(): PropBlock[] {
  const { x0, x1, z } = PETAK.jemuran;
  const line = 1.52;
  const shirt = x0 + 0.5;
  const shorts = x0 + 1.17;
  return [
    box(x0 - 0.05, x0 + 0.05, 0, 1.62, z - 0.05, z + 0.05, PALETTE.wood),
    box(x1 - 0.05, x1 + 0.05, 0, 1.62, z - 0.05, z + 0.05, PALETTE.wood),
    box(x0, x1, line - 0.012, line + 0.012, z - 0.012, z + 0.012, "#4e3f30"),
    box(shirt - 0.24, shirt + 0.24, line - 0.5, line - 0.02, z - 0.02, z + 0.02, CLOTH),
    box(shirt - 0.39, shirt - 0.24, line - 0.2, line - 0.02, z - 0.02, z + 0.02, CLOTH),
    box(shirt + 0.24, shirt + 0.39, line - 0.2, line - 0.02, z - 0.02, z + 0.02, CLOTH),
    box(shorts - 0.22, shorts + 0.22, line - 0.18, line - 0.02, z - 0.02, z + 0.02, RED),
    box(shorts - 0.22, shorts - 0.02, line - 0.42, line - 0.18, z - 0.02, z + 0.02, RED),
    box(shorts + 0.02, shorts + 0.22, line - 0.42, line - 0.18, z - 0.02, z + 0.02, RED),
  ];
}

/** Dirt path from the stair to the front edge: one tile per waypoint plus a smaller one between. */
export function pathBlocks(): PropBlock[] {
  const r = mulberry32(77);
  const dirt = ["#9a7550", "#8c6a48", "#a5815b"];
  const out: PropBlock[] = [];
  PETAK.path.forEach((p, i) => {
    out.push({ x: p.x, y: 0.025, z: p.z, sx: 0.8 + r() * 0.2, sy: 0.05, sz: 0.62 + r() * 0.16, ry: (r() - 0.5) * 0.5, c: pickColor(dirt, r) });
    const q = PETAK.path[i + 1];
    if (q) {
      const side = i % 2 ? 0.22 : -0.22;
      out.push({ x: (p.x + q.x) / 2 + side, y: 0.02, z: (p.z + q.z) / 2, sx: 0.42, sy: 0.04, sz: 0.36, ry: r() - 0.5, c: pickColor(dirt, r) });
    }
  });
  return out;
}

export const SIGN_BOTTOM = 0.55;

/** Static wood of the lantern posts and the title sign (posts, backing board, top rail). */
export function postBlocks(): PropBlock[] {
  const out: PropBlock[] = PETAK.lanterns.flatMap((l) => [
    { x: l.x, y: 1.0, z: l.z, c: PALETTE.wood, sx: 0.1, sy: 2.0, sz: 0.1 },
    { x: l.x + 0.22, y: 1.95, z: l.z, c: PALETTE.wood, sx: 0.5, sy: 0.08, sz: 0.08 },
  ]);
  const { ry, w, h } = PETAK.sign;
  const top = SIGN_BOTTOM + h;
  for (const s of [-1, 1]) {
    const p = turn(PETAK.sign, ry, s * (w / 2 - 0.3), -0.08); // posts just behind the board
    out.push({ x: p.x, y: (top + 0.12) / 2, z: p.z, sx: 0.16, sy: top + 0.12, sz: 0.16, ry, c: PALETTE.wood });
  }
  const c = turn(PETAK.sign, ry, 0, 0);
  out.push(
    { x: c.x, y: SIGN_BOTTOM + h / 2, z: c.z, sx: w, sy: h, sz: 0.1, ry, c: "#8a6644" },
    { x: c.x, y: top + 0.04, z: c.z, sx: w + 0.14, sy: 0.1, sz: 0.16, ry, c: PALETTE.woodDark },
  );
  return out;
}
