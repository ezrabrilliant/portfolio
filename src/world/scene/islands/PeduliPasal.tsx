import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { useWorld } from "@/world/state/store";
import { LiveScreen } from "@/world/scene/screens/LiveScreen";
import { chatApp } from "@/world/scene/screens/chat";
import { MINI_BOARD_SCALE, MINI_SIGN_SCALE, PEDULI } from "./layouts";
import { InfoBoard } from "./shared/InfoBoard";
import { MapBoard } from "./shared/MapBoard";
import { BRASS, SCALES_Y, pavilionBlocks, phoneBody } from "./peduli/blocks";
import { PropBlocks } from "./shared/PropBlocks";
import { Signpost } from "./shared/Signpost";
import { islandFrame } from "./shared/local";
import { projectById } from "./shared/project";
import { miniBoardLines } from "./shared/text";

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

// RoundedBoxGeometry clamps its radius to half the smallest side: the phone's corners round by half its depth
const PHONE_GEO = new RoundedBoxGeometry(PEDULI.phone.w, PEDULI.phone.h, PEDULI.phone.d, 3, PEDULI.phone.d / 2);
/** The phone's body on its plinth (layouts.test checks the boards and signs against the same box). */
const PHONE_BODY = phoneBody();
const PHONE_MAT = new THREE.MeshStandardMaterial({ color: "#1b1c20", roughness: 0.45 });

/**
 * PeduliPasal (spec §4): a reading pavilion with a shelf of statute books and the scales of justice, a giant phone on a
 * stone plinth whose screen is the app's chat, a tree, the board and the "Get the APK" sign.
 */
export function PeduliPasalIsland({ placement }: { placement: IslandPlacement }) {
  const blocks = useMemo(pavilionBlocks, []);
  const project = projectById("pedulipasal");
  const { screen } = PEDULI;
  return (
    <>
      <group position={islandFrame(placement)}>
        <PropBlocks blocks={blocks} seed={808} />
        <Scales />
        <mesh geometry={PHONE_GEO} material={PHONE_MAT} position={[PHONE_BODY.x, PHONE_BODY.y, PHONE_BODY.z]} castShadow />
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
      <MapBoard placement={placement} at={PEDULI.map} />
    </>
  );
}
