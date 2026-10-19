import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Crossing } from "@/world/engine/gen/layout";
import { solveLaunch } from "@/world/engine/traversal/ballistic";
import { DEFAULT_PARAMS } from "@/world/engine/physics/character";
import { playSfx } from "@/world/engine/audio/sfx";
import type { Vec3 } from "@/world/engine/types";
import type { Ride } from "@/world/state/runtime";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { Interactable } from "../Interactable";
import { islandTitle } from "../islands/shared/project";
import { scrollToIsland } from "../tour/scrollToIsland";
import { PAD_SIZE, padPair } from "./geometry";
import { mergeParts } from "./materials";

const frameMat = new THREE.MeshStandardMaterial({ color: "#3b3a38", roughness: 0.6, metalness: 0.4 });
const frameGeo = new THREE.BoxGeometry(PAD_SIZE, 0.1, PAD_SIZE);
// yellow plate + white chevron in one draw; the chevron's arms meet on the far (+z) side: it points at the paired pad.
// Its own material (not the wood paintMat): the plate is a smoother painted metal (roughness 0.6, not 0.9).
const plateMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.6, vertexColors: true });
const plateGeo = mergeParts([
  { geo: new THREE.BoxGeometry(1.05, 0.08, 1.05), color: "#d8b04a", position: [0, 0.04, 0] },
  { geo: new THREE.BoxGeometry(0.1, 0.03, 0.42), color: "#f4f3ef", position: [0.14, 0.09, 0.1], rotation: [0, -Math.PI / 4, 0] },
  { geo: new THREE.BoxGeometry(0.1, 0.03, 0.42), color: "#f4f3ef", position: [-0.14, 0.09, 0.1], rotation: [0, Math.PI / 4, 0] },
]);

export function BouncePad({ crossing }: { crossing: Crossing }) {
  const from = runtime.islandById(crossing.from);
  const to = runtime.islandById(crossing.to);
  const pads = useMemo(() => padPair(crossing, from, to), [crossing, from, to]);
  const plates = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const st = useMemo(() => ({ armed: [true, true], squash: [0, 0], flight: null as Ride | null, landsOn: 0 as 0 | 1 }), []);
  const ends: [Vec3, Vec3] = [pads.a, pads.b];

  const launch = (i: 0 | 1) => {
    const p = runtime.player;
    const start = ends[i];
    const target = ends[1 - i];
    const { vel, time } = solveLaunch(start, target, DEFAULT_PARAMS.gravity, 3);
    Object.assign(p.pos, start);
    const ride: Ride = { kind: "arc", t: 0, from: { ...start }, to: { ...target }, vel, time };
    runtime.ride = ride;
    st.flight = ride;
    st.landsOn = (1 - i) as 0 | 1;
    p.locked = true;
    st.armed[1 - i] = false; // don't relaunch on landing; re-arms once Ezra steps off
    st.squash[i] = 1;
    runtime.particles.burst({ x: start.x, y: start.y + 0.1, z: start.z }, "dust", { count: 10 });
    playSfx("boing");
  };

  useFrame((_, dt) => {
    const p = runtime.player;
    const playing = useWorld.getState().mode === "play";
    if (st.flight && runtime.ride !== st.flight) {
      // the arc just ended: squash the pad Ezra landed on (PlayerController puffs the landing dust)
      const e = ends[st.landsOn];
      if (Math.abs(p.pos.x - e.x) < 0.65 && Math.abs(p.pos.z - e.z) < 0.65) st.squash[st.landsOn] = 1;
      st.flight = null;
    }
    for (let k = 0; k < 2; k++) {
      const i = k as 0 | 1;
      const e = ends[i];
      const onPad = Math.abs(p.pos.x - e.x) < 0.65 && Math.abs(p.pos.z - e.z) < 0.65 && Math.abs(p.pos.y - e.y) < 0.3;
      if (!onPad && !runtime.ride) st.armed[i] = true;
      if (playing && onPad && st.armed[i] && p.onGround && !runtime.ride && !p.locked) launch(i);
      st.squash[i] = Math.max(0, st.squash[i] - dt * 4);
      const g = plates[i].current;
      if (g) g.scale.y = 1 - 0.5 * Math.sin(Math.PI * st.squash[i]);
    }
  });

  return (
    <>
      {([0, 1] as const).map((i) => {
        const e = ends[i];
        const o = ends[1 - i];
        const yaw = Math.atan2(o.x - e.x, o.z - e.z);
        const extent = PAD_SIZE * (Math.abs(Math.cos(yaw)) + Math.abs(Math.sin(yaw))); // the turned pad's axis-aligned box
        const dest = i === 0 ? crossing.to : crossing.from;
        return (
          <Interactable
            key={i}
            id={`pad-${crossing.from}-${crossing.to}-${i}`}
            island={i === 0 ? crossing.from : crossing.to}
            label={`Bounce to ${islandTitle(dest)}`}
            position={[e.x, e.y + 0.3, e.z]}
            size={[extent, 0.6, extent]}
            radius={2}
            onActivate={() => {
              if (useWorld.getState().mode === "play") {
                if (!runtime.ride) launch(i);
              } else scrollToIsland(dest);
            }}
          >
            <group position={[e.x, e.y, e.z]} rotation={[0, yaw, 0]}>
              <mesh position={[0, 0.05, 0]} geometry={frameGeo} material={frameMat} receiveShadow />
              <group ref={plates[i]} position={[0, 0.1, 0]}>
                <mesh geometry={plateGeo} material={plateMat} />
              </group>
            </group>
          </Interactable>
        );
      })}
    </>
  );
}
