import { useMemo } from "react";
import * as THREE from "three";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import { runtime } from "@/world/state/runtime";
import { LiveScreen } from "@/world/scene/screens/LiveScreen";
import { mapApp } from "@/world/scene/screens/map";
import { startTravel } from "@/world/scene/travel";
import { MAP_BOARD, MAP_POST } from "../layouts";
import { islandFrame } from "./local";
import { PALETTE } from "./props";

// the post (layouts.ts MAP_POST) stands behind the face, clear of LiveScreen's bezel (0.14 deep behind it)
const POST_GEO = new THREE.BoxGeometry(MAP_POST.w, MAP_BOARD.y, MAP_POST.w);
const POST_MAT = new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.9 });

/**
 * A map board (spec §8): the live layout as a LiveScreen on one wooden post, a wooden bezel round it. Activating it
 * opens the closeup; an island tap, "Travel to …" or Enter calls startTravel. `at` is island-local (layouts.ts `map`).
 */
export function MapBoard({ placement, at }: { placement: IslandPlacement; at: { x: number; z: number; ry: number } }) {
  // LiveScreen keys its state on the app object: one per board, built once
  const app = useMemo(() => mapApp(runtime.layout, placement.id, startTravel), [placement.id]);
  return (
    <>
      <group position={islandFrame(placement)} userData={{ passable: true }}>
        <mesh
          geometry={POST_GEO}
          material={POST_MAT}
          position={[at.x - Math.sin(at.ry) * MAP_POST.back, MAP_BOARD.y / 2, at.z - Math.cos(at.ry) * MAP_POST.back]}
          rotation={[0, at.ry, 0]}
          castShadow
        />
      </group>
      <LiveScreen
        id={`map-${placement.id}`}
        placement={placement}
        app={app}
        label="Open the map"
        at={{ x: at.x, y: MAP_BOARD.y, z: at.z }}
        rotationY={at.ry}
        size={{ w: MAP_BOARD.w, h: MAP_BOARD.h }}
        bezelColor={PALETTE.wood}
      />
    </>
  );
}
