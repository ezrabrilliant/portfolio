import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { mulberry32 } from "@/world/engine/gen/rng";
import { playSfx } from "@/world/engine/audio/sfx";
import { Interactable } from "@/world/scene/Interactable";
import { useWorld } from "@/world/state/store";
import { ORBIT } from "./layouts";
import { CANVAS_FONTS } from "./shared/canvasFonts";
import { disposeObject } from "./shared/dispose";
import { InfoBoard } from "./shared/InfoBoard";
import { MapBoard } from "./shared/MapBoard";
import { Signpost } from "./shared/Signpost";
import { PropBlocks } from "./shared/PropBlocks";
import { PALETTE, type PropBlock } from "./shared/props";
import { islandFrame, worldTuple } from "./shared/local";
import { projectById } from "./shared/project";
import { useCanvasTexture } from "./shared/useCanvasTexture";
import { useHoverLift } from "./shared/useHoverLift";
import { createOrbitLogoTile } from "./orbit/logo";
import { drawReceipt, nextOrder, receiptLines, type ReceiptOrder } from "./orbit/receipt";

function stallBlocks(): PropBlock[] {
  const out: PropBlock[] = [];
  for (const [x, z] of [[-1.45, -0.9], [1.45, -0.9], [-1.45, 0.9], [1.45, 0.9]] as const) {
    out.push({ x, y: 1.4, z, c: PALETTE.wood, sx: 0.2, sy: 2.8, sz: 0.2 });
  }
  out.push({ x: 0, y: 0.5, z: 0.45, c: PALETTE.plank[0], sx: 2.9, sy: 1.0, sz: 0.9 }); // counter
  out.push({ x: 0, y: 1.06, z: 0.45, c: PALETTE.wood, sx: 3.2, sy: 0.13, sz: 1.1 }); // counter top
  for (let i = 0; i < 6; i++) {
    out.push({ x: -1.375 + i * 0.55, y: 2.92, z: 0, c: i % 2 ? PALETTE.white : PALETTE.blue, sx: 0.55, sy: 0.12, sz: 2.5, rx: 0.32 }); // awning
  }
  for (const x of [-1.45, 1.45]) out.push({ x, y: 3.12, z: -0.9, c: PALETTE.wood, sx: 0.18, sy: 0.95, sz: 0.18 });
  out.push({ x: 0, y: 3.6, z: -0.9, c: PALETTE.wood, sx: 3.1, sy: 0.18, sz: 0.2 }); // sign beam
  for (const x of [-0.75, 0.75]) out.push({ x, y: 3.9, z: -0.9, c: PALETTE.wood, sx: 0.16, sy: 0.5, sz: 0.16 });
  for (const c of ORBIT.crates) out.push({ x: c.x, y: c.stack + c.s / 2, z: c.z, c: PALETTE.crate[0], sx: c.s, sy: c.s, sz: c.s, ry: c.ry });
  out.push({ x: -0.35, y: 1.83, z: 0.57, c: "#efeee9", sx: 1.3, sy: 1.5, sz: 0.08 }); // QRIS board backing
  // thermal printer at the counter's front edge: the receipt (ORBIT.receipt, z 1.03) leaves its slot and hangs past the counter
  out.push({ x: 0.95, y: 1.32, z: 0.74, c: "#2b2f36", sx: 0.7, sy: 0.4, sz: 0.55 });
  out.push({ x: 0.95, y: 1.18, z: 1.012, c: PALETTE.blue, sx: 0.72, sy: 0.06, sz: 0.02 }); // printer stripe, behind the paper
  out.push({ x: 0.95, y: 1.44, z: 1.02, c: "#111317", sx: 0.5, sy: 0.03, sz: 0.01 }); // paper slot
  return out;
}

function drawQris(g: CanvasRenderingContext2D, w: number, h: number) {
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#3D62F8";
  g.fillRect(0, 0, w, 92);
  g.fillStyle = "#ffffff";
  g.font = `700 36px ${CANVAS_FONTS.ui}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("ORBIT STORE", w / 2, 48);
  const n = 25, ms = 13, ox = (w - n * ms) / 2, oy = 122, r = mulberry32(77);
  g.fillStyle = "#16181d";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const finder = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
      if (!finder && r() > 0.52) g.fillRect(ox + x * ms, oy + y * ms, ms, ms);
    }
  }
  const finder = (cx: number, cy: number) => {
    g.fillStyle = "#16181d";
    g.fillRect(ox + cx * ms, oy + cy * ms, 7 * ms, 7 * ms);
    g.fillStyle = "#ffffff";
    g.fillRect(ox + (cx + 1) * ms, oy + (cy + 1) * ms, 5 * ms, 5 * ms);
    g.fillStyle = "#16181d";
    g.fillRect(ox + (cx + 2) * ms, oy + (cy + 2) * ms, 3 * ms, 3 * ms);
  };
  finder(0, 0);
  finder(n - 7, 0);
  finder(0, n - 7);
  g.fillStyle = "#16181d";
  g.font = `700 64px ${CANVAS_FONTS.ui}`;
  g.fillText("QRIS", w / 2, 528);
  g.textAlign = "left";
}

const RECEIPT_PX = 360;
const RECEIPT_PY = Math.round((RECEIPT_PX * ORBIT.receipt.maxLen) / ORBIT.receipt.w); // square texels on the paper
const PARCEL_GEO = new THREE.BoxGeometry(0.5, 0.42, 0.5);
const TAPE_GEO = new THREE.BoxGeometry(0.52, 0.44, 0.1);

export function OrbitStoreIsland({ placement }: { placement: IslandPlacement }) {
  const blocks = useMemo(stallBlocks, []);
  const project = projectById("orbit-store");
  const logo = useMemo(() => createOrbitLogoTile(), []);
  useEffect(() => () => disposeObject(logo), [logo]);

  const qris = useCanvasTexture(512, 600, drawQris, []);
  const [order, setOrder] = useState<ReceiptOrder>(() => nextOrder(null, new Date()));
  const receipt = useCanvasTexture(RECEIPT_PX, RECEIPT_PY, (ctx, w, h) => drawReceipt(ctx, receiptLines(order), w, h), [order]);
  const paper = useRef<THREE.Mesh>(null);
  const feed = useRef({ len: 0.35 }); // partly fed while idle
  const parcel = useRef<THREE.Group>(null);
  const hop = useRef(-1); // parcel flight time; < 0 = hidden
  const lift = useHoverLift("orbit-stall");
  const { x: rx, y: ry, z: rz, w: rw, maxLen } = ORBIT.receipt;

  const print = useCallback(() => {
    playSfx("print");
    setOrder((o) => nextOrder(o.no, new Date()));
    const reduced = useWorld.getState().reducedMotion;
    feed.current.len = reduced ? maxLen : 0;
    if (!reduced) hop.current = 0;
  }, [maxLen]);

  // Print once whenever the tour or the player arrives at the island.
  useEffect(
    () =>
      useWorld.subscribe((s, prev) => {
        if (s.activeIsland === "orbit-store" && prev.activeIsland !== "orbit-store") print();
      }),
    [print],
  );

  useFrame(({ clock }, dt) => {
    const f = feed.current;
    if (f.len < maxLen) {
      const stepping = Math.floor(clock.elapsedTime * 10) % 2 === 0 ? 1 : 0.25; // thermal printers feed in steps
      f.len = Math.min(maxLen, f.len + dt * 0.75 * stepping);
    }
    const m = paper.current;
    if (m) {
      m.scale.y = Math.max(0.001, f.len);
      receipt.repeat.set(1, f.len / maxLen);
      receipt.offset.set(0, 1 - f.len / maxLen);
    }
    const p = parcel.current;
    if (p) {
      if (hop.current < 0) {
        p.visible = false;
      } else {
        hop.current += dt;
        const t = hop.current;
        p.visible = t < 3;
        // handed over the counter's front-right corner (clear of the paper, post and awning edge), then off the rim
        p.position.set(1.45 + t * 1.2, 1.4 + 7 * t - 4 * t * t, 1.4 + t * 3.4);
        p.rotation.set(t * 1.2, t * 2, 0);
        p.scale.setScalar(Math.min(1, 0.2 + t * 8));
        if (t >= 3) hop.current = -1;
      }
    }
  });

  const paperGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(rw, 1);
    g.translate(0, -0.5, 0); // top edge at the origin, grows downward
    return g;
  }, [rw]);
  useEffect(() => () => paperGeo.dispose(), [paperGeo]);

  return (
    <>
      <group position={islandFrame(placement)}>
        <group ref={lift}>
          <PropBlocks blocks={blocks} seed={404} />
          <mesh position={[-0.35, 1.86, 0.62]} rotation={[-0.08, 0, 0]} castShadow>
            <planeGeometry args={[1.2, 1.41]} />
            <meshStandardMaterial map={qris} roughness={0.7} />
          </mesh>
          <mesh ref={paper} geometry={paperGeo} position={[rx, ry, rz]}>
            <meshStandardMaterial map={receipt} roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
        </group>
        <primitive object={logo} position={[0, ORBIT.logo.y, ORBIT.logo.z]} />
        <group ref={parcel} visible={false}>
          <mesh geometry={PARCEL_GEO} castShadow>
            <meshStandardMaterial color="#c69f6e" roughness={0.95} />
          </mesh>
          <mesh geometry={TAPE_GEO}>
            <meshStandardMaterial color={PALETTE.blue} roughness={0.8} />
          </mesh>
        </group>
      </group>
      <Interactable
        id="orbit-stall"
        island={placement.id}
        label="Print a receipt"
        position={worldTuple(placement, 0, 1.3, 0.2)}
        size={[3.2, 2.6, 2.0]}
        radius={3}
        onActivate={print}
      />
      <InfoBoard placement={placement} at={ORBIT.info} rotationY={ORBIT.info.ry} title={ORBIT.info.title} lines={project.stats ?? []} />
      <Signpost id="orbit-link" placement={placement} at={ORBIT.link} rotationY={ORBIT.link.ry} label="Visit Orbit Store" url={project.links.demo} />
      <MapBoard placement={placement} at={ORBIT.map} />
    </>
  );
}
