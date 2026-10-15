import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { InstanceBatch } from "@/world/engine/voxel/mesher";
import type { Quality } from "@/world/state/store";

const geometries: Partial<Record<Quality, RoundedBoxGeometry>> = {};
function blockGeometry(q: Quality): RoundedBoxGeometry {
  return (geometries[q] ??= new RoundedBoxGeometry(1, 1, 1, q === "high" ? 2 : 1, 0.08));
}
const blockMaterial = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.92, metalness: 0 });

export function IslandTerrain({ batch, quality }: { batch: InstanceBatch; quality: Quality }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => blockGeometry(quality), [quality]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    for (let i = 0; i < batch.count; i++) {
      m.makeTranslation(batch.positions[i * 3], batch.positions[i * 3 + 1], batch.positions[i * 3 + 2]);
      mesh.setMatrixAt(i, m);
      c.setRGB(batch.colors[i * 3], batch.colors[i * 3 + 1], batch.colors[i * 3 + 2], THREE.SRGBColorSpace);
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [batch, geometry]);
  if (batch.count === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, blockMaterial, batch.count]}
      userData={{ noSeeThrough: true }}
      castShadow={quality === "high"}
      receiveShadow
    />
  );
}
