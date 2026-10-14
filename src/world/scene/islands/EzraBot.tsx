import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { playSfx } from "@/world/engine/audio/sfx";
import { Interactable } from "@/world/scene/Interactable";
import { useWorld } from "@/world/state/store";
import { EZRA } from "./layouts";
import { InfoBoard } from "./shared/InfoBoard";
import { MapBoard } from "./shared/MapBoard";
import { Signpost } from "./shared/Signpost";
import { PALETTE } from "./shared/props";
import { islandFrame, worldTuple } from "./shared/local";
import { projectById } from "./shared/project";
import { useCanvasTexture } from "./shared/useCanvasTexture";
import { useHoverLift } from "./shared/useHoverLift";
import { CHAT_SCRIPT, drawBotScreen, drawBubble, pushMessage, startLog, visibleWindow, type ChatMessage } from "./ezrabot/chat";

/** [width, height, depth, x, y, z, colour]: one box of a baked part, relative to the part's pivot. */
type Box = readonly [number, number, number, number, number, number, string];

const tint = new THREE.Color();

/** Gives every vertex of `g` one colour (for vertex-coloured merged parts). */
function paint(g: THREE.BufferGeometry, colour: string): THREE.BufferGeometry {
  tint.set(colour);
  const n = g.attributes.position.count;
  const rgb = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) rgb.set([tint.r, tint.g, tint.b], i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(rgb, 3));
  return g;
}

/** Merges pieces into one geometry (one draw call) and disposes the pieces. */
function merge(pieces: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(pieces);
  for (const g of pieces) g.dispose();
  if (!merged) throw new Error("EzraBot: could not merge part geometry");
  return merged;
}

/** Bakes static boxes into one vertex-coloured geometry, so each part costs one draw call. */
function bake(boxes: readonly Box[]): THREE.BufferGeometry {
  return merge(boxes.map(([w, h, d, x, y, z, colour]) => paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), colour)));
}

/** A non-indexed box (RoundedBoxGeometry is non-indexed, and merged pieces must match). */
function flatBox(w: number, h: number, d: number): THREE.BufferGeometry {
  const box = new THREE.BoxGeometry(w, h, d);
  const flat = box.toNonIndexed();
  box.dispose();
  return flat;
}

const BODY = "#cfd3cf";
const LIGHT = "#e3e6e2";
const SLATE = "#2a333c";

const ROBOT = {
  // legs, torso, chest panel, arms and the neck up to the head's pivot, relative to the robot's feet
  body: bake([
    [0.45, 0.62, 0.5, -0.35, 0.31, 0, BODY],
    [0.45, 0.62, 0.5, 0.35, 0.31, 0, BODY],
    [EZRA.robot.w, 1.2, EZRA.robot.d, 0, 1.22, 0, BODY],
    [0.62, 0.34, 0.06, 0, 1.34, 0.51, SLATE],
    [0.34, 1.0, 0.42, -0.95, 1.14, 0, LIGHT],
    [0.34, 1.0, 0.42, 0.95, 1.14, 0, LIGHT],
    [0.34, 0.58, 0.34, 0, 2.08, 0, SLATE],
  ]),
  // head, visor and antenna stalk, relative to the neck pivot
  head: bake([
    [1.32, 1.0, EZRA.robot.d, 0, 0.48, 0, LIGHT],
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

/**
 * Rounded bubble panel and its tail (pointing down-left at the robot), relative to the bubble's left edge, on a
 * slightly larger slate plate: the thin dark rim makes the white chat read as UI against the pale sky.
 */
const BUBBLE_GEO = (() => {
  const { w, h, d, rim: margin, tail } = EZRA.bubbles;
  const rim = "#5d6872";
  return merge([
    paint(new RoundedBoxGeometry(w, h, d, 2, 0.07).translate(w / 2, 0, 0), "#ffffff"),
    paint(new RoundedBoxGeometry(w + 2 * margin, h + 2 * margin, 0.1, 2, 0.09).translate(w / 2, 0, -0.04), rim),
    paint(flatBox(0.22, 0.22, 0.12).rotateZ(Math.PI / 4).translate(tail.x, tail.y, 0), "#ffffff"),
    paint(flatBox(tail.size, tail.size, 0.08).rotateZ(Math.PI / 4).translate(tail.x, tail.y, -0.04), rim),
  ]);
})();
const BUBBLE_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
/** Bubble canvas resolution: 230 px per world unit. */
const BUBBLE_PX = [Math.round(EZRA.bubbles.w * 230), Math.round(EZRA.bubbles.h * 230)] as const;

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
  const texture = useCanvasTexture(BUBBLE_PX[0], BUBBLE_PX[1], (ctx, w, h) => drawBubble(ctx, msg, time, w, h), [msg, time]);
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
        <meshStandardMaterial map={texture} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.55} roughness={0.85} />
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

export function EzraBotIsland({ placement }: { placement: IslandPlacement }) {
  const project = projectById("ezra-bot");
  const [log, setLog] = useState(() => startLog(new Date()));
  const window3 = useMemo(() => visibleWindow(log.latest, log.times.length), [log]);
  const reply = useRef<number | null>(null);

  const push = useCallback(() => {
    playSfx("chat");
    setLog((l) => pushMessage(l, new Date()));
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
      reply.current = null;
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
          <Bubble key={slot} slot={slot} msg={CHAT_SCRIPT[msgIndex]} time={log.times[slot]} popKey={log.latest} />
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
      <InfoBoard placement={placement} at={EZRA.info} rotationY={EZRA.info.ry} title={EZRA.info.title} lines={project.stats ?? []} />
      <Signpost id="ezra-link" placement={placement} at={EZRA.link} rotationY={EZRA.link.ry} label="Add to Discord" url={project.links.discord} />
      <MapBoard placement={placement} at={EZRA.map} />
    </>
  );
}
