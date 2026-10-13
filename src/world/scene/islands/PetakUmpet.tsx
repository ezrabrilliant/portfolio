import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import { mulberry32 } from "@/world/engine/gen/rng";
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
import { PALETTE, pickColor, treeBlocks, type PropBlock } from "./shared/props";
import { islandFrame, stampCells, worldOf } from "./shared/local";
import { projectById } from "./shared/project";
import { useCanvasTexture } from "./shared/useCanvasTexture";

const KOLONG = 1.6; // open space under the house, on stilts
const FLOOR = KOLONG + 0.25; // floor top
const EAVE = FLOOR + 2.4; // top of the walls
const WALL = 0.12; // wall thickness
const BILIK = "#cbb07c"; // woven-bamboo wall tone
const DARK = "#2e241c"; // the dark inside behind openings
const RED = "#b5473a"; // the red of the merah-putih school uniform
const CLOTH = "#f1ede4";

/** Island-local block from min/max bounds. */
function box(xa: number, xb: number, ya: number, yb: number, za: number, zb: number, c: string, rot: Partial<PropBlock> = {}): PropBlock {
  return { x: (xa + xb) / 2, y: (ya + yb) / 2, z: (za + zb) / 2, sx: xb - xa, sy: yb - ya, sz: zb - za, c, ...rot };
}

/** Island-local point (lx, lz) of a prop standing at `at`, turned by ry (three's Y rotation). */
function turn(at: { x: number; z: number }, ry: number, lx: number, lz: number) {
  return { x: at.x + lx * Math.cos(ry) + lz * Math.sin(ry), z: at.z - lx * Math.sin(ry) + lz * Math.cos(ry) };
}

/**
 * Sundanese rumah panggung: stilts on stone footings over an open kolong with stacked firewood, bilik walls in a
 * dark-wood frame, a framed door up a wooden stair, a barred window, and a long gable roof (ridge along x)
 * with crossed capit gunting boards at both ends.
 */
function houseBlocks(): PropBlock[] {
  const { x0, z0, w, d } = PETAK.house;
  const X0 = x0 - 0.5;
  const X1 = x0 + w - 0.5;
  const Z0 = z0 - 0.5;
  const Z1 = z0 + d - 0.5;
  const cx = (X0 + X1) / 2;
  const cz = (Z0 + Z1) / 2;
  const out: PropBlock[] = [];

  // kolong: umpak stones, stilts, floor beams, floor
  for (const x of [X0 + 0.2, cx, X1 - 0.2]) {
    for (const z of [Z0 + 0.2, Z1 - 0.2]) {
      out.push(box(x - 0.22, x + 0.22, 0, 0.16, z - 0.22, z + 0.22, PALETTE.stone[1]));
      out.push(box(x - 0.13, x + 0.13, 0.16, KOLONG, z - 0.13, z + 0.13, PALETTE.wood));
    }
  }
  for (const z of [Z0 + 0.2, Z1 - 0.2]) out.push(box(X0 - 0.05, X1 + 0.05, KOLONG - 0.22, KOLONG, z - 0.1, z + 0.1, PALETTE.woodDark));
  out.push(box(X0 - 0.1, X1 + 0.1, KOLONG, FLOOR, Z0 - 0.1, Z1 + 0.1, PALETTE.plank[1]));
  // firewood stacked under the right half (4-3-2 logs)
  const logs = ["#7a5a3c", "#8e6b47", "#6f5035"];
  for (let row = 0; row < 3; row++) {
    const n = 4 - row;
    for (let i = 0; i < n; i++) {
      const z = cz + (i - (n - 1) / 2) * 0.2;
      out.push(box(-1.2, 0, row * 0.18, row * 0.18 + 0.18, z - 0.09, z + 0.09, logs[(row + i) % 3]));
    }
  }

  // walls: bilik panels; the front leaves openings for the door and the window
  const F = FLOOR;
  const E = EAVE;
  const dx0 = x0 + 1 - 0.4; // door above the stair
  const dx1 = x0 + 1 + 0.4;
  const wx0 = x0 + 2.4 - 0.45; // front window
  const wx1 = x0 + 2.4 + 0.45;
  const wy0 = F + 0.6;
  const wy1 = F + 1.4;
  const doorTop = F + 1.7;
  out.push(
    box(X0, X1, F, E, Z0, Z0 + WALL, BILIK),
    box(X0, X0 + WALL, F, E, Z0 + WALL, Z1 - WALL, BILIK),
    box(X1 - WALL, X1, F, E, Z0 + WALL, Z1 - WALL, BILIK),
    box(X0, dx0, F, E, Z1 - WALL, Z1, BILIK),
    box(dx0, dx1, doorTop, E, Z1 - WALL, Z1, BILIK),
    box(dx1, wx0, F, E, Z1 - WALL, Z1, BILIK),
    box(wx0, wx1, F, wy0, Z1 - WALL, Z1, BILIK),
    box(wx0, wx1, wy1, E, Z1 - WALL, Z1, BILIK),
    box(wx1, X1, F, E, Z1 - WALL, Z1, BILIK),
  );
  // door: recessed plank door in a dark frame
  out.push(
    box(dx0, dx1, F, doorTop, Z1 - WALL - 0.06, Z1 - WALL, "#4a3424"),
    box(dx0 - 0.1, dx0, F, doorTop + 0.12, Z1 - 0.02, Z1 + 0.06, PALETTE.woodDark),
    box(dx1, dx1 + 0.1, F, doorTop + 0.12, Z1 - 0.02, Z1 + 0.06, PALETTE.woodDark),
    box(dx0 - 0.1, dx1 + 0.1, doorTop, doorTop + 0.12, Z1 - 0.02, Z1 + 0.06, PALETTE.woodDark),
  );
  // front window: dark inside, three bars, sill and lintel
  out.push(box(wx0, wx1, wy0, wy1, Z1 - WALL - 0.04, Z1 - WALL, DARK));
  for (let i = 1; i <= 3; i++) {
    const x = wx0 + ((wx1 - wx0) * i) / 4;
    out.push(box(x - 0.03, x + 0.03, wy0, wy1, Z1 - 0.08, Z1 - 0.02, PALETTE.plank[0]));
  }
  out.push(
    box(wx0 - 0.08, wx1 + 0.08, wy0 - 0.08, wy0, Z1 - 0.02, Z1 + 0.08, PALETTE.woodDark),
    box(wx0 - 0.08, wx1 + 0.08, wy1, wy1 + 0.08, Z1 - 0.02, Z1 + 0.06, PALETTE.woodDark),
  );
  // side window on the left wall (shutter-dark with bars)
  out.push(box(X0 - 0.03, X0, wy0, wy1, cz - 0.4, cz + 0.4, DARK));
  for (let i = 1; i <= 3; i++) {
    const z = cz - 0.4 + (0.8 * i) / 4;
    out.push(box(X0 - 0.08, X0 - 0.03, wy0, wy1, z - 0.03, z + 0.03, PALETTE.plank[0]));
  }
  out.push(box(X0 - 0.1, X0, wy0 - 0.08, wy0, cz - 0.48, cz + 0.48, PALETTE.woodDark), box(X0 - 0.08, X0, wy1, wy1 + 0.08, cz - 0.48, cz + 0.48, PALETTE.woodDark));
  // frame: corner posts, a sill beam on the floor, wall plates under the roof
  for (const x of [X0, X1]) for (const z of [Z0, Z1]) out.push(box(x - 0.09, x + 0.09, F - 0.02, E + 0.02, z - 0.09, z + 0.09, PALETTE.wood));
  out.push(
    box(X0 - 0.06, dx0 - 0.1, F, F + 0.1, Z1 - 0.02, Z1 + 0.05, PALETTE.woodDark),
    box(dx1 + 0.1, X1 + 0.06, F, F + 0.1, Z1 - 0.02, Z1 + 0.05, PALETTE.woodDark),
    box(X0 - 0.09, X1 + 0.09, E - 0.12, E, Z1 - 0.02, Z1 + 0.07, PALETTE.woodDark),
    box(X0 - 0.09, X1 + 0.09, E - 0.12, E, Z0 - 0.07, Z0 + 0.02, PALETTE.woodDark),
    box(X0 - 0.07, X0 + 0.02, E - 0.12, E, Z0, Z1, PALETTE.woodDark),
    box(X1 - 0.02, X1 + 0.07, E - 0.12, E, Z0, Z1, PALETTE.woodDark),
  );

  // long gable roof: full-length layers stepping in only along z, a ridge beam, capit gunting at both ends
  const layers = 7;
  for (let k = 0; k < layers; k++) {
    out.push({ x: cx, y: E + 0.13 + k * 0.26, z: cz, sx: w + 1.2, sy: 0.26, sz: d + 1.4 - k * 0.62, c: PALETTE.roof[k % 3] });
  }
  const ridge = E + layers * 0.26;
  out.push({ x: cx, y: ridge + 0.08, z: cz, sx: w + 1.5, sy: 0.16, sz: 0.24, c: PALETTE.woodDark });
  for (const s of [-1, 1]) for (const r of [-0.62, 0.62]) out.push({ x: cx + s * (w / 2 + 0.5), y: ridge + 0.13, z: cz, sx: 0.09, sy: 1.0, sz: 0.1, rx: r, c: PALETTE.woodDark });

  // wooden stair (tangga) up to the door: two sloping stringers and four open treads, five equal rises
  const zTop = Z1 + 0.1; // past the floor's lip
  const run = 1.32;
  const slope = Math.atan2(F, run);
  for (const x of [dx0 - 0.02, dx1 + 0.02]) {
    out.push({ x, y: F / 2, z: zTop + run / 2, sx: 0.08, sy: 0.16, sz: Math.hypot(F, run), rx: slope, c: PALETTE.woodDark });
  }
  for (let i = 1; i <= 4; i++) {
    const y = F - (i * F) / 5;
    const z = zTop + (i * run) / 5;
    out.push(box(dx0, dx1, y - 0.07, y, z - 0.15, z + 0.15, PALETTE.plank[0]));
  }
  return out;
}

/** Banana tree (pohon pisang): pseudo-stem, six drooping leaves, a young rolled leaf, a bunch and its heart. */
function bananaBlocks(): PropBlock[] {
  const { x, z, h } = PETAK.banana;
  const out: PropBlock[] = [
    box(x - 0.17, x + 0.17, 0, h * 0.55, z - 0.17, z + 0.17, "#7f8a4d"),
    box(x - 0.15, x + 0.15, h * 0.55, h, z - 0.15, z + 0.15, "#93a05c"),
    box(x - 0.06, x + 0.06, h, h + 0.8, z - 0.06, z + 0.06, "#9cbd6e"),
    box(x + 0.18, x + 0.44, h - 0.6, h - 0.18, z - 0.02, z + 0.24, "#7f9a3a"),
    box(x + 0.25, x + 0.39, h - 0.85, h - 0.6, z + 0.04, z + 0.18, "#6e3b4c"),
  ];
  const len = 1.5;
  for (let i = 0; i < 6; i++) {
    const a = 0.32 + 0.12 * (i % 2); // droop
    const t = 0.3 + (i * Math.PI) / 3; // heading
    out.push({
      x: x + (len / 2) * Math.cos(a) * Math.cos(t),
      y: h + 0.1 - (len / 2) * Math.sin(a),
      z: z - (len / 2) * Math.cos(a) * Math.sin(t),
      sx: len, sy: 0.05, sz: 0.42, ry: t, rz: -a,
      c: PALETTE.leaf[i % 4],
    });
  }
  return out;
}

/** Gentong (clay water jar, the game's hiding jar) with a wooden lid and a coconut-shell dipper. */
function gentongBlocks(): PropBlock[] {
  const { x, z } = PETAK.gentong;
  const clay = ["#a8603f", "#a05a3b"];
  // [width, bottom, top]: foot, swelling belly, shoulder, neck, rim
  const rings: [number, number, number][] = [
    [0.52, 0, 0.08], [0.7, 0.08, 0.2], [0.82, 0.2, 0.36], [0.9, 0.36, 0.6],
    [0.84, 0.6, 0.74], [0.7, 0.74, 0.84], [0.5, 0.84, 0.95], [0.6, 0.95, 1.02],
  ];
  const out = rings.map(([s, ya, yb], i) => box(x - s / 2, x + s / 2, ya, yb, z - s / 2, z + s / 2, clay[i % 2]));
  out.push(
    { ...box(x - 0.26, x + 0.26, 1.02, 1.07, z - 0.26, z + 0.26, PALETTE.woodDark), ry: 0.25 },
    box(x - 0.1, x + 0.1, 1.07, 1.17, z - 0.12, z + 0.08, "#5c4030"),
    { x: x + 0.2, y: 1.12, z: z + 0.05, sx: 0.36, sy: 0.04, sz: 0.04, ry: 0.6, c: "#5c4030" },
  );
  return out;
}

/** Jemuran: a clothesline on two posts with a red-and-white school uniform drying on it. */
function jemuranBlocks(): PropBlock[] {
  const { x0, x1, z } = PETAK.jemuran;
  const line = 1.52;
  const shirt = x0 + 0.5;
  const shorts = x0 + 1.17;
  return [
    box(x0 - 0.05, x0 + 0.05, 0, 1.62, z - 0.05, z + 0.05, PALETTE.wood),
    box(x1 - 0.05, x1 + 0.05, 0, 1.62, z - 0.05, z + 0.05, PALETTE.wood),
    box(x0, x1, line - 0.012, line + 0.012, z - 0.012, z + 0.012, "#4e3f30"),
    box(shirt - 0.24, shirt + 0.24, line - 0.5, line - 0.02, z - 0.02, z + 0.02, CLOTH),
    box(shirt - 0.39, shirt - 0.24, line - 0.2, line - 0.02, z - 0.02, z + 0.02, CLOTH),
    box(shirt + 0.24, shirt + 0.39, line - 0.2, line - 0.02, z - 0.02, z + 0.02, CLOTH),
    box(shorts - 0.22, shorts + 0.22, line - 0.18, line - 0.02, z - 0.02, z + 0.02, RED),
    box(shorts - 0.22, shorts - 0.02, line - 0.42, line - 0.18, z - 0.02, z + 0.02, RED),
    box(shorts + 0.02, shorts + 0.22, line - 0.42, line - 0.18, z - 0.02, z + 0.02, RED),
  ];
}

/** Dirt path from the stair to the front edge: one tile per waypoint plus a smaller one between. */
function pathBlocks(): PropBlock[] {
  const r = mulberry32(77);
  const dirt = ["#9a7550", "#8c6a48", "#a5815b"];
  const out: PropBlock[] = [];
  PETAK.path.forEach((p, i) => {
    out.push({ x: p.x, y: 0.025, z: p.z, sx: 0.8 + r() * 0.2, sy: 0.05, sz: 0.62 + r() * 0.16, ry: (r() - 0.5) * 0.5, c: pickColor(dirt, r) });
    const q = PETAK.path[i + 1];
    if (q) {
      const side = i % 2 ? 0.22 : -0.22;
      out.push({ x: (p.x + q.x) / 2 + side, y: 0.02, z: (p.z + q.z) / 2, sx: 0.42, sy: 0.04, sz: 0.36, ry: r() - 0.5, c: pickColor(dirt, r) });
    }
  });
  return out;
}

const SIGN_BOTTOM = 0.55;

/** Static wood of the lantern posts and the title sign (posts, backing board, top rail). */
function postBlocks(): PropBlock[] {
  const out: PropBlock[] = PETAK.lanterns.flatMap((l) => [
    { x: l.x, y: 1.0, z: l.z, c: PALETTE.wood, sx: 0.1, sy: 2.0, sz: 0.1 },
    { x: l.x + 0.22, y: 1.95, z: l.z, c: PALETTE.wood, sx: 0.5, sy: 0.08, sz: 0.08 },
  ]);
  const { ry, w, h } = PETAK.sign;
  const top = SIGN_BOTTOM + h;
  for (const s of [-1, 1]) {
    const p = turn(PETAK.sign, ry, s * (w / 2 - 0.3), -0.08); // posts just behind the board
    out.push({ x: p.x, y: (top + 0.12) / 2, z: p.z, sx: 0.16, sy: top + 0.12, sz: 0.16, ry, c: PALETTE.wood });
  }
  const c = turn(PETAK.sign, ry, 0, 0);
  out.push(
    { x: c.x, y: SIGN_BOTTOM + h / 2, z: c.z, sx: w, sy: h, sz: 0.1, ry, c: "#8a6644" },
    { x: c.x, y: top + 0.04, z: c.z, sx: w + 0.14, sy: 0.1, sz: 0.16, ry, c: PALETTE.woodDark },
  );
  return out;
}

/** Warm lanterns hanging from the post arms, swaying slowly (still under reduced motion). */
function Lanterns() {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const still = useWorld.getState().reducedMotion;
    refs.current.forEach((g, i) => {
      if (g) g.rotation.z = still ? 0 : Math.sin(clock.elapsedTime * 0.7 + i * 1.7) * 0.05;
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
            <meshStandardMaterial color="#6b4220" emissive="#ffa64a" emissiveIntensity={0.9} roughness={0.6} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

const SIGN_TEX_W = 1024;
const SIGN_TEX_H = 464; // matches the board face's aspect (2.92 x 1.32)

function drawSign(g: CanvasRenderingContext2D, w: number, h: number) {
  g.fillStyle = "#b88d5f";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(70, 45, 25, 0.16)";
  for (let y = h / 4; y < h; y += h / 4) g.fillRect(0, y - 3, w, 6);
  g.strokeStyle = "#6b4f37";
  g.lineWidth = 18;
  g.strokeRect(9, 9, w - 18, h - 18);
  // the little house from the game's logo
  g.fillStyle = "#3e2b1c";
  g.beginPath();
  g.moveTo(58, 222);
  g.lineTo(186, 96);
  g.lineTo(314, 222);
  g.closePath();
  g.fill();
  g.fillRect(86, 222, 200, 140);
  g.fillStyle = "#b88d5f";
  g.fillRect(166, 282, 42, 80);
  g.font = `700 150px ${CANVAS_FONTS.ui}`;
  g.textBaseline = "middle";
  const text = (s: string, y: number, c: string) => {
    g.fillStyle = "rgba(55, 35, 18, 0.55)";
    g.fillText(s, 356 + 5, y + 6);
    g.fillStyle = c;
    g.fillText(s, 356, y);
  };
  text("PETAK", 156, "#f6efe1");
  text("UMPET", 318, "#f3d9a4");
}

/** The title: the sign's canvas face (its posts and board live in PropBlocks). */
function PetakSign() {
  const texture = useCanvasTexture(SIGN_TEX_W, SIGN_TEX_H, drawSign, []);
  const { ry, w, h } = PETAK.sign;
  const p = turn(PETAK.sign, ry, 0, 0.056);
  return (
    <mesh position={[p.x, SIGN_BOTTOM + h / 2, p.z]} rotation={[0, ry, 0]}>
      <planeGeometry args={[w - 0.08, h - 0.08]} />
      <meshStandardMaterial map={texture} roughness={0.85} />
    </mesh>
  );
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

type KidState = "peek" | "run" | "hidden" | "back";

/** Where the kid stands fully peeking out (also where reduced motion keeps him). */
const PEEK_SPOT = { x: PETAK.kid.home.x + PETAK.kid.peek, z: PETAK.kid.home.z };

function boxAt(w: number, h: number, d: number, x: number, y: number, z: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

function merged(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const g = mergeGeometries(parts) ?? new THREE.BufferGeometry();
  parts.forEach((p) => p.dispose());
  return g;
}

/** Kid in an SD uniform (red cap, white shirt, red shorts) peeking from behind the tree; runs to hide behind the house when found or approached. */
function HidingKid({ placement }: { placement: IslandPlacement }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const sim = useRef({ state: "peek" as KidState, t: 0, from: { x: 0, z: 0 } });
  const { home, hide, peek } = PETAK.kid;
  const side = Math.sign(peek); // which side of the trunk he peeks out of (+1 = +x)
  const spot = useMemo(() => worldOf(placement, PEEK_SPOT.x, 0.7, PEEK_SPOT.z), [placement]);
  const geo = useMemo(
    () => ({
      cap: merged([boxAt(0.4, 0.14, 0.4, 0, 0.2, -0.01), boxAt(0.34, 0.04, 0.2, 0, 0.15, 0.28)]),
      eyes: merged([boxAt(0.05, 0.05, 0.02, -0.08, 0.02, 0.185), boxAt(0.05, 0.05, 0.02, 0.08, 0.02, 0.185)]),
    }),
    [],
  );
  useEffect(() => () => {
    geo.cap.dispose();
    geo.eyes.dispose();
  }, [geo]);

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
      // the peek cycle restarts whenever the kid is back home, so he never pops out mid-peek;
      // he is out for most of the 6 s cycle so a tour visitor catches him
      const u = k.t % 6;
      const out = reducedMotion ? 1 : smooth(0.8, 1.5, u) * (1 - smooth(4.6, 5.3, u));
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
    // reduced motion walks him straight back to where he stays peeking (no snap at the end)
    const target = k.state === "run" ? hide : reducedMotion ? PEEK_SPOT : home;
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
            <meshStandardMaterial color={RED} roughness={0.9} />
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
            <mesh geometry={geo.cap} castShadow>
              <meshStandardMaterial color={RED} roughness={0.85} />
            </mesh>
            <mesh geometry={geo.eyes}>
              <meshStandardMaterial color="#1e1b19" />
            </mesh>
          </group>
        </group>
      </group>
      <Interactable
        id="petak-kid"
        island={placement.id}
        label="Find the kid"
        position={[spot.x, spot.y, spot.z]}
        size={[0.9, 1.4, 0.9]}
        radius={2.5}
        onActivate={run}
        enabled={() => sim.current.state === "peek" || sim.current.state === "back"}
      />
    </>
  );
}

function PetakUmpetIsland({ placement }: { placement: IslandPlacement }) {
  const blocks = useMemo(
    () => [
      ...houseBlocks(),
      ...postBlocks(),
      ...PETAK.trees.flatMap((t) => treeBlocks(t.x, t.z, t.h, t.seed)),
      ...bananaBlocks(),
      ...gentongBlocks(),
      ...jemuranBlocks(),
      ...pathBlocks(),
    ],
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
