import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { useWorld } from "@/world/state/store";
import { LiveScreen } from "@/world/scene/screens/LiveScreen";
import { posApp } from "@/world/scene/screens/pos";
import { MINI_BOARD_SCALE, MINI_SIGN_SCALE, MONOSUKO } from "./layouts";
import { GRILL_TOP, stallBlocks } from "./monosuko/blocks";
import { InfoBoard } from "./shared/InfoBoard";
import { MapBoard } from "./shared/MapBoard";
import { PropBlocks } from "./shared/PropBlocks";
import { Signpost } from "./shared/Signpost";
import { islandFrame } from "./shared/local";
import { PALETTE } from "./shared/props";
import { projectById } from "./shared/project";
import { miniBoardLines } from "./shared/text";

const LOGO_URL = "/world/monosuko/logo.webp";
const DISC_GEO = new THREE.CylinderGeometry(MONOSUKO.logo.r, MONOSUKO.logo.r, 0.12, 40);
const DISC_MAT = new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.9 });

/** The restaurant's round badge, standing on the awning (the logo Part B ships for the POS screen). */
function LogoBadge() {
  const texture = useMemo(() => {
    const t = new THREE.TextureLoader().load(LOGO_URL);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  const { x, y, z, r } = MONOSUKO.logo;
  return (
    <group position={[x, y, z]}>
      <mesh geometry={DISC_GEO} material={DISC_MAT} rotation={[Math.PI / 2, 0, 0]} castShadow />
      {/* logo.webp is transparent around the drawing (WebP keeps junk colours under alpha 0): a cream face, the logo alpha-tested on it */}
      <mesh position={[0, 0, 0.062]}>
        <circleGeometry args={[r - 0.08, 40]} />
        <meshStandardMaterial color="#f7f1e3" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0, 0.066]}>
        <circleGeometry args={[r - 0.08, 40]} />
        <meshStandardMaterial map={texture} roughness={0.8} alphaTest={0.35} />
      </mesh>
    </group>
  );
}

const PUFFS = 7;
const PUFF_GEO = new THREE.BoxGeometry(1, 1, 1);
// a light warm grey: off-white puffs vanished against the white cloud floor behind the island
const PUFF_MAT = new THREE.MeshStandardMaterial({ color: "#cbc3b8", roughness: 1, transparent: true, opacity: 0.62, depthWrite: false });

/** Wisps of smoke off the grill: seven small puffs in one instanced draw, rising under the screen and drifting right as they fade. */
function Smoke() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3() }), []);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    // reduced motion: the puffs hold still mid-rise
    const t = useWorld.getState().reducedMotion ? 0.4 : clock.elapsedTime;
    const { x, z } = MONOSUKO.grill;
    for (let i = 0; i < PUFFS; i++) {
      const o = i / PUFFS;
      const k = (t * 0.35 + o) % 1;
      tmp.p.set(x + k * 0.45 + Math.sin(k * 7 + o * 9) * 0.08, GRILL_TOP + 0.08 + k * 0.7, z + 0.1 + k * 0.25);
      tmp.s.setScalar((0.08 + k * 0.14) * Math.min(1, (1 - k) * 4));
      mesh.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.q, tmp.s));
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[PUFF_GEO, PUFF_MAT, PUFFS]} frustumCulled={false} />;
}

/**
 * POS Monosuko (spec §4): a small grilled-chicken stall with the POS cashier screen on its back wall above the counter,
 * the restaurant's badge over the awning, smoke off the grill, a table with two stools, the board and the demo sign
 * (inactive until the demo ships).
 */
export function PosMonosukoIsland({ placement }: { placement: IslandPlacement }) {
  const blocks = useMemo(stallBlocks, []);
  const project = projectById("pos-monosuko");
  const { screen } = MONOSUKO;
  return (
    <>
      <group position={islandFrame(placement)}>
        <PropBlocks blocks={blocks} seed={606} />
        <LogoBadge />
        <Smoke />
      </group>
      <LiveScreen
        id="pos-monosuko-screen"
        placement={placement}
        app={posApp}
        label="Use the POS"
        at={{ x: screen.x, y: screen.y, z: screen.z }}
        size={{ w: screen.w, h: screen.h }}
      />
      <InfoBoard
        placement={placement}
        at={MONOSUKO.info}
        rotationY={MONOSUKO.info.ry}
        scale={MINI_BOARD_SCALE}
        title={project.title}
        lines={miniBoardLines(project)}
      />
      <Signpost id="pos-monosuko-link" placement={placement} at={MONOSUKO.link} rotationY={MONOSUKO.link.ry} scale={MINI_SIGN_SCALE} label="Try the POS" url={project.links.demo} />
      <MapBoard placement={placement} at={MONOSUKO.map} />
    </>
  );
}
