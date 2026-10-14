import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { useWorld } from "@/world/state/store";
import { LiveScreen } from "@/world/scene/screens/LiveScreen";
import { posApp } from "@/world/scene/screens/pos";
import { MINI_BOARD_SCALE, MINI_SIGN_SCALE, MONOSUKO } from "./layouts";
import { InfoBoard } from "./shared/InfoBoard";
import { PropBlocks } from "./shared/PropBlocks";
import { Signpost } from "./shared/Signpost";
import { islandFrame } from "./shared/local";
import { PALETTE, type PropBlock } from "./shared/props";
import { projectById } from "./shared/project";
import { metaRows } from "./shared/text";

const POS_GREEN = "#1f7a4d";
const AWNING_WHITE = "#efede6";
const GRILL_TOP = 1.36; // chicken pieces on the grate, on the counter top (1.0)

/** Stone floor, plank back wall, posts, counter, the green-and-white awning, the grill, the logo post, table and stools. */
function stallBlocks(): PropBlock[] {
  const { stall, grill, logo, table } = MONOSUKO;
  const out: PropBlock[] = [];
  for (let x = stall.x0; x <= stall.x1; x++) for (let z = stall.wallZ; z <= stall.counterZ + 1; z++) {
    out.push({ x, y: 0.06, z, c: PALETTE.stone[0], sy: 0.12 });
  }
  for (let x = stall.x0; x <= stall.x1; x++) for (let row = 0; row < stall.wallRows; row++) {
    out.push({ x, y: row + 0.5, z: stall.wallZ - 0.3, c: PALETTE.plank[0], sz: 0.2 });
  }
  for (const x of [stall.x0 - 0.4, stall.x1 + 0.4]) for (const z of [stall.wallZ - 0.3, stall.counterZ + 0.4]) {
    out.push({ x, y: 2.2, z, c: PALETTE.wood, sx: 0.2, sy: 4.4, sz: 0.2 });
  }
  out.push({ x: 0, y: 0.44, z: stall.counterZ + 0.05, c: PALETTE.plank[1], sx: 3.0, sy: 0.88, sz: 0.7 }); // counter
  out.push({ x: 0, y: 0.94, z: stall.counterZ + 0.05, c: PALETTE.wood, sx: 3.3, sy: 0.12, sz: 0.9 }); // counter top
  for (let i = 0; i < 6; i++) {
    out.push({ x: -1.5 + i * 0.6, y: 4.5, z: -1.2, c: i % 2 ? AWNING_WHITE : POS_GREEN, sx: 0.6, sy: 0.1, sz: 2.8, rx: 0.16 });
  }
  // a tabletop charcoal grill with chicken pieces on the counter's right end
  out.push({ x: grill.x, y: 1.15, z: grill.z, c: "#4a4d52", sx: 0.7, sy: 0.3, sz: 0.45 });
  out.push({ x: grill.x, y: 1.31, z: grill.z, c: "#2b2d30", sx: 0.62, sy: 0.03, sz: 0.38 });
  for (const [dx, dz] of [[-0.18, -0.06], [0.02, 0.06], [0.2, -0.04]] as const) {
    out.push({ x: grill.x + dx, y: GRILL_TOP, z: grill.z + dz, c: "#8a4a22", sx: 0.18, sy: 0.08, sz: 0.12 });
  }
  out.push({ x: logo.x, y: logo.y - 0.65, z: logo.z - 0.12, c: PALETTE.wood, sx: 0.14, sy: 0.7, sz: 0.14 }); // logo post, behind the badge
  out.push({ x: table.x, y: 0.6, z: table.z, c: PALETTE.plank[0], sx: 1.0, sy: 0.08, sz: 0.7 });
  out.push({ x: table.x, y: 0.28, z: table.z, c: PALETTE.wood, sx: 0.12, sy: 0.56, sz: 0.12 });
  for (const dx of [-0.75, 0.75]) {
    out.push({ x: table.x + dx, y: 0.4, z: table.z, c: PALETTE.wood, sx: 0.36, sy: 0.08, sz: 0.36 });
    out.push({ x: table.x + dx, y: 0.18, z: table.z, c: PALETTE.woodDark, sx: 0.1, sy: 0.36, sz: 0.1 });
  }
  return out;
}

const LOGO_URL = "/world/monosuko/logo.webp";
const DISC_GEO = new THREE.CylinderGeometry(MONOSUKO.logo.r, MONOSUKO.logo.r, 0.12, 40);
const DISC_MAT = new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.9 });

/** The restaurant's round badge on its post above the awning (the logo Part B ships for the POS screen). */
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
const PUFF_MAT = new THREE.MeshStandardMaterial({ color: "#e9e6e0", roughness: 1, transparent: true, opacity: 0.55, depthWrite: false });

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
        lines={[project.line, ...metaRows(project.year, project.tags)]}
      />
      <Signpost id="pos-monosuko-link" placement={placement} at={MONOSUKO.link} rotationY={MONOSUKO.link.ry} scale={MINI_SIGN_SCALE} label="Try the POS" url={project.links.demo} />
    </>
  );
}
