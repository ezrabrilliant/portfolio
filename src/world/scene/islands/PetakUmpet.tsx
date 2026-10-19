import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { glows } from "@/world/scene/daylight";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { playJingle, playSfx } from "@/world/engine/audio/sfx";
import { footfalls } from "@/world/scene/ezra/footfall";
import { Interactable } from "@/world/scene/Interactable";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { PETAK } from "./layouts";
import { CANVAS_FONTS } from "./shared/canvasFonts";
import { InfoBoard } from "./shared/InfoBoard";
import { MapBoard } from "./shared/MapBoard";
import { Signpost } from "./shared/Signpost";
import { PropBlocks } from "./shared/PropBlocks";
import { PALETTE, treeBlocks } from "./shared/props";
import { islandFrame, worldOf } from "./shared/local";
import { FOUND_AT, GIVE_UP_AT, HIDE_SPOTS, ROUNDS, START_AT, pickRounds } from "./petak/hideSeek";
import { announceCard } from "@/world/ui/islandAnnounce";
import { RED, turn, houseBlocks, bananaBlocks, gentongBlocks, jemuranBlocks, pathBlocks, SIGN_BOTTOM, postBlocks } from "./petak/blocks";
import { projectById } from "./shared/project";
import { useCanvasTexture } from "./shared/useCanvasTexture";

/** Warm lanterns hanging from the post arms, swaying slowly (still under reduced motion). */
/** The lanterns' glowing paper, one material so the golden hour brightens them all (daylight.ts glows). */
const LANTERN_GLOW = glows(new THREE.MeshStandardMaterial({ color: "#6b4220", emissive: "#ffa64a", emissiveIntensity: 0.9, roughness: 0.6, toneMapped: false }));

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
            <primitive object={LANTERN_GLOW} attach="material" />
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

type KidState = "peek" | "run" | "hidden" | "back" | "seekRun" | "seekHide" | "found";

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
  const sim = useRef({ state: "peek" as KidState, t: 0, from: { x: 0, z: 0 }, to: { x: 0, z: 0 }, rounds: [] as number[], round: 0 });
  const { home, hide, peek } = PETAK.kid;
  const side = Math.sign(peek); // which side of the trunk he peeks out of (+1 = +x)
  const spot = useMemo(() => worldOf(placement, PEEK_SPOT.x, 0.7, PEEK_SPOT.z), [placement]);
  /** the island frame in world space: the kid's group moves in island-local coordinates */
  const spot0 = useMemo(() => worldOf(placement, 0, 0, 0), [placement]);
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
  };

  /** Hide and seek (petak/hideSeek.ts): he runs to the round's spot. */
  const runTo = (to: { x: number; z: number }, state: KidState) => {
    const k = sim.current;
    const g = root.current;
    k.from = { x: g ? g.position.x : home.x, z: g ? g.position.z : home.z };
    k.to = to;
    k.state = state;
    k.t = 0;
    if (head.current) head.current.rotation.y = 0;
  };
  const startGame = () => {
    const k = sim.current;
    k.rounds = pickRounds();
    k.round = 0;
    runTo(HIDE_SPOTS[k.rounds[0]], "seekRun");
    // he counts to three (one, two, three ... go!)
    playJingle("seek", { at: spot });
    announceCard("Hide and seek!", `Find the kid · 1 / ${ROUNDS}`);
  };
  const endGame = () => {
    const k = sim.current;
    runTo(PEEK_SPOT, "back");
    k.rounds = [];
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
      if (mode === "play" && dist < START_AT && !reducedMotion) startGame();
      else if (mode === "play" && dist < START_AT) run();
      return;
    }
    // hide and seek: he waits where he hid until Ezra finds him; a found kid hops, then runs to the next spot
    if (k.state === "seekHide" || k.state === "found" || k.state === "seekRun") {
      const kx = spot0.x + g.position.x, kz = spot0.z + g.position.z;
      const near = Math.hypot(p.x - kx, p.z - kz);
      if (mode !== "play" || Math.hypot(p.x - spot.x, p.z - spot.z) > GIVE_UP_AT) {
        endGame();
        return;
      }
      if (k.state === "seekHide") {
        // now and then he peeks out from his hiding place
        if (head.current) head.current.rotation.y = 0.5 * Math.sin(k.t * 1.3);
        if (near < FOUND_AT) {
          k.state = "found";
          k.t = 0;
          playSfx("pop", { at: { x: kx, y: spot0.y + 1, z: kz } });
          playJingle(k.round + 1 >= ROUNDS ? "fanfare" : "found");
          runtime.particles.burst({ x: kx, y: spot0.y + 1.2, z: kz }, "confetti", { count: 24 });
          const n = k.round + 1;
          announceCard(n >= ROUNDS ? "You found me every time!" : `Found you! ${n} / ${ROUNDS}`, n >= ROUNDS ? "Hide and seek champion" : "Again! Count to three...", true);
        }
        return;
      }
      if (k.state === "found") {
        g.position.y = Math.abs(Math.sin(k.t * 9)) * 0.25 * Math.max(0, 1 - k.t);
        if (k.t > 1.3) {
          k.round += 1;
          if (k.round >= ROUNDS) endGame();
          else {
            runTo(HIDE_SPOTS[k.rounds[k.round]], "seekRun");
            playJingle("count3", { at: { x: kx, y: spot0.y + 1, z: kz } });
          }
        }
        return;
      }
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
    const target = k.state === "seekRun" ? k.to : k.state === "run" ? hide : reducedMotion ? PEEK_SPOT : home;
    const e = Math.min(1, k.t / (k.state === "run" ? 0.9 : k.state === "seekRun" ? 1.4 : 1.4));
    g.position.set(
      k.from.x + (target.x - k.from.x) * e,
      reducedMotion ? 0 : Math.abs(Math.sin(k.t * 14)) * 0.08,
      k.from.z + (target.z - k.from.z) * e,
    );
    g.rotation.set(0, Math.atan2(target.x - k.from.x, target.z - k.from.z), 0);
    legs.current.forEach((l, i) => {
      if (l) l.rotation.x = reducedMotion ? 0 : Math.sin(k.t * 14 + i * Math.PI) * 0.6;
    });
    // his feet patter on the grass as his legs swing (twice a stride), heard from where he is
    if (footfalls((k.t - dt) * 14, k.t * 14) > 0) playSfx("stepGrass", { at: { x: spot0.x + g.position.x, y: spot0.y, z: spot0.z + g.position.z }, volume: 0.55, rate: 1.25 });
    if (e >= 1) {
      legs.current.forEach((l) => {
        if (l) l.rotation.x = 0;
      });
      g.rotation.set(0, 0, 0);
      k.state = k.state === "run" ? "hidden" : k.state === "seekRun" ? "seekHide" : "peek";
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

export function PetakUmpetIsland({ placement }: { placement: IslandPlacement }) {
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
      <InfoBoard placement={placement} at={PETAK.info} rotationY={PETAK.info.ry} title={PETAK.info.title} lines={project.stats ?? []} />
      <Signpost id="petak-link" placement={placement} at={PETAK.link} rotationY={PETAK.link.ry} label="Play on Roblox" url={project.links.roblox} />
      <MapBoard placement={placement} at={PETAK.map} />
    </>
  );
}
