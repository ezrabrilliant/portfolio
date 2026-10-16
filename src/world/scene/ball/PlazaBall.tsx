import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { playSfx } from "@/world/engine/audio/sfx";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { bakeBoxes } from "@/world/scene/shared/bake";
import { paintMat } from "@/world/scene/crossings/materials";
import { worldOf } from "@/world/scene/islands/shared/local";
import { createBall, kickBall, stepBall } from "./ball";

/** Where the ball waits on the plaza (island-local), and comes back to after a fall. */
const HOME = { x: 1.6, z: 1.6 };

/** A blocky ball: a cube with its edges cut back, white with two orange bands, half a block across. */
const BALL_GEO = bakeBoxes(
  [
    [0.5, 0.36, 0.36, 0, 0, 0, "#f4f1e8"],
    [0.36, 0.5, 0.36, 0, 0, 0, "#f4f1e8"],
    [0.36, 0.36, 0.5, 0, 0, 0, "#f4f1e8"],
    [0.52, 0.1, 0.38, 0, 0, 0, "#f08a4b"],
    [0.38, 0.1, 0.52, 0, 0, 0, "#f08a4b"],
  ],
  "the plaza ball",
);

/** The plaza ball (ball.ts): kick it by running into it; it pops back home if it rolls off an island. */
export function PlazaBall() {
  const ref = useRef<THREE.Mesh>(null);
  const home = useMemo(() => {
    const p = runtime.islandById("web-plaza");
    return worldOf(p, HOME.x, 0.25, HOME.z);
  }, []);
  const ball = useMemo(() => createBall(home), [home]);
  const st = useMemo(() => ({ axis: new THREE.Vector3(1, 0, 0), q: new THREE.Quaternion(), lastKick: 0 }), []);
  useFrame(({ clock }, dt) => {
    const mesh = ref.current;
    const built = runtime.built;
    if (!mesh || !built) return;
    const t = clock.elapsedTime;
    const p = runtime.player;
    if (useWorld.getState().mode === "play" && !runtime.travel && t - st.lastKick > 0.25 && kickBall(ball, p.pos, p.vel)) {
      st.lastKick = t;
      playSfx("bounce");
      runtime.particles.burst({ x: ball.pos.x, y: ball.pos.y - 0.2, z: ball.pos.z }, "grass", { count: 4 });
    }
    const before = { x: ball.pos.x, z: ball.pos.z };
    if (stepBall(ball, { isSolid: built.grid.isSolid, props: built.props, ramps: built.ramps, killY: runtime.killY }, dt) === "fell") {
      Object.assign(ball, createBall(home));
      runtime.particles.burst({ x: home.x, y: home.y + 0.3, z: home.z }, "dust", { count: 10 });
      playSfx("poof");
    }
    // roll: turn about the axis across its travel by the distance it went
    const mx = ball.pos.x - before.x, mz = ball.pos.z - before.z;
    const d = Math.hypot(mx, mz);
    if (d > 1e-5) {
      st.axis.set(mz / d, 0, -mx / d);
      st.q.setFromAxisAngle(st.axis, d / 0.25);
      mesh.quaternion.premultiply(st.q);
    }
    mesh.position.set(ball.pos.x, ball.pos.y, ball.pos.z);
  });
  return <mesh ref={ref} geometry={BALL_GEO} material={paintMat} castShadow />;
}
