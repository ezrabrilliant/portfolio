import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { useWorld } from "@/world/state/store";
import { LiveScreen } from "@/world/scene/screens/LiveScreen";
import { crmApp } from "@/world/scene/screens/crm";
import { BEE, MINI_BOARD_SCALE, MINI_SIGN_SCALE, beeRoofPlanks, beeRoofY } from "./layouts";
import { InfoBoard } from "./shared/InfoBoard";
import { MapBoard } from "./shared/MapBoard";
import { PropBlocks } from "./shared/PropBlocks";
import { Signpost } from "./shared/Signpost";
import { islandFrame } from "./shared/local";
import { PALETTE, type PropBlock } from "./shared/props";
import { projectById } from "./shared/project";
import { miniBoardLines } from "./shared/text";

const CHAIR = "#c79a62";
const CHAIR_DARK = "#a87b4c";
const STAND = "#2b2e33";

/** Plank floor, back and left walls, posts, the sloped roof, the workbench with a half-built chair and a saw, the logs, the monitor stand. */
function shedBlocks(): PropBlock[] {
  const { shed, bench, logs, monitor, screen } = BEE;
  const out: PropBlock[] = [];
  for (let x = shed.x0; x <= shed.x1; x++) for (let z = shed.z0; z <= shed.z1; z++) out.push({ x, y: 0.06, z, c: PALETTE.plank[1], sy: 0.12 });
  for (let x = shed.x0; x <= shed.x1; x++) for (let row = 0; row < shed.rows; row++) {
    out.push({ x, y: row + 0.5, z: shed.z0 - 0.35, c: PALETTE.plank[0], sz: 0.2 }); // back wall
  }
  for (let z = shed.z0; z <= shed.z1; z++) for (let row = 0; row < shed.rows; row++) {
    // left wall: its top row stops at the roof line over the cell's front edge (a full row poked through the slope)
    const top = Math.min(row + 1, beeRoofY(z + 0.5));
    out.push({ x: shed.x0 - 0.35, y: (row + top) / 2, z, c: PALETTE.plank[0], sx: 0.2, sy: top - row });
  }
  out.push({ x: shed.x1 + 0.4, y: 1.55, z: shed.z0 - 0.35, c: PALETTE.wood, sx: 0.2, sy: 3.1, sz: 0.2 });
  out.push({ x: shed.x0 - 0.4, y: 1.35, z: shed.z1 + 0.4, c: PALETTE.wood, sx: 0.2, sy: 2.7, sz: 0.2 });
  out.push({ x: shed.x1 + 0.4, y: 1.35, z: shed.z1 + 0.4, c: PALETTE.wood, sx: 0.2, sy: 2.7, sz: 0.2 });
  for (const [i, p] of beeRoofPlanks().entries()) out.push({ ...p, c: PALETTE.roof[i % 3] });
  // workbench against the back wall
  out.push({ x: bench.x, y: 0.86, z: bench.z, c: PALETTE.plank[0], sx: 1.8, sy: 0.12, sz: 0.7 });
  for (const dx of [-0.8, 0.8]) for (const dz of [-0.25, 0.25]) out.push({ x: bench.x + dx, y: 0.4, z: bench.z + dz, c: PALETTE.wood, sx: 0.1, sy: 0.8, sz: 0.1 });
  // a half-built chair on it: seat, legs, two back posts and one rail (the second rail still missing). It stands on the
  // bench's right end, the part the desktop tour view sees between the sign's arrow and the monitor.
  const cx = bench.x + 0.45;
  out.push({ x: cx, y: 1.08, z: bench.z, c: CHAIR, sx: 0.5, sy: 0.06, sz: 0.46 });
  for (const dx of [-0.2, 0.2]) for (const dz of [-0.18, 0.18]) out.push({ x: cx + dx, y: 0.98, z: bench.z + dz, c: CHAIR_DARK, sx: 0.06, sy: 0.2, sz: 0.06 });
  for (const dx of [-0.2, 0.2]) out.push({ x: cx + dx, y: 1.36, z: bench.z - 0.2, c: CHAIR_DARK, sx: 0.06, sy: 0.5, sz: 0.06 });
  out.push({ x: cx, y: 1.5, z: bench.z - 0.2, c: CHAIR, sx: 0.5, sy: 0.08, sz: 0.05 });
  // hand saw hung on the back wall over the bench's left end (lying on the bench, the sign hid it in the desktop view):
  // blade and handle, tilted a little on their nail, just off the wall's front face (z0 − 0.25)
  const saw = { x: bench.x - 0.4, y: 1.35, z: shed.z0 - 0.23, tilt: 0.12 };
  out.push({ x: saw.x, y: saw.y, z: saw.z, c: "#9aa0a6", sx: 0.6, sy: 0.16, sz: 0.03, rz: saw.tilt });
  out.push({ x: saw.x - 0.33 * Math.cos(saw.tilt), y: saw.y - 0.33 * Math.sin(saw.tilt), z: saw.z + 0.01, c: PALETTE.wood, sx: 0.14, sy: 0.12, sz: 0.05, rz: saw.tilt });
  // log pile outside the left wall
  for (const [dx, y] of [[-0.18, 0.19], [0.18, 0.19], [0, 0.53]] as const) {
    out.push({ x: logs.x + dx, y, z: logs.z, c: dx === 0 ? "#86643f" : "#7a5a3c", sx: 0.36, sy: 0.36, sz: 0.9 });
  }
  // monitor stand: base and column up to the screen's bezel
  const bottom = screen.y - screen.h / 2;
  out.push({ x: monitor.x, y: 0.06, z: monitor.z, c: STAND, sx: 0.9, sy: 0.12, sz: 0.5 });
  out.push({ x: monitor.x, y: bottom / 2, z: screen.z - 0.2, c: STAND, sx: 0.14, sy: bottom, sz: 0.14 });
  return out;
}

const BEE_BODY = (() => {
  const c = new THREE.Color();
  const parts = (
    [
      [0.24, 0.17, 0.17, 0, 0, "#e3b23c"],
      [0.04, 0.18, 0.18, -0.04, 0, "#2b2420"],
      [0.04, 0.18, 0.18, 0.06, 0, "#2b2420"],
    ] as const
  ).map(([w, h, d, x, y, colour]) => {
    const g = new THREE.BoxGeometry(w, h, d).translate(x, y, 0);
    c.set(colour);
    const n = g.attributes.position.count;
    const rgb = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) rgb.set([c.r, c.g, c.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(rgb, 3));
    return g;
  });
  const merged = mergeGeometries(parts);
  for (const g of parts) g.dispose();
  if (!merged) throw new Error("BeeCrm: could not merge the bee");
  return merged;
})();
const BEE_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
const WINGS = (() => {
  const a = new THREE.PlaneGeometry(0.14, 0.2).rotateX(Math.PI / 2).translate(0, 0.1, 0.1);
  const b = new THREE.PlaneGeometry(0.14, 0.2).rotateX(Math.PI / 2).translate(0, 0.1, -0.1);
  const merged = mergeGeometries([a, b]);
  a.dispose();
  b.dispose();
  if (!merged) throw new Error("BeeCrm: could not merge the wings");
  return merged;
})();
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
