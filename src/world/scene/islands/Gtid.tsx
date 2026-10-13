import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { VoxelGrid } from "@/world/engine/voxel/grid";
import { Interactable } from "@/world/scene/Interactable";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import type { StarIslandModule } from "./types";
import { FOOTPRINTS, GTID } from "./layouts";
import { tourStopFor } from "./framing";
import { VoxelTitle } from "./VoxelTitle";
import { InfoBoard } from "./shared/InfoBoard";
import { Signpost } from "./shared/Signpost";
import { PropBlocks } from "./shared/PropBlocks";
import { PALETTE, type PropBlock } from "./shared/props";
import { islandFrame, stampCells, worldOf, worldTuple } from "./shared/local";
import { projectById } from "./shared/project";
import { useCanvasTexture } from "./shared/useCanvasTexture";
import { useHoverLift } from "./shared/useHoverLift";
import { useGtidData } from "./gtid/useGtidData";
import { buildBoardModel, drawBoard, type BoardView } from "./gtid/board";
import type { GtidData } from "./gtid/types";

const LOCK_Y = GTID.chart.heights[GTID.lock.x - GTID.chart.x0] + 1.7;
const SPARKLE = { count: 2 } as const;

/** Stone price columns with light caps: the orange title stands right in front, so orange caps would blur its letters. */
function chartBlocks(): PropBlock[] {
  const { x0, z, heights } = GTID.chart;
  const out: PropBlock[] = [];
  heights.forEach((h, i) => {
    for (let y = 0; y < h; y++) {
      out.push({ x: x0 + i, y: y + 0.5, z, c: y === h - 1 ? PALETTE.white : PALETTE.chart[y % 2], sx: 0.88, sz: 0.88 });
    }
  });
  out.push({ x: GTID.lamps.x, y: 0.18, z: GTID.lamps.z, c: PALETTE.stone[0], sx: 1.7, sy: 0.36, sz: 0.7 });
  return out;
}

/** Our own Diamond Lock: faceted blue gem body + silver shackle, turning above the tallest chart column. */
function DiamondLock({ placement }: { placement: IslandPlacement }) {
  const ref = useRef<THREE.Group>(null);
  const next = useRef(0);
  const sparkleAt = useMemo(() => worldOf(placement, GTID.lock.x, LOCK_Y, GTID.lock.z), [placement]);
  const gem = useMemo(
    () =>
      new THREE.LatheGeometry(
        [new THREE.Vector2(0, -0.95), new THREE.Vector2(0.78, -0.05), new THREE.Vector2(0.86, 0.1), new THREE.Vector2(0.58, 0.42), new THREE.Vector2(0.001, 0.42)],
        8,
      ),
    [],
  );
  useEffect(() => () => gem.dispose(), [gem]);

  useFrame(({ clock }) => {
    const g = ref.current;
    const world = useWorld.getState();
    if (!g || world.reducedMotion) return;
    const t = clock.elapsedTime;
    g.rotation.y = t * 0.5;
    g.position.y = LOCK_Y + Math.sin(t * 1.2) * 0.12;
    if (t > next.current) {
      next.current = t + 0.9;
      // sparkles only while GTID is the island in view: they share the world's particle pool
      if (world.activeIsland === placement.id) runtime.particles.burst(sparkleAt, "sparkle", SPARKLE);
    }
  });

  return (
    <group ref={ref} position={[GTID.lock.x, LOCK_Y, GTID.lock.z]} scale={1.15}>
      <mesh geometry={gem} castShadow>
        <meshStandardMaterial color="#58a6e6" emissive="#1b5c9c" emissiveIntensity={0.55} roughness={0.18} metalness={0.1} flatShading />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <torusGeometry args={[0.42, 0.1, 10, 28, Math.PI]} />
        <meshStandardMaterial color="#d5d9de" roughness={0.3} metalness={0.9} />
      </mesh>
    </group>
  );
}

/** Three lamps: one lit per mod in-game (up to three), the same roster as the board's moderators card. */
function ModLamps({ lit }: { lit: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    if (useWorld.getState().reducedMotion) return;
    for (let i = 0; i < refs.current.length; i++) {
      refs.current[i]?.scale.setScalar(i < lit ? 1 + Math.sin(clock.elapsedTime * 2 + i) * 0.06 : 1);
    }
  });
  return (
    <>
      {[-0.55, 0, 0.55].map((dx, i) => (
        <mesh key={dx} ref={(m) => { refs.current[i] = m; }} position={[GTID.lamps.x + dx, 0.51, GTID.lamps.z]} castShadow>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial
            color={i < lit ? "#6cc47f" : "#4c5650"}
            emissive={i < lit ? "#4fbf6c" : "#000000"}
            emissiveIntensity={0.8}
            roughness={0.5}
          />
        </mesh>
      ))}
    </>
  );
}

function PriceBoard({ placement, data }: { placement: IslandPlacement; data: GtidData }) {
  const [view, setView] = useState<BoardView>("chart");
  const model = useMemo(() => buildBoardModel(data, view), [data, view]);
  const texture = useCanvasTexture(1024, 640, (ctx, w, h) => drawBoard(ctx, model, w, h), [model]);
  const lift = useHoverLift("gtid-board");
  const { x, z, w, h, y, ry } = GTID.board;
  const centreY = y + h / 2 - 0.4;
  // the registry's hitbox is axis-aligned: cover the rotated board's footprint (as Signpost does)
  const hitW = Math.abs(Math.cos(ry)) * w + Math.abs(Math.sin(ry)) * 0.8;
  const hitD = Math.abs(Math.sin(ry)) * w + Math.abs(Math.cos(ry)) * 0.8;
  // Interactable already plays the click sound on activate
  const toggle = () => setView((v) => (v === "chart" ? "mods" : "chart"));
  return (
    <>
      <group position={islandFrame(placement)}>
        <group position={[x, 0, z]} rotation={[0, ry, 0]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (w / 2 - 0.3), y / 2, -0.08]} castShadow>
              <boxGeometry args={[0.16, y, 0.16]} />
              <meshStandardMaterial color={PALETTE.wood} roughness={0.9} />
            </mesh>
          ))}
          <group ref={lift}>
            <mesh position={[0, centreY, 0]} castShadow>
              <boxGeometry args={[w + 0.16, h + 0.16, 0.12]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
            </mesh>
            <mesh position={[0, centreY, 0.065]}>
              <planeGeometry args={[w, h]} />
              <meshStandardMaterial map={texture} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.85} roughness={0.7} toneMapped={false} />
            </mesh>
          </group>
        </group>
      </group>
      <Interactable
        id="gtid-board"
        island={placement.id}
        label={view === "chart" ? "Show moderators" : "Show price chart"}
        position={worldTuple(placement, x, centreY, z)}
        size={[hitW, h, hitD]}
        radius={3}
        onActivate={toggle}
      />
    </>
  );
}

function GtidIsland({ placement }: { placement: IslandPlacement }) {
  const data = useGtidData();
  const blocks = useMemo(chartBlocks, []);
  const project = projectById("gtid");
  const inGame = data.mods.online.length; // gtid.pro counts every listed mod as in-game, idle ones too
  return (
    <>
      <group position={islandFrame(placement)}>
        <PropBlocks blocks={blocks} seed={202} />
        <ModLamps lit={Math.min(3, inGame)} />
        <DiamondLock placement={placement} />
      </group>
      <PriceBoard placement={placement} data={data} />
      <VoxelTitle id="gtid-title" placement={placement} at={GTID.title} lines={GTID.title.lines} cell={GTID.title.cell} color={PALETTE.orange} />
      <InfoBoard placement={placement} at={GTID.info} rotationY={GTID.info.ry} title="gtid.pro" lines={project.stats ?? []} />
      <Signpost id="gtid-link" placement={placement} at={GTID.link} rotationY={GTID.link.ry} label="Visit gtid.pro" url={project.links.demo} />
    </>
  );
}

export const gtidIsland: StarIslandModule = {
  id: "gtid",
  Component: GtidIsland,
  stamp: (grid: VoxelGrid, p: IslandPlacement) => stampCells(grid, p, FOOTPRINTS.gtid),
  tourStop: tourStopFor,
};
