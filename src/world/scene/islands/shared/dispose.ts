import type * as THREE from "three";

/** Disposes geometries, materials and their textures under `root` (for <primitive> objects R3F won't dispose). */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const materials = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
    for (const m of materials) {
      for (const value of Object.values(m)) {
        if (value && typeof value === "object" && (value as THREE.Texture).isTexture) (value as THREE.Texture).dispose();
      }
      m.dispose();
    }
  });
}
