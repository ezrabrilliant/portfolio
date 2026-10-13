import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Crossing } from "@/world/engine/gen/layout";
import { mulberry32 } from "@/world/engine/gen/rng";
import { blockId } from "@/world/engine/voxel/blocks";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { steppingStones } from "./geometry";

const stoneGeo = new RoundedBoxGeometry(1, 1, 1, 2, 0.1);
const stoneMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.95 });
const STONES = ["#b5afa5", "#a9a399", "#bfb9af"];

export function SteppingStones({ crossing }: { crossing: Crossing }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const cast = useWorld((s) => s.quality === "high");
  const stones = useMemo(() => {
    // stones whose cell the island already fills (the rim) would z-fight with its blocks: only draw the stamped ones
    const grid = runtime.built?.grid;
    const barrier = blockId("barrier");
    return steppingStones(crossing.a, crossing.b).filter((s) => !grid || grid.get(s.x, s.y, s.z) === barrier);
  }, [crossing]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const r = mulberry32(stones.length * 97 + 13);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    stones.forEach((s, i) => {
      m.makeTranslation(s.x + 0.5, s.y + 0.5, s.z + 0.5);
      mesh.setMatrixAt(i, m);
      c.set(STONES[Math.floor(r() * STONES.length)]);
      mesh.setColorAt(i, c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [stones]);
  if (stones.length === 0) return null;
  return <instancedMesh ref={ref} args={[stoneGeo, stoneMat, stones.length]} castShadow={cast} receiveShadow />;
}
