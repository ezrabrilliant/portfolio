import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Crossing palette: planks, dark wood, rope, iron. */
export const PLANK = "#b98f62";
export const WOOD = "#6b4f37";
export const ROPE = "#c9b48a";
export const IRON = "#4a4b4e";

export const plankMat = new THREE.MeshStandardMaterial({ color: PLANK, roughness: 0.9 });
export const woodMat = new THREE.MeshStandardMaterial({ color: WOOD, roughness: 0.9 });
export const ropeMat = new THREE.MeshStandardMaterial({ color: ROPE, roughness: 1 });
export const ironMat = new THREE.MeshStandardMaterial({ color: IRON, roughness: 0.5, metalness: 0.6 });
/** Wood parts merged into one mesh: colour comes from the geometry's vertex colours. */
export const paintMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, vertexColors: true });

export const unitBox = new THREE.BoxGeometry(1, 1, 1);

const tmpColor = new THREE.Color();

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
  const geos = parts.map(({ geo, color, position = [0, 0, 0], rotation = [0, 0, 0] }) => {
    m.compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(1, 1, 1));
    geo.applyMatrix4(m);
    tmpColor.set(color);
    const n = geo.getAttribute("position").count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      c[i * 3] = tmpColor.r;
      c[i * 3 + 1] = tmpColor.g;
      c[i * 3 + 2] = tmpColor.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return geo;
  });
  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  if (!merged) throw new Error("mergeParts: incompatible geometries");
  return merged;
}
