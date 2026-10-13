import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { worldCopy } from "@/config/portfolio";
import { useWorld } from "@/world/state/store";
import { HERO } from "./layouts";
import { VoxelTitle } from "./VoxelTitle";
import { InfoBoard } from "./shared/InfoBoard";
import { PropBlocks } from "./shared/PropBlocks";
import { islandFrame } from "./shared/local";
import { PALETTE, treeBlocks, type PropBlock } from "./shared/props";

const POLE_H = 2.6;
const CLOTH_W = 1.05;
const CLOTH_H = 0.62;

// in front of the title's foot, never in its plane (z = HERO.title.z); a stem under each bloom, so up close they read
// as flowers and not as the title's off-white punch debris
const FLOWERS: PropBlock[] = (
  [
    [-2, 0.6, "#efe7cf"], [0.6, 0.4, "#e8c9a8"], [-1, 3, "#efe7cf"], [2, 3, "#d9c37a"], [-3.1, 1.2, "#efe7cf"],
  ] as const
).flatMap(([x, z, c]) => [
  { x, y: 0.11, z, c: PALETTE.leaf[2], sx: 0.05, sy: 0.22, sz: 0.05 },
  { x, y: 0.26, z, c, sx: 0.2, sy: 0.1, sz: 0.2 },
]);

// the pole and its cap join the static blocks (one draw call); only the cloth moves
const POLE: PropBlock[] = [
  { x: HERO.flag.x, y: POLE_H / 2, z: HERO.flag.z, c: "#5b4632", sx: 0.1, sy: POLE_H, sz: 0.1 },
  { x: HERO.flag.x, y: POLE_H + 0.06, z: HERO.flag.z, c: "#d9c37a", sx: 0.16, sy: 0.12, sz: 0.16 },
];

/** Cloth on the flag pole; waves in place (normals from the wave's slope, nothing allocated per frame). */
function FlagCloth() {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(CLOTH_W, CLOTH_H, 12, 2);
    g.translate(CLOTH_W / 2, 0, 0); // left edge on the pole
    return g;
  }, []);
  const base = useMemo(() => Float32Array.from(geometry.attributes.position.array as ArrayLike<number>), [geometry]);

  useFrame(({ clock }) => {
    if (useWorld.getState().reducedMotion) return;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const nor = geometry.attributes.normal as THREE.BufferAttribute;
    const t = clock.elapsedTime;
    for (let i = 0; i < pos.count; i++) {
      const bx = base[i * 3];
      const phase = bx * 4 - t * 3.2;
      const amp = 0.08 * bx; // pinned at the pole, freer toward the tip
      pos.setZ(i, Math.sin(phase) * amp);
      pos.setY(i, base[i * 3 + 1] + Math.sin(bx * 3 - t * 2.4) * 0.02 * bx);
      // the surface is z = f(x): its normal is (-f'(x), 0, 1), normalised
      const slope = 0.08 * Math.sin(phase) + amp * 4 * Math.cos(phase);
      const len = Math.sqrt(slope * slope + 1);
      nor.setXYZ(i, -slope / len, 0, 1 / len);
    }
    pos.needsUpdate = true;
    nor.needsUpdate = true;
  });

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group position={[HERO.flag.x, 0, HERO.flag.z]} rotation={[0, HERO.flag.ry, 0]}>
      <mesh geometry={geometry} position={[0.05, POLE_H - CLOTH_H / 2 - 0.01, 0]} castShadow>
        {/* muted terracotta: a cream cloth vanished against the clouds behind it */}
        <meshStandardMaterial color={PALETTE.roof[0]} side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
    </group>
  );
}

/**
 * The first stop: Ezra's name in punchable voxel letters at the back, a board with where he is and what he builds at
 * the front right, a tree and a flag. The front rim stays clear: Ezra sits there (Ezra.tsx, runtime.seat).
 */
export function HeroIsland({ placement }: { placement: IslandPlacement }) {
  const blocks = useMemo(
    () => [...treeBlocks(HERO.tree.x, HERO.tree.z, HERO.tree.h, HERO.tree.seed), ...FLOWERS, ...POLE],
    [],
  );
  return (
    <>
      <group position={islandFrame(placement)}>
        <PropBlocks blocks={blocks} seed={101} />
        <FlagCloth />
      </group>
      <InfoBoard placement={placement} at={HERO.info} rotationY={HERO.info.ry} title={worldCopy.location} lines={[worldCopy.heroLine]} />
      <VoxelTitle id="hero-title" placement={placement} at={HERO.title} lines={HERO.title.lines} cell={HERO.title.cell} color="#4a3626" />
    </>
  );
}
