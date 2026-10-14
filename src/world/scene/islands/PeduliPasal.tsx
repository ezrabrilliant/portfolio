import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { mulberry32 } from "@/world/engine/gen/rng";
import { useWorld } from "@/world/state/store";
import { LiveScreen } from "@/world/scene/screens/LiveScreen";
import { chatApp } from "@/world/scene/screens/chat";
import { MINI_BOARD_SCALE, MINI_SIGN_SCALE, PEDULI } from "./layouts";
import { InfoBoard } from "./shared/InfoBoard";
import { PropBlocks } from "./shared/PropBlocks";
import { Signpost } from "./shared/Signpost";
import { islandFrame } from "./shared/local";
import { PALETTE, treeBlocks, type PropBlock } from "./shared/props";
import { projectById } from "./shared/project";
import { miniBoardLines } from "./shared/text";

const SPINES = ["#7a3b34", "#2f4a6b", "#4f6b45", "#8a6a3a", "#5b4a6b", "#a8a296", "#6b3a2e", "#3f5a73"];
const BRASS = "#b8975a";
const SCALES_Y = 1.26; // the beam's pivot above the grass, on its post

/** Stone floor, four posts, the flat roof, the bookshelf of statute books, the scales' table and post, the plinth, the tree. */
function pavilionBlocks(): PropBlock[] {
  const { pavilion, shelf, scales, phone, tree } = PEDULI;
  const out: PropBlock[] = [];
  for (let x = pavilion.x0; x <= pavilion.x1; x++) for (let z = pavilion.z0; z <= pavilion.z1; z++) {
    out.push({ x, y: 0.06, z, c: PALETTE.stone[1], sy: 0.12 });
  }
  for (const x of [pavilion.x0 - 0.4, pavilion.x1 + 0.4]) for (const z of [pavilion.z0 - 0.4, pavilion.z1 + 0.4]) {
    out.push({ x, y: 1.6, z, c: PALETTE.wood, sx: 0.2, sy: 3.2, sz: 0.2 });
  }
  const cx = (pavilion.x0 + pavilion.x1) / 2;
  const cz = (pavilion.z0 + pavilion.z1) / 2;
  out.push({ x: cx, y: 3.31, z: cz, c: "#6f6157", sx: 3.6, sy: 0.22, sz: 2.6 });
  out.push({ x: cx, y: 3.52, z: cz, c: "#83756a", sx: 3.0, sy: 0.2, sz: 2.0 });
  out.push({ x: shelf.x, y: shelf.h / 2, z: shelf.z, c: PALETTE.wood, sx: shelf.w, sy: shelf.h, sz: 0.5 });
  const r = mulberry32(88);
  for (let s = 0; s < 3; s++) {
    let x = shelf.x - shelf.w / 2 + 0.1;
    while (x < shelf.x + shelf.w / 2 - 0.25) {
      const w = 0.12 + r() * 0.1;
      const h = 0.42 + r() * 0.16;
      out.push({ x: x + w / 2, y: 0.3 + s * 0.68 + h / 2, z: shelf.z + 0.12, c: SPINES[Math.floor(r() * SPINES.length)], sx: w, sy: h, sz: 0.32 });
      x += w + 0.02;
    }
  }
  out.push({ x: scales.x, y: 0.55, z: scales.z, c: PALETTE.plank[0], sx: 0.9, sy: 0.1, sz: 0.7 });
  out.push({ x: scales.x, y: 0.25, z: scales.z, c: PALETTE.wood, sx: 0.12, sy: 0.5, sz: 0.12 });
  out.push({ x: scales.x, y: 0.62, z: scales.z, c: BRASS, sx: 0.3, sy: 0.05, sz: 0.2 });
  out.push({ x: scales.x, y: (0.62 + SCALES_Y) / 2, z: scales.z, c: BRASS, sx: 0.06, sy: SCALES_Y - 0.62, sz: 0.06 });
  out.push({ x: phone.x, y: phone.plinth / 2, z: phone.z, c: PALETTE.stone[0], sx: 1.6, sy: phone.plinth, sz: 0.9 });
  out.push(...treeBlocks(tree.x, tree.z, tree.h, tree.seed));
  return out;
}

const BRASS_MAT = new THREE.MeshStandardMaterial({ color: BRASS, roughness: 0.4, metalness: 0.5 });
const BEAM_GEO = new THREE.BoxGeometry(0.7, 0.04, 0.04);
const PAN_GEO = new THREE.BoxGeometry(0.22, 0.03, 0.22);
const CORD_GEO = new THREE.BoxGeometry(0.02, 0.22, 0.02);

/** The scales of justice: the beam tilts gently, the pans stay level (still under reduced motion). */
function Scales() {
  const beam = useRef<THREE.Group>(null);
  const pans = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const a = useWorld.getState().reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.8) * 0.12;
    if (beam.current) beam.current.rotation.z = a;
    for (const p of pans.current) if (p) p.rotation.z = -a;
  });
  const { x, z } = PEDULI.scales;
  return (
    <group ref={beam} position={[x, SCALES_Y, z]}>
      <mesh geometry={BEAM_GEO} material={BRASS_MAT} />
      {[-0.33, 0.33].map((px, i) => (
        <group key={px} position={[px, 0, 0]} ref={(g) => { pans.current[i] = g; }}>
          <mesh geometry={CORD_GEO} material={BRASS_MAT} position={[0, -0.11, 0]} />
          <mesh geometry={PAN_GEO} material={BRASS_MAT} position={[0, -0.23, 0]} />
        </group>
      ))}
    </group>
  );
}

const PHONE_GEO = new RoundedBoxGeometry(PEDULI.phone.w, PEDULI.phone.h, 0.16, 3, 0.14);
const PHONE_MAT = new THREE.MeshStandardMaterial({ color: "#1b1c20", roughness: 0.45 });

/**
 * PeduliPasal (spec §4): a reading pavilion with a shelf of statute books and the scales of justice, a giant phone on a
 * stone plinth whose screen is the app's chat, a tree, the board and the "Get the APK" sign.
 */
export function PeduliPasalIsland({ placement }: { placement: IslandPlacement }) {
  const blocks = useMemo(pavilionBlocks, []);
  const project = projectById("pedulipasal");
  const { phone, screen } = PEDULI;
  return (
    <>
      <group position={islandFrame(placement)}>
        <PropBlocks blocks={blocks} seed={808} />
        <Scales />
        <mesh geometry={PHONE_GEO} material={PHONE_MAT} position={[phone.x, phone.plinth + phone.h / 2, phone.z]} castShadow />
      </group>
      <LiveScreen
        id="pedulipasal-screen"
        placement={placement}
        app={chatApp}
        label="Use the app"
        at={{ x: screen.x, y: screen.y, z: screen.z }}
        size={{ w: screen.w, h: screen.h }}
        frame="none"
      />
      <InfoBoard
        placement={placement}
        at={PEDULI.info}
        rotationY={PEDULI.info.ry}
        scale={MINI_BOARD_SCALE}
        title={project.title}
        lines={miniBoardLines(project)}
      />
      <Signpost id="pedulipasal-link" placement={placement} at={PEDULI.link} rotationY={PEDULI.link.ry} scale={MINI_SIGN_SCALE} label="Get the APK" url={project.links.demo} />
    </>
  );
}
