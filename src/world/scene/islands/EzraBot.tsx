import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import { playSfx } from "@/world/engine/audio/sfx";
import { Interactable } from "@/world/scene/Interactable";
import { useWorld } from "@/world/state/store";
import type { StarIslandModule } from "./types";
import { EZRA, FOOTPRINTS } from "./layouts";
import { tourStopFor } from "./framing";
import { InfoBoard } from "./shared/InfoBoard";
import { Signpost } from "./shared/Signpost";
import { PALETTE } from "./shared/props";
import { islandFrame, stampCells, worldTuple } from "./shared/local";
import { projectById } from "./shared/project";
import { useCanvasTexture } from "./shared/useCanvasTexture";
import { useHoverLift } from "./shared/useHoverLift";
import { CHAT_SCRIPT, drawBotScreen, drawBubble, messageTime, visibleWindow, type ChatMessage } from "./ezrabot/chat";

/** [width, height, depth, x, y, z, colour]: one box of a baked part, relative to the part's pivot. */
type Box = readonly [number, number, number, number, number, number, string];

/** Bakes static boxes into one vertex-coloured geometry, so each part costs one draw call. */
function bake(boxes: readonly Box[]): THREE.BufferGeometry {
  const c = new THREE.Color();
  const pieces = boxes.map(([w, h, d, x, y, z, colour]) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    c.set(colour);
    const n = g.attributes.position.count;
    const rgb = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) rgb.set([c.r, c.g, c.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(rgb, 3));
    return g;
  });
  const merged = mergeGeometries(pieces);
  for (const g of pieces) g.dispose();
  if (!merged) throw new Error("EzraBot: could not merge part geometry");
  return merged;
}

const BODY = "#cfd3cf";
const LIGHT = "#e3e6e2";
const SLATE = "#2a333c";

const ROBOT = {
  // legs, torso, chest panel, arms and the neck up to the head's pivot, relative to the robot's feet
  body: bake([
    [0.45, 0.62, 0.5, -0.35, 0.31, 0, BODY],
    [0.45, 0.62, 0.5, 0.35, 0.31, 0, BODY],
    [1.5, 1.2, 1.0, 0, 1.22, 0, BODY],
    [0.62, 0.34, 0.06, 0, 1.34, 0.51, SLATE],
    [0.34, 1.0, 0.42, -0.95, 1.14, 0, LIGHT],
    [0.34, 1.0, 0.42, 0.95, 1.14, 0, LIGHT],
    [0.34, 0.58, 0.34, 0, 2.08, 0, SLATE],
  ]),
  // head, visor and antenna stalk, relative to the neck pivot
  head: bake([
    [1.32, 1.0, 1.0, 0, 0.48, 0, LIGHT],
    [1.1, 0.58, 0.06, 0, 0.48, 0.51, SLATE],
    [0.08, 0.46, 0.08, 0, 1.2, 0, SLATE],
  ]),
  // both eyes centred on y = 0 so one scale.y blinks them in place
  eyes: bake([
    [0.2, 0.22, 0.05, -0.27, 0, 0, "#ffffff"],
    [0.2, 0.22, 0.05, 0.27, 0, 0, "#ffffff"],
  ]),
  led: new THREE.BoxGeometry(0.12, 0.12, 0.04),
  ball: new THREE.BoxGeometry(0.2, 0.2, 0.2),
};
const ROBOT_MAT = {
  body: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }),
  eyes: new THREE.MeshStandardMaterial({ color: "#dcf3e4", emissive: "#cfeedd", emissiveIntensity: 1.1, roughness: 0.4 }),
  led: new THREE.MeshStandardMaterial({ color: "#8fbf6a", emissive: "#6fae4a", emissiveIntensity: 0.7, roughness: 0.7 }),
  ball: new THREE.MeshStandardMaterial({ color: "#e2a24a", emissive: "#d08a30", emissiveIntensity: 0.5, roughness: 0.7 }),
};

/** Rounded bubble panel plus its tail (pointing down-left at the robot), relative to the bubble's left edge. */
const BUBBLE_GEO = (() => {
  const { w, h } = EZRA.bubbles;
  const panel = new RoundedBoxGeometry(w, h, 0.16, 2, 0.07).translate(w / 2, 0, 0);
  // RoundedBoxGeometry is non-indexed, so the tail box must be too before they merge
  const box = new THREE.BoxGeometry(0.22, 0.22, 0.12);
  const tail = box.toNonIndexed().rotateZ(Math.PI / 4).translate(0.12, -0.42, 0);
  const merged = mergeGeometries([panel, tail]);
  box.dispose();
  panel.dispose();
  tail.dispose();
  if (!merged) throw new Error("EzraBot: could not merge bubble geometry");
  return merged;
})();
const BUBBLE_MAT = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.8, emissive: "#ffffff", emissiveIntensity: 0.42 });

/** The screen board's two wooden posts and dark frame, relative to the board's foot. */
const SCREEN_GEO = (() => {
  const { w, h, y } = EZRA.screen;
  return bake([
    [0.14, y, 0.14, -(w / 2 - 0.25), y / 2, -0.06, PALETTE.wood],
    [0.14, y, 0.14, w / 2 - 0.25, y / 2, -0.06, PALETTE.wood],
    [w + 0.14, h + 0.14, 0.1, 0, y + h / 2 - 0.2, 0, "#15191d"],
  ]);
})();
const SCREEN_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });

/** Pause between a member's question and the bot's answer. */
const REPLY_DELAY_MS = 1100;

function Robot({ id }: { id: string }) {
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Mesh>(null);
  const lift = useHoverLift(id);
  useFrame(({ clock }) => {
    if (useWorld.getState().reducedMotion) return;
    const t = clock.elapsedTime;
    if (head.current) head.current.rotation.z = Math.sin(t * 0.9) * 0.06;
    if (eyes.current) eyes.current.scale.y = t % 4 < 0.12 ? 0.15 : 1;
  });
  return (
    <group position={[EZRA.robot.x, 0, EZRA.robot.z]}>
      <group ref={lift}>
        <mesh geometry={ROBOT.body} material={ROBOT_MAT.body} castShadow />
        <mesh geometry={ROBOT.led} material={ROBOT_MAT.led} position={[0.18, 1.34, 0.55]} />
        <group ref={head} position={[0, 2.36, 0]}>
          <mesh geometry={ROBOT.head} material={ROBOT_MAT.body} castShadow />
          <mesh ref={eyes} geometry={ROBOT.eyes} material={ROBOT_MAT.eyes} position={[0, 0.5, 0.55]} />
          <mesh geometry={ROBOT.ball} material={ROBOT_MAT.ball} position={[0, 1.48, 0]} castShadow />
        </group>
      </group>
    </group>
  );
}

function Bubble({ slot, msg, time, popKey }: { slot: number; msg: ChatMessage; time: string; popKey: number }) {
  const texture = useCanvasTexture(828, 207, (ctx, w, h) => drawBubble(ctx, msg, time, w, h), [msg, time]);
  const pivot = useRef<THREE.Group>(null);
  const pop = useRef(1);
  useEffect(() => {
    if (slot === 2 && !useWorld.getState().reducedMotion) pop.current = 0;
  }, [popKey, slot]);
  useFrame((_, dt) => {
    const g = pivot.current;
    if (!g) return;
    pop.current = Math.min(1, pop.current + dt * 3.2);
    const k = pop.current;
    const overshoot = k < 1 ? 1 + 0.12 * Math.sin(k * Math.PI) : 1;
    g.scale.setScalar(Math.max(0.0001, Math.min(1, k * 1.4)) * overshoot);
  });
  const { x, z, ys, w, h } = EZRA.bubbles;
  return (
    <group ref={pivot} position={[x, ys[slot], z]}>
      <mesh geometry={BUBBLE_GEO} material={BUBBLE_MAT} castShadow />
      <mesh position={[w / 2, 0, 0.082]}>
        <planeGeometry args={[w - 0.05, h - 0.05]} />
        <meshStandardMaterial map={texture} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.42} roughness={0.85} />
      </mesh>
    </group>
  );
}

function BotScreen() {
  const texture = useCanvasTexture(640, 246, drawBotScreen, []);
  const { x, z, w, h, y, ry } = EZRA.screen;
  return (
    <group position={[x, 0, z]} rotation={[0, ry, 0]}>
      <mesh geometry={SCREEN_GEO} material={SCREEN_MAT} castShadow />
      <mesh position={[0, y + h / 2 - 0.2, 0.055]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={texture} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.8} roughness={0.7} toneMapped={false} />
      </mesh>
    </group>
  );
}

function EzraBotIsland({ placement }: { placement: IslandPlacement }) {
  const project = projectById("ezra-bot");
  const [latest, setLatest] = useState(1);
  const [now, setNow] = useState(() => new Date());
  const window3 = useMemo(() => visibleWindow(latest), [latest]);
  const reply = useRef<number | null>(null);

  const push = useCallback(() => {
    playSfx("chat");
    setLatest((l) => l + 1);
    setNow(new Date());
  }, []);

  // One turn: a member's question pops in, then the bot answers it, so the newest bubble at rest is always the bot's.
  const advance = useCallback(() => {
    if (reply.current !== null) return;
    push();
    reply.current = window.setTimeout(() => {
      reply.current = null;
      push();
    }, REPLY_DELAY_MS);
  }, [push]);

  useEffect(
    () => () => {
      if (reply.current !== null) window.clearTimeout(reply.current);
    },
    [],
  );

  // Reply once whenever the tour or the player arrives at the island.
  useEffect(
    () =>
      useWorld.subscribe((s, prev) => {
        if (s.activeIsland === "ezra-bot" && prev.activeIsland !== "ezra-bot") advance();
      }),
    [advance],
  );

  return (
    <>
      <group position={islandFrame(placement)}>
        <Robot id="ezra-robot" />
        {window3.map((msgIndex, slot) => (
          <Bubble key={slot} slot={slot} msg={CHAT_SCRIPT[msgIndex]} time={messageTime(now, 2 - slot)} popKey={latest} />
        ))}
        <BotScreen />
      </group>
      <Interactable
        id="ezra-robot"
        island={placement.id}
        label="Ask Ezra Bot"
        position={worldTuple(placement, EZRA.robot.x, 1.9, EZRA.robot.z)}
        size={[2.4, 3.8, 1.4]}
        radius={3}
        onActivate={advance}
      />
      <InfoBoard placement={placement} at={EZRA.info} rotationY={EZRA.info.ry} title="Discord" lines={project.stats ?? []} />
      <Signpost id="ezra-link" placement={placement} at={EZRA.link} rotationY={EZRA.link.ry} label="Add to Discord" url={project.links.discord} />
    </>
  );
}

export const ezraBotIsland: StarIslandModule = {
  id: "ezra-bot",
  Component: EzraBotIsland,
  stamp: (grid: VoxelGrid, p: IslandPlacement) => stampCells(grid, p, FOOTPRINTS["ezra-bot"]),
  tourStop: tourStopFor,
};
