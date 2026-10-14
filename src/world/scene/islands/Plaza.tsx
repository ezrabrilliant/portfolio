import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { worldCopy } from "@/config/portfolio";
import { WorldText } from "@/world/scene/WorldText";
import { PLAZA } from "./layouts";
import { PropBlocks } from "./shared/PropBlocks";
import { islandFrame } from "./shared/local";
import { PALETTE, treeBlocks, type PropBlock } from "./shared/props";

const LANTERN_Y = 1.78;
const LANTERN_GEO = new THREE.BoxGeometry(0.28, 0.28, 0.28);
const LANTERN_MAT = new THREE.MeshStandardMaterial({ color: "#f1dfb0", emissive: "#f3d58e", emissiveIntensity: 0.6, roughness: 0.6 });
// The sign's posts stand this far behind its plane, so their front face (0.09 − 0.1) stays behind the backing's front
// face (0.04): centred on the plane they poked 0.01 past the plank face and covered the W and the S of the lettering.
const POST_BACK = 0.1;

/** The district sign (posts, a dark backing and the plank face), the tree, the lamp posts and the flowers: one batch. */
function plazaBlocks(): PropBlock[] {
  const { sign } = PLAZA;
  const out: PropBlock[] = [];
  const along = (s: number) => ({
    x: sign.x + Math.cos(sign.ry) * s - Math.sin(sign.ry) * POST_BACK,
    z: sign.z - Math.sin(sign.ry) * s - Math.cos(sign.ry) * POST_BACK,
  });
  for (const s of [-(sign.w / 2 - 0.1), sign.w / 2 - 0.1]) {
    const p = along(s);
    out.push({ x: p.x, y: (sign.y + sign.h / 2) / 2, z: p.z, c: PALETTE.wood, sx: 0.18, sy: sign.y + sign.h / 2, sz: 0.18, ry: sign.ry });
  }
  out.push({ x: sign.x, y: sign.y, z: sign.z, c: PALETTE.woodDark, sx: sign.w + 0.12, sy: sign.h + 0.12, sz: 0.08, ry: sign.ry });
  const face = { x: sign.x + Math.sin(sign.ry) * 0.05, z: sign.z + Math.cos(sign.ry) * 0.05 };
  out.push({ x: face.x, y: sign.y, z: face.z, c: PALETTE.plank[0], sx: sign.w, sy: sign.h, sz: 0.06, ry: sign.ry });
  out.push(...treeBlocks(PLAZA.tree.x, PLAZA.tree.z, PLAZA.tree.h, PLAZA.tree.seed));
  for (const l of PLAZA.lamps) {
    out.push({ x: l.x, y: 0.82, z: l.z, c: PALETTE.wood, sx: 0.16, sy: 1.64, sz: 0.16 });
    out.push({ x: l.x, y: LANTERN_Y + 0.17, z: l.z, c: PALETTE.woodDark, sx: 0.36, sy: 0.06, sz: 0.36 });
  }
  for (const f of PLAZA.flowers) {
    out.push({ x: f.x, y: 0.11, z: f.z, c: PALETTE.leaf[2], sx: 0.05, sy: 0.22, sz: 0.05 });
    out.push({ x: f.x, y: 0.26, z: f.z, c: f.c, sx: 0.2, sy: 0.1, sz: 0.2 });
  }
  return out;
}

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
  const blocks = useMemo(plazaBlocks, []);
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
    </>
  );
}
