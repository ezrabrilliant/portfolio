import * as THREE from "three";

/**
 * Day to golden hour and back (spec: polish #15): over DAY_CYCLE seconds the light warms from the late-afternoon look to
 * a golden hour and returns. `daylight.k` (0 = day, 1 = golden hour) is written once a frame by Sky and read by the sky,
 * the fog and the lights.
 */
export const DAY_CYCLE = 600;
export const daylight = { k: 0 };

/** 0 at the start of a visit, 1 half a cycle in, 0 again at the end (eased both ways). */
export function daylightK(t: number): number {
  return 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / DAY_CYCLE);
}

/** Day → golden-hour pairs. */
export const DAY = {
  skyTop: [new THREE.Color("#8ab3d1"), new THREE.Color("#93a9cf")],
  skyHorizon: [new THREE.Color("#cbdce4"), new THREE.Color("#f2cfa8")],
  sun: [new THREE.Color("#ffd3a1"), new THREE.Color("#ffa964")],
  sunIntensity: [3, 2.4],
  hemiSky: [new THREE.Color("#dce7ef"), new THREE.Color("#f0d9c2")],
  hemiGround: [new THREE.Color("#a08c6d"), new THREE.Color("#93705a")],
  hemiIntensity: [1.2, 1.05],
} as const;

/** Mixes a pair into `out` at k. */
export function mixColor(out: THREE.Color, pair: readonly [THREE.Color, THREE.Color], k: number): THREE.Color {
  return out.copy(pair[0]).lerp(pair[1], k);
}

/**
 * Lantern and lamp materials that glow brighter toward golden hour (Sky multiplies each one's base glow, kept in
 * userData.glow, by up to 2.4).
 */
export const glowMaterials = new Set<THREE.MeshStandardMaterial>();

/** Registers a glowing material (its current emissiveIntensity is its daytime glow). */
export function glows(m: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  m.userData.glow = m.emissiveIntensity;
  glowMaterials.add(m);
  return m;
}
