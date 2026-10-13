import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Crossing } from "@/world/engine/gen/layout";
import { solveLaunch } from "@/world/engine/traversal/ballistic";
import { DEFAULT_PARAMS } from "@/world/engine/physics/character";
import { playSfx } from "@/world/engine/audio/sfx";
import type { Vec3 } from "@/world/engine/types";
import { worldProjects } from "@/config/portfolio";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { Interactable } from "../Interactable";
import { scrollToIsland } from "../tour/scrollToIsland";
import { padPair } from "./geometry";

const frameMat = new THREE.MeshStandardMaterial({ color: "#3b3a38", roughness: 0.6, metalness: 0.4 });
const plateMat = new THREE.MeshStandardMaterial({ color: "#d8b04a", roughness: 0.55 });
const arrowMat = new THREE.MeshStandardMaterial({ color: "#f4f3ef", roughness: 0.7 });

const titleOf = (id: string) => worldProjects.find((p) => p.id === id)?.title ?? "Ezra Brilliant";

export function BouncePad({ crossing }: { crossing: Crossing }) {
  const from = runtime.islandById(crossing.from);
  const to = runtime.islandById(crossing.to);
  const pads = useMemo(() => padPair(crossing, from, to), [crossing, from, to]);
  const plates = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const st = useMemo(() => ({ armed: [true, true], squash: [0, 0] }), []);
  const ends: [Vec3, Vec3] = [pads.a, pads.b];

  const launch = (i: 0 | 1) => {
    const p = runtime.player;
    const start = ends[i];
    const target = ends[1 - i];
    const { vel, time } = solveLaunch(start, target, DEFAULT_PARAMS.gravity, 3);
    Object.assign(p.pos, start);
    runtime.ride = { kind: "arc", t: 0, from: { ...start }, to: { ...target }, vel, time };
    p.locked = true;
    st.armed[1 - i] = false; // don't relaunch on landing; re-arms once Ezra steps off
    st.squash[i] = 1;
    runtime.particles.burst({ x: start.x, y: start.y + 0.1, z: start.z }, "dust", { count: 10 });
    playSfx("bounce");
  };

  useFrame((_, dt) => {
    const p = runtime.player;
    const playing = useWorld.getState().mode === "play";
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
        const dest = i === 0 ? crossing.to : crossing.from;
        return (
          <Interactable
            key={i}
            id={`pad-${crossing.from}-${crossing.to}-${i}`}
            island={i === 0 ? crossing.from : crossing.to}
            label={`Bounce to ${titleOf(dest)}`}
            position={[e.x, e.y + 0.3, e.z]}
            size={[1.3, 0.6, 1.3]}
            radius={2}
            onActivate={() => {
              if (useWorld.getState().mode === "play") {
                if (!runtime.ride) launch(i);
              } else scrollToIsland(dest);
            }}
          >
            <group position={[e.x, e.y, e.z]} rotation={[0, yaw, 0]}>
              <mesh position={[0, 0.05, 0]} material={frameMat} receiveShadow>
                <boxGeometry args={[1.3, 0.1, 1.3]} />
              </mesh>
              {/* chevron arms meet on the far (+z) side: it points at the paired pad */}
              <group ref={plates[i]} position={[0, 0.1, 0]}>
                <mesh position={[0, 0.04, 0]} material={plateMat}>
                  <boxGeometry args={[1.05, 0.08, 1.05]} />
                </mesh>
                <mesh position={[0.14, 0.09, 0.1]} rotation={[0, -Math.PI / 4, 0]} material={arrowMat}>
                  <boxGeometry args={[0.1, 0.03, 0.42]} />
                </mesh>
                <mesh position={[-0.14, 0.09, 0.1]} rotation={[0, Math.PI / 4, 0]} material={arrowMat}>
                  <boxGeometry args={[0.1, 0.03, 0.42]} />
                </mesh>
              </group>
            </group>
          </Interactable>
        );
      })}
    </>
  );
}
