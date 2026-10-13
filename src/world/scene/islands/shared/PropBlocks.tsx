import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mulberry32 } from "@/world/engine/gen/rng";
import type { PropBlock } from "./props";

const GEOMETRY = new RoundedBoxGeometry(1, 1, 1, 2, 0.08);
const MATERIAL = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, metalness: 0 });
const m4 = new THREE.Matrix4();
const quat = new THREE.Quaternion();
const euler = new THREE.Euler();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();
const col = new THREE.Color();

/** Static decorative blocks as one InstancedMesh (one draw call). Coordinates are island-local. */
export function PropBlocks({ blocks, seed = 1 }: { blocks: readonly PropBlock[]; seed?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const r = mulberry32(seed);
    blocks.forEach((b, i) => {
      pos.set(b.x, b.y, b.z);
      scl.set(b.sx ?? 1, b.sy ?? 1, b.sz ?? 1);
      quat.setFromEuler(euler.set(b.rx ?? 0, b.ry ?? 0, b.rz ?? 0));
      mesh.setMatrixAt(i, m4.compose(pos, quat, scl));
      col.set(b.c).offsetHSL((r() - 0.5) * 0.01, (r() - 0.5) * 0.04, (r() - 0.5) * 0.04);
      mesh.setColorAt(i, col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [blocks, seed]);

  return (
    <instancedMesh
      key={blocks.length}
      ref={ref}
      args={[GEOMETRY, MATERIAL, blocks.length]}
      castShadow
      receiveShadow
      dispose={null}
    />
  );
}
