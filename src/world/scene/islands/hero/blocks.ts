import { HERO } from "../layouts";
import { PALETTE, type PropBlock } from "../shared/props";

export const POLE_H = 2.6;
export const CLOTH_W = 1.05;
export const CLOTH_H = 0.62;

// in front of the title's foot, never in its plane (z = HERO.title.z); a stem under each bloom, so up close they read
// as flowers and not as the title's off-white punch debris
export const FLOWERS: PropBlock[] = (
  [
    [-2, 0.6, "#efe7cf"], [0.6, 0.4, "#e8c9a8"], [-1, 3, "#efe7cf"], [2, 3, "#d9c37a"], [-3.1, 1.2, "#efe7cf"],
  ] as const
).flatMap(([x, z, c]) => [
  { x, y: 0.11, z, c: PALETTE.leaf[2], sx: 0.05, sy: 0.22, sz: 0.05, sway: 0.5 },
  { x, y: 0.26, z, c, sx: 0.2, sy: 0.1, sz: 0.2, sway: 1 },
]);

// the pole and its cap join the static blocks (one draw call); only the cloth moves
export const POLE: PropBlock[] = [
  { x: HERO.flag.x, y: POLE_H / 2, z: HERO.flag.z, c: "#5b4632", sx: 0.1, sy: POLE_H, sz: 0.1 },
  { x: HERO.flag.x, y: POLE_H + 0.06, z: HERO.flag.z, c: "#d9c37a", sx: 0.16, sy: 0.12, sz: 0.16 },
];
