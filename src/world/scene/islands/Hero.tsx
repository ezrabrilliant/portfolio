import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { worldCopy } from "@/config/portfolio";
import { useWorld } from "@/world/state/store";
import { HERO } from "./layouts";
import { VoxelTitle } from "./VoxelTitle";
import { InfoBoard } from "./shared/InfoBoard";
import { MapBoard } from "./shared/MapBoard";
import { PropBlocks } from "./shared/PropBlocks";
import { islandFrame } from "./shared/local";
import { POLE_H, CLOTH_W, CLOTH_H, FLOWERS, POLE } from "./hero/blocks";
import { PALETTE, treeBlocks } from "./shared/props";


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
      <MapBoard placement={placement} at={HERO.map} />
    </>
  );
}
