import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { VIEW_F, VIEW_R, islandTop } from "./islands/types";

// sun sits back-left of the view and high, like the sketch: warm, low-ish, soft shadows
const SUN_OFFSET = { x: -VIEW_R.x * 14 - VIEW_F.x * 6, y: 21, z: -VIEW_R.z * 14 - VIEW_F.z * 6 };

export function Lights() {
  const quality = useWorld((s) => s.quality);
  const sun = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const focus = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const s = useWorld.getState();
    if (s.mode === "play") focus.set(runtime.player.pos.x, runtime.player.pos.y, runtime.player.pos.z);
    else {
      const top = islandTop(runtime.islandById(s.activeIsland));
      focus.set(top.x, top.y, top.z);
    }
    target.position.lerp(focus, 0.08);
    sun.current?.position.set(target.position.x + SUN_OFFSET.x, target.position.y + SUN_OFFSET.y, target.position.z + SUN_OFFSET.z);
  });
  const hi = quality === "high";
  return (
    <>
      <hemisphereLight args={["#e2ebf0", "#a08c6d", 1.25]} />
      <primitive object={target} />
      <directionalLight
        ref={sun}
        target={target}
        color="#ffe1bb"
        intensity={2.5}
        castShadow={hi}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
    </>
  );
}
