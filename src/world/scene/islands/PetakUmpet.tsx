import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import { playSfx } from "@/world/engine/audio/sfx";
import { Interactable } from "@/world/scene/Interactable";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import type { StarIslandModule } from "./types";
import { FOOTPRINTS, PETAK } from "./layouts";
import { tourStopFor } from "./framing";
import { CANVAS_FONTS } from "./shared/canvasFonts";
import { InfoBoard } from "./shared/InfoBoard";
import { Signpost } from "./shared/Signpost";
import { PropBlocks } from "./shared/PropBlocks";
import { PALETTE, treeBlocks, type PropBlock } from "./shared/props";
import { islandFrame, stampCells, worldOf } from "./shared/local";
import { projectById } from "./shared/project";
import { useCanvasTexture } from "./shared/useCanvasTexture";

/** Stilt house (rumah panggung): corner stilts, plank floor, three wall rows, stepped roof, one front step. */
function houseBlocks(): PropBlock[] {
  const { x0, z0, w, d } = PETAK.house;
  const x1 = x0 + w - 1;
  const z1 = z0 + d - 1;
  const out: PropBlock[] = [];
  for (const x of [x0, x1]) for (const z of [z0, z1]) out.push({ x, y: 0.5, z, c: PALETTE.wood, sx: 0.32, sz: 0.32 });
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) out.push({ x, y: 1.15, z, c: PALETTE.plank[1], sy: 0.3 });
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      const edgeX = x === x0 || x === x1;
      const edgeZ = z === z0 || z === z1;
      if (!edgeX && !edgeZ) continue;
      for (let row = 0; row < 3; row++) {
        let c: string = row % 2 ? PALETTE.plank[0] : PALETTE.plank[1];
        if (edgeX && edgeZ) c = PALETTE.wood;
        if (z === z1 && x === x0 + 1 && row <= 1) c = PALETTE.woodDark; // door
        if (z === z1 && x === x0 + 2 && row === 1) c = PALETTE.glass; // front window
        if (x === x0 && z === z0 + 1 && row === 1) c = PALETTE.glass; // side window
        out.push({ x, y: 1.3 + row + 0.5, z, c });
      }
    }
  }
  const cx = x0 + (w - 1) / 2;
  const cz = z0 + (d - 1) / 2;
  [[w + 1.0, 4.55, d + 1.2], [w, 5.05, d], [w - 1.0, 5.55, d - 1.2], [w - 2.0, 6.0, d - 2.2]].forEach(([sx, y, sz], k) =>
    out.push({ x: cx, y, z: cz, c: PALETTE.roof[k % 3], sx, sy: 0.5, sz }),
  );
  // front steps up to the door (rises 0.43, 0.43, then the floor at 1.3), inside the one footprint cell before it
  out.push(
    { x: x0 + 1, y: 0.215, z: z1 + 1.25, c: PALETTE.plank[0], sx: 0.9, sy: 0.43, sz: 0.4 },
    { x: x0 + 1, y: 0.435, z: z1 + 0.8, c: PALETTE.plank[1], sx: 0.9, sy: 0.87, sz: 0.5 },
  );
  return out;
}

/** Static wood of the lantern posts and the title sign, merged into the island's one PropBlocks draw call. */
function postBlocks(): PropBlock[] {
  const out: PropBlock[] = PETAK.lanterns.flatMap((l) => [
    { x: l.x, y: 1.0, z: l.z, c: PALETTE.wood, sx: 0.1, sy: 2.0, sz: 0.1 },
    { x: l.x + 0.22, y: 1.95, z: l.z, c: PALETTE.wood, sx: 0.5, sy: 0.08, sz: 0.08 },
  ]);
  const { x, z, ry } = PETAK.sign;
  const back = -0.07; // the post stands just behind the board so their front faces never coincide
  out.push(
    { x: x + back * Math.sin(ry), y: 0.75, z: z + back * Math.cos(ry), c: PALETTE.wood, sx: 0.18, sy: 1.5, sz: 0.18, ry },
    { x, y: 1.85, z, c: "#8a6644", sx: 1.9, sy: 0.95, sz: 0.08, ry },
  );
  return out;
}

/** Warm lanterns hanging from the post arms, swaying slowly. */
function Lanterns() {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    if (useWorld.getState().reducedMotion) return;
    refs.current.forEach((g, i) => {
      if (g) g.rotation.z = Math.sin(clock.elapsedTime * 0.7 + i * 1.7) * 0.05;
    });
  });
  return (
    <>
      {PETAK.lanterns.map((l, i) => (
        <group key={`${l.x},${l.z}`} ref={(g) => { refs.current[i] = g; }} position={[l.x + 0.42, 1.92, l.z]}>
          <mesh position={[0, -0.13, 0]} castShadow>
            <boxGeometry args={[0.3, 0.06, 0.3]} />
            <meshStandardMaterial color={PALETTE.woodDark} roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.3, 0]}>
            <boxGeometry args={[0.22, 0.28, 0.22]} />
            <meshStandardMaterial color="#d9893a" emissive="#ff9233" emissiveIntensity={1.0} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function drawSign(g: CanvasRenderingContext2D, w: number, h: number) {
  g.fillStyle = "#b88d5f";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(70, 45, 25, 0.18)";
  for (let y = 64; y < h; y += 64) g.fillRect(0, y - 2, w, 4);
  g.strokeStyle = "#6b4f37";
  g.lineWidth = 12;
  g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = "#3e2b1c"; // little house
  g.beginPath();
  g.moveTo(52, 128);
  g.lineTo(104, 76);
  g.lineTo(156, 128);
  g.closePath();
  g.fill();
  g.fillRect(66, 128, 76, 60);
  g.fillStyle = "#b88d5f";
  g.fillRect(94, 150, 22, 38);
  g.fillStyle = "#f6efe1";
  g.font = `700 58px ${CANVAS_FONTS.ui}`;
  g.textBaseline = "middle";
  g.fillText("PETAK", 186, 100);
  g.fillStyle = "#f3d9a4";
  g.fillText("UMPET", 186, 160);
}

/** The title: the sign face (post and backing board live in PropBlocks). */
function PetakSign() {
  const texture = useCanvasTexture(512, 256, drawSign, []);
  const { x, z, ry } = PETAK.sign;
  return (
    <mesh position={[x + 0.045 * Math.sin(ry), 1.85, z + 0.045 * Math.cos(ry)]} rotation={[0, ry, 0]}>
      <planeGeometry args={[1.86, 0.91]} />
      <meshStandardMaterial map={texture} roughness={0.85} />
    </mesh>
  );
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

type KidState = "peek" | "run" | "hidden" | "back";

/** School-uniform kid peeking from behind the tree; runs to hide behind the house when found or approached. */
function HidingKid({ placement }: { placement: IslandPlacement }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const sim = useRef({ state: "peek" as KidState, t: 0, from: { x: 0, z: 0 } });
  const { home, hide, peek } = PETAK.kid;
  const side = Math.sign(peek); // which side of the trunk he peeks out of (+1 = +x)
  const spot = useMemo(() => worldOf(placement, home.x + peek, 0.7, home.z), [placement, home.x, home.z, peek]);

  const run = () => {
    const k = sim.current;
    if (k.state !== "peek" && k.state !== "back") return;
    const g = root.current;
    k.from = { x: g ? g.position.x : home.x, z: g ? g.position.z : home.z };
    k.state = "run";
    k.t = 0;
    if (head.current) head.current.rotation.y = 0;
    playSfx("step");
  };

  useFrame((_, dt) => {
    const g = root.current;
    if (!g) return;
    const k = sim.current;
    k.t += dt;
    const { reducedMotion, mode } = useWorld.getState();
    const p = runtime.player.pos;
    const dist = Math.hypot(p.x - spot.x, p.z - spot.z);

    if (k.state === "peek") {
      // the peek cycle restarts whenever the kid is back home, so he never pops out mid-peek
      const u = k.t % 6;
      const out = reducedMotion ? 1 : smooth(1.6, 2.4, u) * (1 - smooth(4.2, 5.0, u));
      g.position.set(home.x + out * peek, 0, home.z);
      g.rotation.set(0, 0, -side * out * 0.12); // lean out past the trunk
      if (head.current) head.current.rotation.y = side * out * 0.35; // and look out (toward the tour camera)
      if (mode === "play" && dist < 4.5) run();
      return;
    }
    if (k.state === "hidden") {
      if (k.t > 6 && (mode !== "play" || dist > 6)) {
        k.from = { x: hide.x, z: hide.z };
        k.state = "back";
        k.t = 0;
      }
      return;
    }
    const target = k.state === "run" ? hide : home;
    const e = Math.min(1, k.t / (k.state === "run" ? 0.9 : 1.4));
    g.position.set(
      k.from.x + (target.x - k.from.x) * e,
      reducedMotion ? 0 : Math.abs(Math.sin(k.t * 14)) * 0.08,
      k.from.z + (target.z - k.from.z) * e,
    );
    g.rotation.set(0, Math.atan2(target.x - k.from.x, target.z - k.from.z), 0);
    legs.current.forEach((l, i) => {
      if (l) l.rotation.x = reducedMotion ? 0 : Math.sin(k.t * 14 + i * Math.PI) * 0.6;
    });
    if (e >= 1) {
      legs.current.forEach((l) => {
        if (l) l.rotation.x = 0;
      });
      g.rotation.set(0, 0, 0);
      k.state = k.state === "run" ? "hidden" : "peek";
      k.t = 0;
    }
  });

  const skin = "#c99a72";
  return (
    <>
      <group position={islandFrame(placement)}>
        <group ref={root} position={[home.x, 0, home.z]}>
          {[-0.1, 0.1].map((x, i) => (
            <group key={x} ref={(l) => { legs.current[i] = l; }} position={[x, 0.34, 0]}>
              <mesh position={[0, -0.17, 0]} castShadow>
                <boxGeometry args={[0.18, 0.34, 0.2]} />
                <meshStandardMaterial color={skin} roughness={0.9} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 0.42, 0]} castShadow>
            <boxGeometry args={[0.46, 0.2, 0.28]} />
            <meshStandardMaterial color="#b5473a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.71, 0]} castShadow>
            <boxGeometry args={[0.46, 0.38, 0.26]} />
            <meshStandardMaterial color="#efebe2" roughness={0.9} />
          </mesh>
          <group ref={head} position={[0, 1.08, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.36, 0.36, 0.36]} />
              <meshStandardMaterial color={skin} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.19, -0.01]} castShadow>
              <boxGeometry args={[0.4, 0.13, 0.4]} />
              <meshStandardMaterial color="#1e1b19" roughness={0.9} />
            </mesh>
            {[-0.08, 0.08].map((x) => (
              <mesh key={x} position={[x, 0.02, 0.185]}>
                <boxGeometry args={[0.05, 0.05, 0.02]} />
                <meshStandardMaterial color="#1e1b19" />
              </mesh>
            ))}
          </group>
        </group>
      </group>
      <Interactable id="petak-kid" island={placement.id} label="Find the kid" position={[spot.x, spot.y, spot.z]} size={[0.9, 1.4, 0.9]} radius={2.5} onActivate={run} />
    </>
  );
}

function PetakUmpetIsland({ placement }: { placement: IslandPlacement }) {
  const blocks = useMemo(
    () => [...houseBlocks(), ...postBlocks(), ...PETAK.trees.flatMap((t) => treeBlocks(t.x, t.z, t.h, t.seed))],
    [],
  );
  const project = projectById("petak-umpet");
  return (
    <>
      <group position={islandFrame(placement)}>
        <PropBlocks blocks={blocks} seed={303} />
        <Lanterns />
        <PetakSign />
      </group>
      <HidingKid placement={placement} />
      <InfoBoard placement={placement} at={PETAK.info} rotationY={PETAK.info.ry} title="Roblox" lines={project.stats ?? []} />
      <Signpost id="petak-link" placement={placement} at={PETAK.link} rotationY={PETAK.link.ry} label="Play on Roblox" url={project.links.roblox} />
    </>
  );
}

export const petakUmpetIsland: StarIslandModule = {
  id: "petak-umpet",
  Component: PetakUmpetIsland,
  stamp: (grid: VoxelGrid, p: IslandPlacement) => stampCells(grid, p, FOOTPRINTS["petak-umpet"]),
  tourStop: tourStopFor,
};
