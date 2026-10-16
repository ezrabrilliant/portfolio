import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { bakeBoxes } from "@/world/scene/shared/bake";
import { paintMat } from "@/world/scene/crossings/materials";
import { islandTop } from "@/world/scene/islands/types";
import { ORBIT, MONOSUKO } from "@/world/scene/islands/layouts";
import { islandFrame } from "@/world/scene/islands/shared/local";
import { birdOffset, butterflyAt, chickenAt, createBird, stepBird, wingFlap, type Bird } from "./motion";

/** Drawn sizes: small enough to be critters, big enough to read from the tour. */
const SIZE = { bird: 1.3, chicken: 1.4, cat: 1.5 } as const;
/** Islands with butterflies, and how many over each. */
const BUTTERFLY_ISLANDS: Record<string, number> = { hero: 3, "petak-umpet": 3, "web-plaza": 2, gtid: 2, pedulipasal: 2 };
const WING_COLORS = ["#f6f1e3", "#f2c14e", "#f08a4b", "#9cc7ef"];
/** A wing: a thin plate whose root sits on the body's centre line. */
const WING_GEO = new THREE.BoxGeometry(0.14, 0.012, 0.11).translate(0.07, 0, 0);
const WING_MAT = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.8, side: THREE.DoubleSide });

/** A small blocky bird, beak to +z, feet at 0. */
const BIRD_GEO = bakeBoxes(
  [
    [0.16, 0.14, 0.24, 0, 0.12, 0, "#5d6f86"],
    [0.13, 0.12, 0.12, 0, 0.23, 0.1, "#5d6f86"],
    [0.05, 0.04, 0.07, 0, 0.22, 0.19, "#e0a53c"],
    [0.1, 0.03, 0.12, 0, 0.14, -0.17, "#4b5a6e"],
    [0.13, 0.04, 0.1, 0, 0.15, 0.02, "#e9e4d8"],
  ],
  "a bird",
);
const BIRD_WING_GEO = new THREE.BoxGeometry(0.16, 0.025, 0.14).translate(0.08, 0, 0);
const BIRD_WING_MAT = new THREE.MeshStandardMaterial({ color: "#4b5a6e", roughness: 0.9 });

/** The chicken: body and legs (the head pecks on its own). */
const CHICKEN_BODY = bakeBoxes(
  [
    [0.26, 0.22, 0.32, 0, 0.24, 0, "#f6f3ea"],
    [0.18, 0.16, 0.08, 0, 0.3, -0.18, "#ece6d8"],
    [0.04, 0.12, 0.04, 0.06, 0.06, 0, "#e0a53c"],
    [0.04, 0.12, 0.04, -0.06, 0.06, 0, "#e0a53c"],
  ],
  "a chicken",
);
const CHICKEN_HEAD = bakeBoxes(
  [
    [0.13, 0.14, 0.13, 0, 0.07, 0.04, "#f6f3ea"],
    [0.04, 0.07, 0.09, 0, 0.17, 0.04, "#d8473b"],
    [0.05, 0.04, 0.06, 0, 0.06, 0.13, "#e0a53c"],
    [0.03, 0.05, 0.03, 0, 0.0, 0.09, "#d8473b"],
  ],
  "a chicken's head",
);

/** The cat curled up asleep: body, head, ears (the tail swishes on its own). */
const CAT_BODY = bakeBoxes(
  [
    [0.34, 0.16, 0.22, 0, 0.08, 0, "#e19a52"],
    [0.18, 0.15, 0.17, 0.2, 0.09, 0.03, "#e19a52"],
    [0.05, 0.06, 0.04, 0.25, 0.19, 0.08, "#c47c3a"],
    [0.05, 0.06, 0.04, 0.25, 0.19, -0.02, "#c47c3a"],
    [0.12, 0.03, 0.2, -0.05, 0.165, 0, "#c47c3a"],
  ],
  "a cat",
);
const CAT_TAIL = bakeBoxes([[0.26, 0.05, 0.05, -0.13, 0.03, 0, "#c47c3a"]], "a cat's tail");

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const one = new THREE.Vector3(1, 1, 1);
const scale = new THREE.Vector3();
/** Half a turn about the body's axis: the right wing's plate becomes the left one. */
const FLIP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);

function Butterflies() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const flies = useMemo(() => {
    const out: { anchor: THREE.Vector3; phase: number; color: string }[] = [];
    for (const p of runtime.layout.islands) {
      const n = BUTTERFLY_ISLANDS[p.id] ?? 0;
      const top = islandTop(p);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + p.seed;
        out.push({ anchor: new THREE.Vector3(top.x + Math.cos(a) * 1.8, top.y, top.z + Math.sin(a) * 1.8), phase: a * 1.7, color: WING_COLORS[(i + p.seed) % WING_COLORS.length] });
      }
    }
    return out;
  }, []);
  const pos = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);
  const ahead = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const reduced = useWorld.getState().reducedMotion;
    mesh.visible = !reduced;
    if (reduced) return;
    const t = clock.elapsedTime;
    flies.forEach((f, i) => {
      butterflyAt(f.anchor, f.phase, t, pos);
      butterflyAt(f.anchor, f.phase, t + 0.05, ahead);
      const yaw = Math.atan2(ahead.x - pos.x, ahead.z - pos.z);
      const flap = wingFlap(t, f.phase);
      for (let k = 0; k < 2; k++) {
        const side = k === 0 ? 1 : -1;
        q.setFromEuler(e.set(0, yaw, side * flap, "YXZ"));
        // the left wing is the right one turned half round about the body's axis
        if (side < 0) q.multiply(FLIP);
        m4.compose(v.set(pos.x, pos.y, pos.z), q, one);
        mesh.setMatrixAt(i * 2 + k, m4);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  const colored = useRef(false);
  return (
    <instancedMesh
      ref={(m) => {
        ref.current = m;
        if (!m || colored.current) return;
        colored.current = true;
        const c = new THREE.Color();
        flies.forEach((f, i) => {
          m.setColorAt(i * 2, c.set(f.color));
          m.setColorAt(i * 2 + 1, c);
        });
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }}
      args={[WING_GEO, WING_MAT, flies.length * 2]}
      frustumCulled={false}
    />
  );
}

function Birds() {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const wings = useRef<THREE.InstancedMesh>(null);
  // one bird on a post cap at each bridge's first end, facing along the bridge; it flies off away from the island
  const birds = useMemo(() => {
    return runtime.layout.crossings
      .filter((c) => c.kind === "bridge")
      .map((c) => {
        const len = Math.hypot(c.b.x - c.a.x, c.b.z - c.a.z) || 1;
        const ux = (c.b.x - c.a.x) / len, uz = (c.b.z - c.a.z) / len;
        const perch = new THREE.Vector3(c.a.x - uz * 1.05, c.a.y + 1.64, c.a.z + ux * 1.05);
        return { perch, yaw: Math.atan2(ux, uz), dir: { x: ux * 0.6 - uz * 0.8, z: uz * 0.6 + ux * 0.8 }, state: createBird() as Bird };
      });
  }, []);
  const off = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);
  useFrame(({ clock }, dt) => {
    const b = bodies.current, w = wings.current;
    if (!b || !w) return;
    const t = clock.elapsedTime;
    const play = useWorld.getState().mode === "play";
    const reduced = useWorld.getState().reducedMotion;
    const p = runtime.player.pos;
    birds.forEach((bird, i) => {
      const d = play ? Math.hypot(p.x - bird.perch.x, p.z - bird.perch.z) + Math.max(0, bird.perch.y - p.y - 2) : 99;
      if (!reduced) stepBird(bird.state, d, Math.min(dt, 0.1));
      const shown = birdOffset(bird.state, bird.dir, off);
      const flying = bird.state.mode !== "perch";
      // flying off it faces away; coming back it faces its post; perched it looks about
      const yaw = flying ? Math.atan2(bird.dir.x, bird.dir.z) + (bird.state.mode === "back" ? Math.PI : 0) : bird.yaw + 0.4 * Math.sin(t * 0.7 + i);
      // perched: a little hop of the head now and then (the whole bird bobs); flying: wings beat
      const bob = flying ? 0 : 0.015 * Math.max(0, Math.sin(t * 3 + i * 2)) ** 8;
      const s = shown ? 1 : 0;
      v.set(bird.perch.x + off.x, bird.perch.y + off.y + bob, bird.perch.z + off.z);
      q.setFromEuler(e.set(0, yaw, 0, "YXZ"));
      b.setMatrixAt(i, m4.compose(v, q, scale.setScalar(s * SIZE.bird)));
      const beat = flying ? 0.9 * Math.sin(t * 22 + i) : -0.15;
      for (let k = 0; k < 2; k++) {
        const side = k === 0 ? 1 : -1;
        q.setFromEuler(e.set(0, yaw + (side < 0 ? Math.PI : 0), side * beat, "YXZ"));
        m4.compose(v.set(bird.perch.x + off.x, bird.perch.y + off.y + bob + 0.15 * SIZE.bird, bird.perch.z + off.z), q, scale.setScalar(s * SIZE.bird));
        w.setMatrixAt(i * 2 + k, m4);
      }
    });
    b.instanceMatrix.needsUpdate = true;
    w.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={bodies} args={[BIRD_GEO, paintMat, birds.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={wings} args={[BIRD_WING_GEO, BIRD_WING_MAT, birds.length * 2]} frustumCulled={false} />
    </>
  );
}

/** The chicken pecks round a spot by the POS stall's table. */
function Chicken() {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Mesh>(null);
  const spot = useMemo(() => {
    const p = runtime.islandById("pos-monosuko");
    const [fx, fy, fz] = islandFrame(p);
    return new THREE.Vector3(fx + MONOSUKO.table.x + 1.0, fy, fz + MONOSUKO.table.z - 0.9);
  }, []);
  useFrame(({ clock }) => {
    if (!root.current || !head.current) return;
    const reduced = useWorld.getState().reducedMotion;
    const t = reduced ? 0 : clock.elapsedTime;
    const c = chickenAt(t, 0.45);
    root.current.position.set(spot.x + c.x, spot.y, spot.z + c.z);
    root.current.rotation.y = c.heading;
    // pecking dips the head down quickly; walking nods it
    head.current.rotation.x = c.pecking ? 0.9 * Math.max(0, Math.sin(t * 9)) : 0.15 * Math.sin(t * 8);
  });
  return (
    <group ref={root} scale={SIZE.chicken}>
      <mesh geometry={CHICKEN_BODY} material={paintMat} castShadow />
      <mesh ref={head} geometry={CHICKEN_HEAD} material={paintMat} position={[0, 0.3, 0.13]} />
    </group>
  );
}

/** The cat asleep on top of Orbit's crate stack: breathing, its tail swishing now and then. */
function Cat() {
  const body = useRef<THREE.Mesh>(null);
  const tail = useRef<THREE.Mesh>(null);
  const spot = useMemo(() => {
    const p = runtime.islandById("orbit-store");
    const [fx, fy, fz] = islandFrame(p);
    const top = ORBIT.crates.find((c) => c.stack > 0) ?? ORBIT.crates[0];
    return { pos: new THREE.Vector3(fx + top.x, fy + top.stack + top.s, fz + top.z), ry: top.ry };
  }, []);
  useFrame(({ clock }) => {
    if (!body.current || !tail.current) return;
    const reduced = useWorld.getState().reducedMotion;
    const t = clock.elapsedTime;
    body.current.scale.y = reduced ? 1 : 1 + 0.05 * Math.sin(t * 1.4);
    tail.current.rotation.y = reduced ? 0.3 : 0.3 + 0.5 * Math.sin(t * 2.2) * Math.max(0, Math.sin(t * 0.4)) ** 4;
  });
  return (
    <group position={spot.pos} rotation={[0, spot.ry, 0]} scale={SIZE.cat}>
      <mesh ref={body} geometry={CAT_BODY} material={paintMat} castShadow />
      <mesh ref={tail} geometry={CAT_TAIL} material={paintMat} position={[-0.17, 0.02, 0]} />
    </group>
  );
}

export function Critters() {
  return (
    <>
      <Butterflies />
      <Birds />
      <Chicken />
      <Cat />
    </>
  );
}

