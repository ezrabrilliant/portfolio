import * as THREE from "three";
import { bakeBoxes } from "@/world/scene/shared/bake";

/** The crown's own material: Ezra never fades (seeSolid), so it must not share the props' (which do). */
export const CROWN_MATERIAL = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.45, metalness: 0.3, vertexColors: true });

/** Gold crown pieces: [y of the band's centre over the head pivot, band height]; its top stays under the cap's (MODEL_TOP). */
export const CROWN = { y: 0.57, band: 0.1, half: 0.31, prong: 0.08 } as const;

const GOLD = "#f2c14e";
const DARK = "#c9902a";
const GEM = "#d8473b";

/** The crown all the gold blocks earn (Gold.tsx): a band round the head, four corner prongs and a red gem at the front. */
export const CROWN_GEOMETRY = (() => {
  const { y, band, half, prong } = CROWN;
  const t = 0.05;
  return bakeBoxes(
    [
      [2 * half, band, t, 0, y, half, GOLD],
      [2 * half, band, t, 0, y, -half, GOLD],
      [t, band, 2 * half, half, y, 0, GOLD],
      [t, band, 2 * half, -half, y, 0, GOLD],
      ...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sx, sz]) => [0.08, prong, 0.08, sx * (half - 0.02), y + band / 2 + prong / 2, sz * (half - 0.02), GOLD] as const),
      [0.1, prong, 0.06, 0, y + band / 2 + prong / 2, half, GOLD],
      [0.08, 0.06, 0.03, 0, y, half + 0.035, GEM],
      [2 * half + 0.02, 0.025, 2 * half + 0.02, 0, y - band / 2, 0, DARK],
    ],
    "the gold crown",
  );
})();
