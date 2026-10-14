import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { useWorld } from "@/world/state/store";
import { LiveScreen } from "@/world/scene/screens/LiveScreen";
import { crmApp } from "@/world/scene/screens/crm";
import { bakeBoxes, mergeBaked } from "@/world/scene/shared/bake";
import { BEE, MINI_BOARD_SCALE, MINI_SIGN_SCALE } from "./layouts";
import { shedBlocks } from "./bee/blocks";
import { InfoBoard } from "./shared/InfoBoard";
import { MapBoard } from "./shared/MapBoard";
import { PropBlocks } from "./shared/PropBlocks";
import { Signpost } from "./shared/Signpost";
import { islandFrame } from "./shared/local";
import { projectById } from "./shared/project";
import { miniBoardLines } from "./shared/text";

/** The bee's body (yellow, two dark stripes) in one vertex-coloured geometry. */
const BEE_BODY = bakeBoxes(
  [
    [0.24, 0.17, 0.17, 0, 0, 0, "#e3b23c"],
    [0.04, 0.18, 0.18, -0.04, 0, 0, "#2b2420"],
    [0.04, 0.18, 0.18, 0.06, 0, 0, "#2b2420"],
  ],
  "the bee",
);
const BEE_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
/** Both wings in one geometry (one colour, from WING_MAT). */
const WINGS = mergeBaked(
  [0.1, -0.1].map((z) => new THREE.PlaneGeometry(0.14, 0.2).rotateX(Math.PI / 2).translate(0, 0.1, z)),
  "the bee's wings",
);
const WING_MAT = new THREE.MeshStandardMaterial({ color: "#ffffff", transparent: true, opacity: 0.75, roughness: 0.4, side: THREE.DoubleSide });

/** The bee: a figure-eight over the shed roof, wings beating (held still under reduced motion). */
function BuzzingBee() {
  const bug = useRef<THREE.Group>(null);
  const wings = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const g = bug.current;
    if (!g || !wings.current) return;
    const t = useWorld.getState().reducedMotion ? 1.2 : clock.elapsedTime;
    const { x, y, z, ax, az, ay } = BEE.bee;
    g.position.set(x + Math.sin(t * 0.9) * ax, y + Math.sin(t * 2.1) * ay, z + Math.sin(t * 1.8) * az);
    g.rotation.y = -Math.atan2(Math.cos(t * 1.8) * 1.8 * az, Math.cos(t * 0.9) * 0.9 * ax);
    wings.current.scale.z = 0.4 + 0.6 * Math.abs(Math.sin(t * 60));
  });
  return (
    <group ref={bug}>
      <mesh geometry={BEE_BODY} material={BEE_MAT} />
      <mesh ref={wings} geometry={WINGS} material={WING_MAT} />
    </group>
  );
}

/**
 * Bee Furniture CRM (spec §4): a woodworking shed (workbench with a half-built chair and a saw, logs), the CRM admin
 * dashboard on a monitor stand in front of its open side, a bee buzzing about, the board and the demo sign (inactive
 * until the demo ships).
 */
export function BeeCrmIsland({ placement }: { placement: IslandPlacement }) {
  const blocks = useMemo(shedBlocks, []);
  const project = projectById("bee-furniture-crm");
  const { screen } = BEE;
  return (
    <>
      <group position={islandFrame(placement)}>
        <PropBlocks blocks={blocks} seed={707} />
        <BuzzingBee />
      </group>
      <LiveScreen
        id="bee-crm-screen"
        placement={placement}
        app={crmApp}
        label="Use the CRM"
        at={{ x: screen.x, y: screen.y, z: screen.z }}
        size={{ w: screen.w, h: screen.h }}
        bezelColor="#1d2024"
      />
      <InfoBoard
        placement={placement}
        at={BEE.info}
        rotationY={BEE.info.ry}
        scale={MINI_BOARD_SCALE}
        title={project.title}
        lines={miniBoardLines(project)}
      />
      <Signpost id="bee-crm-link" placement={placement} at={BEE.link} rotationY={BEE.link.ry} scale={MINI_SIGN_SCALE} label="Try the CRM" url={project.links.demo} />
      <MapBoard placement={placement} at={BEE.map} />
    </>
  );
}
