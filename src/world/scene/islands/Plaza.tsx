import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { worldCopy } from "@/config/portfolio";
import { WorldText } from "@/world/scene/WorldText";
import { PLAZA } from "./layouts";
import { MapBoard } from "./shared/MapBoard";
import { PropBlocks } from "./shared/PropBlocks";
import { islandFrame } from "./shared/local";
import { LANTERN_Y, districtSignBlocks, plazaPropBlocks } from "./plaza/blocks";

const LANTERN_GEO = new THREE.BoxGeometry(0.28, 0.28, 0.28);
const LANTERN_MAT = new THREE.MeshStandardMaterial({ color: "#f1dfb0", emissive: "#f3d58e", emissiveIntensity: 0.6, roughness: 0.6 });
/** Both lanterns in one draw call (they glow, so they can't share the props' plain material). */
function Lanterns() {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    PLAZA.lamps.forEach((l, i) => mesh.setMatrixAt(i, m.makeTranslation(l.x, LANTERN_Y, l.z)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);
  return <instancedMesh ref={ref} args={[LANTERN_GEO, LANTERN_MAT, PLAZA.lamps.length]} />;
}

/**
 * The Web & Apps plaza (spec §3.1): where the minecart from Ezra Bot arrives. A district sign facing the tour camera,
 * a tree, two lamps and flowers; the station itself is drawn by the minecart crossing.
 */
export function PlazaIsland({ placement }: { placement: IslandPlacement }) {
  const blocks = useMemo(() => [...districtSignBlocks(), ...plazaPropBlocks()], []);
  const { sign } = PLAZA;
  const textZ = 0.05 + 0.031;
  return (
    <>
      <group position={islandFrame(placement)}>
        <PropBlocks blocks={blocks} seed={505} />
        <Lanterns />
        <group position={[sign.x, 0, sign.z]} rotation={[0, sign.ry, 0]}>
          <WorldText text={worldCopy.webDistrict.toUpperCase()} position={[0, sign.y + 0.12, textZ]} size={0.42} color="#3a2a1c" font="pixel" />
          <WorldText text="Three projects ahead" position={[0, sign.y - 0.33, textZ]} size={0.15} color="#5a4130" font="ui" />
        </group>
      </group>
      <MapBoard placement={placement} at={PLAZA.map} />
    </>
  );
}
