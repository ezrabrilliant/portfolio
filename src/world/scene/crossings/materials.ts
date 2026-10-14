import * as THREE from "three";
import { mergeBaked, paint } from "@/world/scene/shared/bake";

/** Crossing palette: planks, dark wood, rope, iron. */
export const PLANK = "#b98f62";
export const WOOD = "#6b4f37";
export const ROPE = "#c9b48a";
export const IRON = "#4a4b4e";

export const woodMat = new THREE.MeshStandardMaterial({ color: WOOD, roughness: 0.9 });
export const ropeMat = new THREE.MeshStandardMaterial({ color: ROPE, roughness: 1 });
export const ironMat = new THREE.MeshStandardMaterial({ color: IRON, roughness: 0.5, metalness: 0.6 });
/** Wood parts merged into one mesh: colour comes from the geometry's vertex colours. */
export const paintMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, vertexColors: true });

export const unitBox = new THREE.BoxGeometry(1, 1, 1);

/** A part for `mergeParts`: geometry (consumed), its colour and optional placement. */
export interface Part {
  geo: THREE.BufferGeometry;
  color: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

/** Bakes each part's placement and colour into one geometry (one draw call with `paintMat`). */
export function mergeParts(parts: Part[]): THREE.BufferGeometry {
  const m = new THREE.Matrix4();
  return mergeBaked(
    parts.map(({ geo, color, position = [0, 0, 0], rotation = [0, 0, 0] }) => {
      m.compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(1, 1, 1));
      return paint(geo.applyMatrix4(m), color);
    }),
    "a crossing part",
  );
}
