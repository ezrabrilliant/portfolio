import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { VIEW_F, VIEW_R } from "./islands/types";

// Warm late-afternoon sun, back-left of the tour view and ~32° above the horizon, so shadows run long
// toward the front-right. Only its direction matters; the distance just keeps the shadow camera clear.
const SUN_DIR = new THREE.Vector3(-VIEW_R.x * 14 - VIEW_F.x * 6, 9.5, -VIEW_R.z * 14 - VIEW_F.z * 6).normalize();
const SUN_DISTANCE = 40;
const FOLLOW_RATE = 5;                       // 1/s; ≈ the old 0.08-per-frame lerp at 60 fps

// The shadow box: ±SHADOW_EXTENT around the followed point, perpendicular to the sun. On the ground it
// stretches to ±SHADOW_EXTENT / sin(32°) ≈ ±38 blocks along the sun, enough for the longer shadows.
const SHADOW_EXTENT = 20;
const SHADOW_MAP = 2048;
const TEXEL = (2 * SHADOW_EXTENT) / SHADOW_MAP;
// Shadow camera axes (Object3D.lookAt with up = +Y): z points from the target to the sun.
const AXIS_Z = SUN_DIR;
const AXIS_X = new THREE.Vector3(0, 1, 0).cross(AXIS_Z).normalize();
const AXIS_Y = AXIS_Z.clone().cross(AXIS_X);

export function Lights() {
  const quality = useWorld((s) => s.quality);
  const sun = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const scratch = useMemo(
    () => ({ focus: new THREE.Vector3(), follow: new THREE.Vector3(), island: new THREE.Vector3(), islandId: "", started: false }),
    [],
  );
  useFrame((_, delta) => {
    const s = useWorld.getState();
    const { focus, follow, island } = scratch;
    if (s.mode === "play") {
      focus.set(runtime.player.pos.x, runtime.player.pos.y, runtime.player.pos.z);
    } else {
      if (s.activeIsland !== scratch.islandId) {
        // the island's walkable top centre (as islandTop), looked up only when the active island changes
        const o = runtime.islandById(s.activeIsland).origin;
        island.set(o.x + 0.5, o.y + 1, o.z + 0.5);
        scratch.islandId = s.activeIsland;
      }
      focus.copy(island);
    }
    if (scratch.started) follow.lerp(focus, 1 - Math.exp(-FOLLOW_RATE * delta));
    else {
      follow.copy(focus);
      scratch.started = true;
    }
    // snap the shadow camera to whole shadow-map texels across the sun so shadow edges don't shimmer
    const sx = Math.round(follow.dot(AXIS_X) / TEXEL) * TEXEL;
    const sy = Math.round(follow.dot(AXIS_Y) / TEXEL) * TEXEL;
    const sz = follow.dot(AXIS_Z);
    target.position.set(
      AXIS_X.x * sx + AXIS_Y.x * sy + AXIS_Z.x * sz,
      AXIS_X.y * sx + AXIS_Y.y * sy + AXIS_Z.y * sz,
      AXIS_X.z * sx + AXIS_Y.z * sy + AXIS_Z.z * sz,
    );
    sun.current?.position.copy(target.position).addScaledVector(SUN_DIR, SUN_DISTANCE);
  });
  const hi = quality === "high";
  return (
    <>
      <hemisphereLight args={["#dce7ef", "#a08c6d", 1.2]} />
      <primitive object={target} />
      <directionalLight
        ref={sun}
        target={target}
        color="#ffd3a1"
        intensity={3}
        castShadow={hi}
        shadow-mapSize={[SHADOW_MAP, SHADOW_MAP]}
        shadow-camera-left={-SHADOW_EXTENT}
        shadow-camera-right={SHADOW_EXTENT}
        shadow-camera-top={SHADOW_EXTENT}
        shadow-camera-bottom={-SHADOW_EXTENT}
        shadow-camera-near={1}
        shadow-camera-far={SUN_DISTANCE + 50}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
    </>
  );
}
